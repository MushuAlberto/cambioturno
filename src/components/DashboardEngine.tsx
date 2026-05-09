import React, { useEffect, useState, useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LabelList
} from 'recharts';
import { LayoutDashboard, Filter, RefreshCcw, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NOVANDINO_PRODUCTS = ['BISCHOFITA', 'LSI (S)', 'SAL 27/15', 'SLIT'];
const SQM_NY_PRODUCTS = [
  'MOP 70', 'MOP TALCO', 'MOP TALCO MAXIS', 'MOP-G', 'MOP-G (Rojo)', 
  'MOP-G 59', 'MOP-G O', 'MOP-G PLUS', 'MOP-G R 59', 'MOP-GR PLUS', 
  'MOP-H-AL', 'MOP-H-BL', 'MOP-S', 'MOP-S 59', 'MOP-S PLUS', 'NACL', 
  'SILVINITA', 'SOP-G', 'SOP-H', 'SOP-O', 'SOP-S Talco', 'MOP 50', 'SOP FINO'
];

export const DashboardEngine: React.FC = () => {
  const [lastReport, setLastReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const fetchLatestReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: sbError } = await supabase
        .from('shift_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sbError) throw sbError;
      setLastReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseTime = (val: any) => {
    if (val === 'S/D') return 0; // Convertir S/D a 0 horas
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val * 24; 
    if (typeof val === 'string' && val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      return h + (m / 60);
    }
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const formatToTime = (decimal: number) => {
    if (decimal === null || isNaN(decimal) || decimal === 0) return "0:00";
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const processData = (products: string[]) => {
    if (!lastReport?.excel_data || !Array.isArray(lastReport.excel_data)) return [];

    const filtered = lastReport.excel_data.filter((row: any) => {
      const prodName = String(row['AF'] || '').trim();
      if (!prodName || prodName === 'Producto') return false;

      const isCorrectProduct = products.some(p => p.toLowerCase() === prodName.toLowerCase());
      if (!isCorrectProduct) return false;

      if (startDate || endDate) {
        const rawDate = row['B'];
        let rowDate: Date;
        if (typeof rawDate === 'number') {
          rowDate = new Date((rawDate - 25569) * 86400 * 1000);
        } else {
          rowDate = new Date(rawDate);
        }

        if (isNaN(rowDate.getTime())) return true; // Si no hay fecha, lo dejamos pasar para no ser tan estrictos

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
      }
      return true;
    });

    const grouped: Record<string, any> = {};
    filtered.forEach((row: any) => {
      const name = String(row['AF'] || '').trim().toUpperCase();
      if (!grouped[name]) {
        grouped[name] = { 
          name, 
          progTon: 0, 
          realTon: 0, 
          metaHrsTotal: 0, 
          metaCount: 0,
          realHrsTotal: 0,
          realCount: 0
        };
      }
      
      grouped[name].progTon += parseFloat(row['AH']) || 0;
      grouped[name].realTon += parseFloat(row['AI']) || 0;
      
      const mHrs = parseTime(row['AX']);
      if (mHrs !== null) {
        grouped[name].metaHrsTotal += mHrs;
        grouped[name].metaCount += 1;
      }
      
      const rHrs = parseTime(row['AY']);
      if (rHrs !== null) {
        grouped[name].realHrsTotal += rHrs;
        grouped[name].realCount += 1;
      }
    });

    // Solo devolver productos que aparecieron en el filtro
    return Object.values(grouped).map((g: any) => {
      const avgMeta = g.metaCount > 0 ? g.metaHrsTotal / g.metaCount : 0;
      const avgReal = g.realCount > 0 ? g.realHrsTotal / g.realCount : 0;
      
      return {
        name: g.name,
        progTon: Math.round(g.progTon),
        realTon: Math.round(g.realTon),
        metaVal: avgMeta,
        realVal: avgReal,
        metaHrsLabel: formatToTime(avgMeta),
        realHrsLabel: formatToTime(avgReal)
      };
    });
  };

  const novandinoData = useMemo(() => processData(NOVANDINO_PRODUCTS), [lastReport, startDate, endDate]);
  const sqmData = useMemo(() => processData(SQM_NY_PRODUCTS), [lastReport, startDate, endDate]);

  const ProductChart = ({ title, data }: { title: string, data: any[] }) => {
    if (data.length === 0) return null; // No mostrar gráfico si no hay productos

    return (
      <div className="glass-card" style={{ marginBottom: '2.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Package color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '1px' }}>{title}</h3>
        </div>
        
        <div style={{ height: '400px', width: '100%' }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
              
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                formatter={(value: any, name: string) => {
                  if (name.includes('Hrs')) return formatToTime(value);
                  return value;
                }}
              />
              <Legend verticalAlign="top" align="right" height={36} />
              
              <Bar yAxisId="left" dataKey="progTon" name="Prog. Ton" fill="#4c1d95" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="progTon" position="top" fill="#94a3b8" fontSize={10} />
              </Bar>
              <Bar yAxisId="left" dataKey="realTon" name="Real Ton" fill="#10b981" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="realTon" position="top" fill="#10b981" fontSize={10} />
              </Bar>

              <Line yAxisId="right" type="monotone" dataKey="metaVal" name="Meta Hrs" stroke="#ffffff" strokeWidth={3} dot={{ r: 4 }}>
                <LabelList dataKey="metaHrsLabel" position="top" fill="#ffffff" fontSize={10} offset={10} />
              </Line>
              <Line yAxisId="right" type="monotone" dataKey="realVal" name="Real Hrs" stroke="#d97706" strokeWidth={3} dot={{ r: 4 }}>
                <LabelList dataKey="realHrsLabel" position="top" fill="#d97706" fontSize={10} offset={20} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><RefreshCcw className="animate-spin" /></div>;

  return (
    <div className="animate-in">
      {/* Filtros */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Filter size={18} color="var(--accent)" />
          <span style={{ fontWeight: '600' }}>Filtros de Fecha:</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ opacity: 0.5 }}>al</span>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <ProductChart title="PRODUCTOS NOVANDINO" data={novandinoData} />
      <ProductChart title="PRODUCTOS SQM N.Y." data={sqmData} />

      {novandinoData.length === 0 && sqmData.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p>No se encontraron datos para los productos seleccionados en estas fechas.</p>
          <p style={{ fontSize: '0.8rem' }}>Asegúrate de que la columna AF tenga los nombres de productos correctos.</p>
        </div>
      )}
    </div>
  );
};

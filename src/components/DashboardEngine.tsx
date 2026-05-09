import React, { useEffect, useState, useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LabelList
} from 'recharts';
import { LayoutDashboard, Filter, RefreshCcw, Package, AlertCircle, Search, FileText } from 'lucide-react';
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

  const normalize = (str: string) => {
    if (!str) return '';
    return String(str).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const parseSpanishDate = (val: any) => {
    if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
    if (typeof val !== 'string') return new Date(val);

    const months: Record<string, string> = {
      'ene': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'abr': 'Apr', 'may': 'May', 'jun': 'Jun',
      'jul': 'Jul', 'ago': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dec'
    };
    
    let cleaned = val.toLowerCase().replace(/-/g, ' ');
    Object.keys(months).forEach(m => {
      cleaned = cleaned.replace(m, months[m]);
    });
    return new Date(cleaned);
  };

  const parseTime = (val: any) => {
    if (val === 'S/D' || val === 'S/d' || val === 's/d') return 0;
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

    const normalizedTargetProducts = products.map(p => normalize(p));

    const filtered = lastReport.excel_data.filter((row: any) => {
      // Intentar obtener producto por columna AF o por nombre de columna si el reporte es viejo
      const rawName = row['AF'] || row['Producto'] || row['PRODUCTO'];
      if (!rawName) return false;

      const normName = normalize(rawName);
      if (normName === 'producto') return false;

      const isCorrectProduct = normalizedTargetProducts.includes(normName);
      if (!isCorrectProduct) return false;

      if (startDate || endDate) {
        const rawDate = row['B'] || row['Fecha'] || row['FECHA'];
        const rowDate = parseSpanishDate(rawDate);
        if (!isNaN(rowDate.getTime())) {
          const start = startDate ? new Date(startDate + 'T00:00:00') : null;
          const end = endDate ? new Date(endDate + 'T23:59:59') : null;
          if (start && rowDate < start) return false;
          if (end && rowDate > end) return false;
        }
      }
      return true;
    });

    const grouped: Record<string, any> = {};
    filtered.forEach((row: any) => {
      const name = String(row['AF'] || row['Producto'] || row['PRODUCTO']).trim().toUpperCase();
      if (!grouped[name]) {
        grouped[name] = { name, progTon: 0, realTon: 0, metaHrsTotal: 0, metaCount: 0, realHrsTotal: 0, realCount: 0 };
      }
      
      grouped[name].progTon += parseFloat(row['AH'] || row['Ton (Prog)'] || 0) || 0;
      grouped[name].realTon += parseFloat(row['AI'] || row['Ton (Real)'] || 0) || 0;
      
      const mHrs = parseTime(row['AX'] || row['Tiempo Interior Faena Producto (Meta)']);
      if (mHrs !== null) {
        grouped[name].metaHrsTotal += mHrs;
        grouped[name].metaCount += 1;
      }
      
      const rHrs = parseTime(row['AY'] || row['Tiempo Interior Faena (Real)']);
      if (rHrs !== null) {
        grouped[name].realHrsTotal += rHrs;
        grouped[name].realCount += 1;
      }
    });

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

  // Diagnóstico de productos disponibles en el Excel
  const availableProducts = useMemo(() => {
    if (!lastReport?.excel_data || !Array.isArray(lastReport.excel_data)) return [];
    const set = new Set<string>();
    lastReport.excel_data.slice(0, 100).forEach((row: any) => {
      const name = row['AF'] || row['Producto'] || row['PRODUCTO'];
      if (name && normalize(name) !== 'producto') set.add(String(name).trim());
    });
    return Array.from(set);
  }, [lastReport]);

  const ProductChart = ({ title, data }: { title: string, data: any[] }) => {
    if (data.length === 0) return null;
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
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
              <Legend verticalAlign="top" align="right" height={36} />
              <Bar yAxisId="left" dataKey="progTon" name="Prog. Ton" fill="#4c1d95" radius={[4, 4, 0, 0]}><LabelList dataKey="progTon" position="top" fill="#94a3b8" fontSize={10} /></Bar>
              <Bar yAxisId="left" dataKey="realTon" name="Real Ton" fill="#10b981" radius={[4, 4, 0, 0]}><LabelList dataKey="realTon" position="top" fill="#10b981" fontSize={10} /></Bar>
              <Line yAxisId="right" type="monotone" dataKey="metaVal" name="Meta Hrs" stroke="#ffffff" strokeWidth={3} dot={{ r: 4 }}><LabelList dataKey="metaHrsLabel" position="top" fill="#ffffff" fontSize={10} offset={10} /></Line>
              <Line yAxisId="right" type="monotone" dataKey="realVal" name="Real Hrs" stroke="#d97706" strokeWidth={3} dot={{ r: 4 }}><LabelList dataKey="realHrsLabel" position="top" fill="#d97706" fontSize={10} offset={20} /></Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><RefreshCcw className="animate-spin" /></div>;

  return (
    <div className="animate-in">
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={18} color="var(--accent)" />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ opacity: 0.5 }}>al</span>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {novandinoData.length > 0 && <ProductChart title="PRODUCTOS NOVANDINO" data={novandinoData} />}
      {sqmData.length > 0 && <ProductChart title="PRODUCTOS SQM N.Y." data={sqmData} />}

      {/* Bitácora de Novedades */}
      <div className="glass-card animate-in" style={{ marginTop: '2rem', borderTop: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <FileText color="var(--accent)" />
          <h3 style={{ margin: 0 }}>Novedades e informaciones</h3>
        </div>
        <textarea 
          className="input-field" 
          rows={6} 
          placeholder="Escribe aquí las novedades detectadas en el dashboard..."
          value={lastReport.observations || ''}
          onChange={async (e) => {
            const newObs = e.target.value;
            setLastReport({ ...lastReport, observations: newObs });
            // Guardado automático (debounced o manual)
          }}
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button 
            className="btn-primary" 
            style={{ fontSize: '0.8rem', padding: '8px 20px' }}
            onClick={async () => {
              const { error } = await supabase
                .from('shift_reports')
                .update({ observations: lastReport.observations })
                .eq('id', lastReport.id);
              
              if (error) alert('Error al guardar: ' + error.message);
              else alert('Novedades actualizadas correctamente ✓');
            }}
          >
            Actualizar Novedades
          </button>
        </div>
      </div>

      {(novandinoData.length === 0 && sqmData.length === 0) && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', display: 'block', color: '#fb7185' }} />
          <h3>No hay datos para mostrar</h3>
          <p style={{ opacity: 0.7, marginBottom: '2rem' }}>No se encontraron coincidencias para los productos en el rango seleccionado.</p>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>
              <Search size={16} />
              <span style={{ fontWeight: '600' }}>Diagnóstico: Productos encontrados en el Excel</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableProducts.length > 0 ? availableProducts.map((p, i) => (
                <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>{p}</span>
              )) : <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>No se detectaron nombres de productos en la columna AF.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

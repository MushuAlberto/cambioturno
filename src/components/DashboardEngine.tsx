import React, { useEffect, useState, useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, LabelList
} from 'recharts';
import { LayoutDashboard, Clock, Filter, AlertTriangle, RefreshCcw, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Listas de productos por categoría
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

  // Función para convertir tiempo de Excel/String a número decimal de horas
  const parseTime = (val: any) => {
    if (typeof val === 'number') return val * 24; // Excel time
    if (typeof val === 'string' && val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      return h + (m / 60);
    }
    return parseFloat(val) || 0;
  };

  // Función para formatear decimal a HH:MM
  const formatToTime = (decimal: number) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const processData = (products: string[]) => {
    if (!lastReport?.excel_data) return [];

    const filtered = lastReport.excel_data.filter((row: any) => {
      // B es Fecha (Col index 1), AF es Producto (Col index 31)
      const keys = Object.keys(row);
      const prodName = row[keys[31]];
      const rowDate = new Date(row[keys[1]]);
      
      const isCorrectProduct = products.includes(prodName);
      if (!isCorrectProduct) return false;

      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
      }
      return true;
    });

    // Agrupar por producto
    const grouped: Record<string, any> = {};
    filtered.forEach((row: any) => {
      const keys = Object.keys(row);
      const name = row[keys[31]];
      if (!grouped[name]) {
        grouped[name] = { 
          name, 
          progTon: 0, 
          realTon: 0, 
          metaHrs: 0, 
          realHrs: 0,
          count: 0 
        };
      }
      grouped[name].progTon += parseFloat(row[keys[33]]) || 0; // AH
      grouped[name].realTon += parseFloat(row[keys[34]]) || 0; // AI
      grouped[name].metaHrs += parseTime(row[keys[49]]); // AX
      grouped[name].realHrs += parseTime(row[keys[50]]); // AY
      grouped[name].count += 1;
    });

    return Object.values(grouped).map((g: any) => ({
      ...g,
      metaHrs: g.metaHrs / g.count, // Promedio de meta
      realHrs: g.realHrs / g.count, // Promedio de real
      metaHrsLabel: formatToTime(g.metaHrs / g.count),
      realHrsLabel: formatToTime(g.realHrs / g.count)
    }));
  };

  const novandinoData = useMemo(() => processData(NOVANDINO_PRODUCTS), [lastReport, startDate, endDate]);
  const sqmData = useMemo(() => processData(SQM_NY_PRODUCTS), [lastReport, startDate, endDate]);

  const ProductChart = ({ title, data }: { title: string, data: any[] }) => (
    <div className="glass-card" style={{ marginBottom: '2.5rem', background: 'rgba(15, 23, 42, 0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Package color="var(--accent)" />
        <h3 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '1px' }}>{title}</h3>
      </div>
      
      <div style={{ height: '450px', width: '100%' }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={10} 
              interval={0} 
              angle={-45} 
              textAnchor="end" 
              height={80}
            />
            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} label={{ value: 'Toneladas', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} label={{ value: 'Horas', angle: 90, position: 'insideRight', fill: '#94a3b8' }} />
            
            <Tooltip 
              contentStyle={{ background: '#0f172a', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend verticalAlign="top" align="right" height={36} />
            
            {/* Barras Tonelaje */}
            <Bar yAxisId="left" dataKey="progTon" name="Prog. Ton" fill="#4c1d95" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="progTon" position="top" fill="#94a3b8" fontSize={10} />
            </Bar>
            <Bar yAxisId="left" dataKey="realTon" name="Real Ton" fill="#10b981" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="realTon" position="top" fill="#10b981" fontSize={10} />
            </Bar>

            {/* Líneas Tiempos */}
            <Line yAxisId="right" type="monotone" dataKey="metaHrs" name="Meta Hrs" stroke="#000" strokeWidth={3} dot={{ fill: '#fff', stroke: '#000', r: 4 }}>
              <LabelList dataKey="metaHrsLabel" position="top" fill="#fff" fontSize={10} offset={10} />
            </Line>
            <Line yAxisId="right" type="monotone" dataKey="realHrs" name="Real Hrs" stroke="#d97706" strokeWidth={3} dot={{ fill: '#fff', stroke: '#d97706', r: 4 }}>
              <LabelList dataKey="realHrsLabel" position="top" fill="#d97706" fontSize={10} offset={20} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><RefreshCcw className="animate-spin" /></div>;

  if (!lastReport) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <LayoutDashboard size={64} style={{ margin: '0 auto 1rem' }} />
        <p>No hay reportes publicados. Sube el primer cambio de turno para ver las gráficas.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Header Info */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Reporte Actual: {lastReport.supervisor_name}</h2>
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{new Date(lastReport.created_at).toLocaleDateString()} - Datos de pestaña "Base de Datos"</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {lastReport.image_urls?.map((url: string, i: number) => (
              <img key={i} src={url} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Filter size={18} color="var(--accent)" />
        <input type="date" className="input-field" style={{ width: 'auto' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span style={{ opacity: 0.3 }}>→</span>
        <input type="date" className="input-field" style={{ width: 'auto' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        {(startDate || endDate) && <button onClick={() => {setStartDate(''); setEndDate('');}} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}>Limpiar</button>}
      </div>

      {/* Gráficos por Categoría */}
      <ProductChart title="PRODUCTOS NOVANDINO" data={novandinoData} />
      <ProductChart title="PRODUCTOS SQM N.Y." data={sqmData} />

      {novandinoData.length === 0 && sqmData.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          <p>No se encontraron datos para los productos especificados en el rango de fechas.</p>
        </div>
      )}
    </div>
  );
};

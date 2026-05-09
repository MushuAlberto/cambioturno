import React, { useEffect, useState, useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LabelList
} from 'recharts';
import { LayoutDashboard, Filter, RefreshCcw, Package, AlertCircle, Search, FileText, Database } from 'lucide-react';
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
  const [showRaw, setShowRaw] = useState(false);
  
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
      if (!data) {
        setLastReport(null);
      } else {
        // Asegurarse de que excel_data sea un array
        const processedData = typeof data.excel_data === 'string' 
          ? JSON.parse(data.excel_data) 
          : data.excel_data;
        setLastReport({ ...data, excel_data: processedData });
      }
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const normalize = (str: string) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };

  const parseSpanishDate = (val: any) => {
    try {
      if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
      if (typeof val !== 'string') return new Date(val);
      const months: Record<string, string> = { 'ene': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'abr': 'Apr', 'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dec' };
      let cleaned = val.toLowerCase().replace(/-/g, ' ');
      Object.keys(months).forEach(m => cleaned = cleaned.replace(m, months[m]));
      return new Date(cleaned);
    } catch (e) {
      return new Date(NaN);
    }
  };

  const parseTime = (val: any) => {
    if (val === 'S/D' || val === 'S/d' || val === 's/d') return 0;
    if (typeof val === 'number') return val * 24; 
    if (typeof val === 'string' && val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      return h + (m / 60);
    }
    return parseFloat(val) || 0;
  };

  const formatToTime = (decimal: number) => {
    if (decimal === null || isNaN(decimal) || decimal === 0) return "0:00";
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const processData = (products: string[]) => {
    try {
      if (!lastReport?.excel_data || !Array.isArray(lastReport.excel_data)) return [];
      const normalizedTarget = products.map(p => normalize(p));

      const filtered = lastReport.excel_data.filter((row: any) => {
        const rawName = row['AF'] || row['Producto'] || row['PRODUCTO'];
        const normName = normalize(rawName);
        if (!normName || normName === 'producto') return false;
        if (!normalizedTarget.includes(normName)) return false;

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

      const grouped: any = {};
      filtered.forEach((row: any) => {
        const name = String(row['AF'] || row['Producto'] || row['PRODUCTO']).trim().toUpperCase();
        if (!grouped[name]) grouped[name] = { name, progTon: 0, realTon: 0, mTotal: 0, mCount: 0, rTotal: 0, rCount: 0 };
        grouped[name].progTon += parseFloat(row['AH'] || row['Ton (Prog)'] || 0) || 0;
        grouped[name].realTon += parseFloat(row['AI'] || row['Ton (Real)'] || 0) || 0;
        const m = parseTime(row['AX'] || row['Tiempo Interior Faena Producto (Meta)']);
        if (m !== null) { grouped[name].mTotal += m; grouped[name].mCount++; }
        const r = parseTime(row['AY'] || row['Tiempo Interior Faena (Real)']);
        if (r !== null) { grouped[name].rTotal += r; grouped[name].rCount++; }
      });

      return Object.values(grouped).map((g: any) => ({
        name: g.name,
        progTon: Math.round(g.progTon),
        realTon: Math.round(g.realTon),
        metaVal: g.mCount > 0 ? g.mTotal / g.mCount : 0,
        realVal: g.rCount > 0 ? g.rTotal / g.rCount : 0,
        metaHrsLabel: formatToTime(g.mCount > 0 ? g.mTotal / g.mCount : 0),
        realHrsLabel: formatToTime(g.rCount > 0 ? g.rTotal / g.rCount : 0)
      }));
    } catch (err) {
      console.error('Process Error:', err);
      return [];
    }
  };

  const novandinoData = useMemo(() => processData(NOVANDINO_PRODUCTS), [lastReport, startDate, endDate]);
  const sqmData = useMemo(() => processData(SQM_NY_PRODUCTS), [lastReport, startDate, endDate]);

  const ProductChart = ({ title, data }: { title: string, data: any[] }) => {
    if (data.length === 0) return null;
    return (
      <div className="glass-card animate-in" style={{ marginBottom: '2.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '2rem' }}>
        <h3 style={{ margin: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package color="var(--accent)" /> {title}
        </h3>
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
  if (error) return <div className="glass-card" style={{ color: '#fb7185', padding: '2rem' }}><AlertCircle /> {error}</div>;

  if (!lastReport) {
    return (
      <div className="glass-card animate-in" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h3>Aún no hay reportes publicados</h3>
        <p>Ve a la pestaña "Cambio de Turno" para subir tu primer archivo Excel.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={18} color="var(--accent)" />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={startDate} onChange={e => setStartDate(e.target.value)} onClick={(e) => (e.target as any).showPicker?.()} />
          <span style={{ opacity: 0.5 }}>al</span>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={endDate} onChange={e => setEndDate(e.target.value)} onClick={(e) => (e.target as any).showPicker?.()} />
        </div>
        <button onClick={() => setShowRaw(!showRaw)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={14} /> {showRaw ? 'Cerrar Datos' : 'Depurar Datos'}
        </button>
      </div>

      {showRaw && (
        <pre style={{ background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.7rem', overflow: 'auto', maxHeight: '300px', marginBottom: '2rem' }}>
          {JSON.stringify(lastReport, null, 2)}
        </pre>
      )}

      <ProductChart title="PRODUCTOS NOVANDINO" data={novandinoData} />
      <ProductChart title="PRODUCTOS SQM N.Y." data={sqmData} />

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
          value={lastReport?.observations || ''}
          onChange={(e) => setLastReport({ ...lastReport, observations: e.target.value })}
        />
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button 
            className="btn-primary" 
            style={{ fontSize: '0.8rem', padding: '8px 20px' }}
            onClick={async () => {
              const { error } = await supabase.from('shift_reports').update({ observations: lastReport.observations }).eq('id', lastReport.id);
              if (error) alert('Error al guardar: ' + error.message);
              else alert('Novedades actualizadas ✓');
            }}
          >
            Actualizar Novedades
          </button>
        </div>
      </div>
    </div>
  );
};

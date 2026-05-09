import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { LayoutDashboard, Clock, Filter, AlertTriangle, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        .maybeSingle(); // Usamos maybeSingle para que no falle si no hay filas

      if (sbError) throw sbError;
      setLastReport(data);
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err.message || 'Error al conectar con Supabase');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!lastReport?.excel_data || !Array.isArray(lastReport.excel_data)) return [];
    
    let data = [...lastReport.excel_data];

    if (startDate || endDate) {
      data = data.filter(row => {
        const keys = Object.keys(row);
        // Priorizar Columna B (índice 1) para la fecha
        const dateKey = keys[1] || keys[0];

        if (!row[dateKey]) return false;

        const rowDate = new Date(row[dateKey]);
        if (isNaN(rowDate.getTime())) return true; // Si no es fecha válida, no filtrar

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
        return true;
      });
    }

    return data;
  }, [lastReport, startDate, endDate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <RefreshCcw size={48} className="animate-spin" style={{ marginBottom: '1rem', margin: '0 auto' }} />
        <p>Cargando datos operativos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', border: '1px solid #fb7185' }}>
        <AlertTriangle size={48} color="#fb7185" style={{ marginBottom: '1rem', margin: '0 auto' }} />
        <h3>Error de Conexión</h3>
        <p>{error}</p>
        <p style={{ fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7 }}>
          Asegúrate de haber configurado las variables VITE_SUPABASE_URL y KEY en Vercel.
        </p>
        <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={fetchLatestReport}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!lastReport) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <LayoutDashboard size={64} style={{ marginBottom: '1rem', margin: '0 auto' }} />
        <h3>Esperando Primer Reporte</h3>
        <p>Aún no se han publicado cambios de turno. El supervisor debe enviar el primer reporte para ver el dashboard.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Resumen del Último Reporte */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>Último Turno: {lastReport.supervisor_name}</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {new Date(lastReport.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {lastReport.image_urls?.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
              </a>
            ))}
          </div>
        </div>
        <p style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontStyle: 'italic' }}>
          "{lastReport.observations}"
        </p>
      </div>

      {/* Controles de Filtro */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color="var(--accent)" />
          <span style={{ fontWeight: 600 }}>Rango de Fechas:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="date" className="input-field" style={{ padding: '0.5rem' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{ opacity: 0.5 }}>→</span>
          <input type="date" className="input-field" style={{ padding: '0.5rem' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', fontSize: '0.85rem' }}>
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Gráficos */}
      {filteredData.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Producción por Categoría</h3>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(filteredData[0])[0]} stroke="#718096" fontSize={10} />
                  <YAxis stroke="#718096" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Bar dataKey={Object.keys(filteredData[0])[1] || Object.keys(filteredData[0])[2]} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Tendencia</h3>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(filteredData[0])[0]} stroke="#718096" fontSize={10} />
                  <YAxis stroke="#718096" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey={Object.keys(filteredData[0])[1] || Object.keys(filteredData[0])[2]} stroke="#818cf8" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          <p>No hay datos disponibles para mostrar.</p>
        </div>
      )}
    </div>
  );
};

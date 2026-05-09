import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { LayoutDashboard, Clock, MessageSquare, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const DashboardEngine: React.FC = () => {
  const [lastReport, setLastReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros de fecha
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const fetchLatestReport = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setLastReport(data);
    }
    setLoading(false);
  };

  // Lógica de filtrado de datos del Excel
  const filteredData = useMemo(() => {
    if (!lastReport?.excel_data) return [];
    let data = [...lastReport.excel_data];

    if (startDate || endDate) {
      data = data.filter(row => {
        // Intentar encontrar la columna de fecha (buscamos por nombre común o primera columna)
        const dateKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('fecha') || 
          key.toLowerCase().includes('date') ||
          !isNaN(Date.parse(row[key]))
        );

        if (!dateKey) return true;

        const rowDate = new Date(row[dateKey]);
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
        <LayoutDashboard size={64} className="animate-spin" style={{ marginBottom: '1rem' }} />
        <p>Cargando información desde Supabase...</p>
      </div>
    );
  }

  if (!lastReport) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <LayoutDashboard size={64} style={{ marginBottom: '1rem' }} />
        <p>No hay datos publicados. Por favor, sube un cambio de turno con su archivo Excel.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Resumen del Último Reporte */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>Reporte: {lastReport.supervisor_name}</h2>
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
        <p style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
          "{lastReport.observations}"
        </p>
      </div>

      {/* Controles de Filtro */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color="var(--accent)" />
          <span style={{ fontWeight: 600 }}>Filtrar Datos:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Desde:</span>
            <input type="date" className="input-field" style={{ padding: '0.5rem' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Hasta:</span>
            <input type="date" className="input-field" style={{ padding: '0.5rem' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Limpiar
            </button>
          )}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.6 }}>
          Mostrando {filteredData.length} de {lastReport.excel_data?.length || 0} registros
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
                  <XAxis dataKey={Object.keys(filteredData[0])[0]} stroke="#718096" fontSize={12} />
                  <YAxis stroke="#718096" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Bar dataKey={Object.keys(filteredData[0])[1]} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Tendencia Histórica</h3>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(filteredData[0])[0]} stroke="#718096" fontSize={12} />
                  <YAxis stroke="#718096" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey={Object.keys(filteredData[0])[1]} stroke="#818cf8" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          <p>No hay datos para el rango de fechas seleccionado.</p>
        </div>
      )}
    </div>
  );
};

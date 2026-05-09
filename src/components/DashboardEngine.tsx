import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { LayoutDashboard, Clock, User, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const DashboardEngine: React.FC = () => {
  const [lastReport, setLastReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <LayoutDashboard size={64} className="animate-spin" style={{ marginBottom: '1rem' }} />
        <p>Cargando último reporte publicado...</p>
      </div>
    );
  }

  if (!lastReport) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <LayoutDashboard size={64} style={{ marginBottom: '1rem' }} />
        <p>Aún no hay reportes publicados. El supervisor debe enviar el primer cambio de turno.</p>
      </div>
    );
  }

  const data = lastReport.excel_data || [];

  return (
    <div className="animate-in">
      {/* Resumen del Último Reporte */}
      <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>Reporte Actual: {lastReport.supervisor_name}</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {new Date(lastReport.created_at).toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MessageSquare size={14} /> Observaciones incluidas
              </span>
            </div>
          </div>
          {lastReport.image_urls?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {lastReport.image_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                </a>
              ))}
            </div>
          )}
        </div>
        <p style={{ marginTop: '1rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
          "{lastReport.observations}"
        </p>
      </div>

      {/* Visualización de Datos del Excel Publicado */}
      {data.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Producción por Categoría (Excel)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(data[0])[0]} stroke="#718096" />
                  <YAxis stroke="#718096" />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Bar dataKey={Object.keys(data[0])[1]} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Tendencia de Desempeño</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(data[0])[0]} stroke="#718096" />
                  <YAxis stroke="#718096" />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey={Object.keys(data[0])[1]} stroke="#818cf8" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
          <p>El último reporte no incluyó datos de Excel procesables.</p>
        </div>
      )}
    </div>
  );
};

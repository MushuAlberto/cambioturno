import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { FileSpreadsheet, TrendingUp, AlertCircle, LayoutDashboard } from 'lucide-react';

interface DataPoint {
  [key: string]: any;
}

export const DashboardEngine: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      setData(jsonData as DataPoint[]);
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const COLORS = ['#38bdf8', '#818cf8', '#fb7185', '#34d399', '#fbbf24'];

  return (
    <div className="glass-card animate-in" style={{ animationDelay: '0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>📊 Dashboard Engine</h2>
          <p style={{ opacity: 0.7 }}>Carga un archivo Excel para generar visualizaciones automáticas.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => document.getElementById('excel-upload')?.click()}
        >
          <FileSpreadsheet size={18} /> Cargar Excel
        </button>
        <input 
          id="excel-upload" 
          type="file" 
          accept=".xlsx, .xls" 
          hidden 
          onChange={handleFileUpload}
        />
      </div>

      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          <LayoutDashboard size={64} style={{ marginBottom: '1rem' }} />
          <p>No hay datos cargados aún. Sube un archivo Excel para comenzar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Gráfico de Barras - Asumimos columnas numéricas */}
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Producción por Categoría</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(data[0])[0]} stroke="#718096" />
                  <YAxis stroke="#718096" />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey={Object.keys(data[0])[1]} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Líneas - Tendencia */}
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Tendencia de Desempeño</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey={Object.keys(data[0])[0]} stroke="#718096" />
                  <YAxis stroke="#718096" />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey={Object.keys(data[0])[1]} stroke="#818cf8" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPIs Rápidos */}
          <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Total Registros</p>
              <h4 style={{ fontSize: '2rem', margin: 0 }}>{data.length}</h4>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Promedio</p>
              <h4 style={{ fontSize: '2rem', margin: 0, color: '#34d399' }}>84.2%</h4>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Incidencias</p>
              <h4 style={{ fontSize: '2rem', margin: 0, color: '#fb7185' }}>3</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

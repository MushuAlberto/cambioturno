import React, { useState, useMemo } from 'react';
import { Camera, Send, FileText, User, Calendar, FileSpreadsheet, Loader2, CheckCircle2, ChevronRight, BarChart3, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LabelList
} from 'recharts';

// Listas de productos por categoría
const NOVANDINO_PRODUCTS = ['BISCHOFITA', 'LSI (S)', 'SAL 27/15', 'SLIT'];
const SQM_NY_PRODUCTS = [
  'MOP 70', 'MOP TALCO', 'MOP TALCO MAXIS', 'MOP-G', 'MOP-G (Rojo)', 
  'MOP-G 59', 'MOP-G O', 'MOP-G PLUS', 'MOP-G R 59', 'MOP-GR PLUS', 
  'MOP-H-AL', 'MOP-H-BL', 'MOP-S', 'MOP-S 59', 'MOP-S PLUS', 'NACL', 
  'SILVINITA', 'SOP-G', 'SOP-H', 'SOP-O', 'SOP-S Talco', 'MOP 50', 'SOP FINO'
];

export const ShiftForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states - Step 1
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [chartStartDate, setChartStartDate] = useState('');
  const [chartEndDate, setChartEndDate] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [supervisor, setSupervisor] = useState('Turno 39');

  // Form states - Step 2
  const [observations, setObservations] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Lógica de procesamiento de Excel
  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames.find(n => n === 'Base de Datos');
      if (!wsname) {
        alert('Error: No se encontró la pestaña "Base de Datos"');
        return;
      }
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: "A" });
      setExcelData(jsonData.slice(1));
    };
    reader.readAsBinaryString(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Helper para normalizar nombres
  const normalize = (str: string) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };

  const parseSpanishDate = (val: any) => {
    if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
    if (typeof val !== 'string') return new Date(val);
    const months: Record<string, string> = { 'ene': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'abr': 'Apr', 'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dec' };
    let cleaned = val.toLowerCase().replace(/-/g, ' ');
    Object.keys(months).forEach(m => cleaned = cleaned.replace(m, months[m]));
    return new Date(cleaned);
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

  const processLiveCharts = (products: string[]) => {
    if (!excelData) return [];
    const normalizedTarget = products.map(p => normalize(p));
    const filtered = excelData.filter(row => {
      const normName = normalize(row['AF'] || row['Producto']);
      if (!normName || normName === 'producto') return false;
      if (!normalizedTarget.includes(normName)) return false;

      if (chartStartDate || chartEndDate) {
        const rowDate = parseSpanishDate(row['B'] || row['Fecha']);
        const start = chartStartDate ? new Date(chartStartDate + 'T00:00:00') : null;
        const end = chartEndDate ? new Date(chartEndDate + 'T23:59:59') : null;
        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
      }
      return true;
    });

    const grouped: any = {};
    filtered.forEach(row => {
      const name = String(row['AF'] || row['Producto']).trim().toUpperCase();
      if (!grouped[name]) grouped[name] = { name, progTon: 0, realTon: 0, mTotal: 0, mCount: 0, rTotal: 0, rCount: 0 };
      grouped[name].progTon += parseFloat(row['AH']) || 0;
      grouped[name].realTon += parseFloat(row['AI']) || 0;
      const m = parseTime(row['AX']); if (m !== null) { grouped[name].mTotal += m; grouped[name].mCount++; }
      const r = parseTime(row['AY']); if (r !== null) { grouped[name].rTotal += r; grouped[name].rCount++; }
    });

    return Object.values(grouped).map((g: any) => ({
      name: g.name,
      progTon: Math.round(g.progTon),
      realTon: Math.round(g.realTon),
      metaVal: g.mCount > 0 ? g.mTotal / g.mCount : 0,
      realVal: g.rCount > 0 ? g.rTotal / g.rCount : 0,
    }));
  };

  const novandinoLive = useMemo(() => processLiveCharts(NOVANDINO_PRODUCTS), [excelData, chartStartDate, chartEndDate]);
  const sqmLive = useMemo(() => processLiveCharts(SQM_NY_PRODUCTS), [excelData, chartStartDate, chartEndDate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const imageUrls = [];
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('shift-images').upload(fileName, file);
        if (data) {
          const { data: publicUrl } = supabase.storage.from('shift-images').getPublicUrl(data.path);
          imageUrls.push(publicUrl.publicUrl);
        }
      }

      const { error } = await supabase.from('shift_reports').insert([{
        supervisor_name: supervisor,
        observations: observations,
        created_at: shiftDate,
        image_urls: imageUrls,
        excel_data: excelData
      }]);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setStep(1); setExcelData(null); setImages([]); setObservations(''); }, 3000);
    } catch (err: any) {
      alert('Error al publicar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card animate-in" style={{ textAlign: 'center', padding: '5rem' }}>
        <CheckCircle2 size={80} color="#34d399" style={{ margin: '0 auto 1.5rem' }} />
        <h2>¡Reporte Publicado!</h2>
        <p>El cambio de turno y dashboard ya están disponibles.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Botón para abrir configuración si estamos en el paso 2 o si queremos cambiar algo */}
      <button 
        className="btn-primary" 
        style={{ 
          position: 'fixed', 
          left: '20px', 
          bottom: '20px', 
          zIndex: 100, 
          borderRadius: '50%', 
          width: '60px', 
          height: '60px', 
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}
        onClick={() => setIsSidebarOpen(true)}
      >
        <FileSpreadsheet size={24} />
      </button>

      {/* Sidebar Oculto (Paso 1) */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`sidebar-content ${isSidebarOpen ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet className="text-accent" /> Configurar Datos
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5 }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className="label-text"><User size={14} /> Turno Saliente</label>
              <input type="text" className="input-field" value={supervisor} onChange={e => setSupervisor(e.target.value)} />
            </div>
            <div>
              <label className="label-text"><Calendar size={14} /> Fecha del Turno</label>
              <input type="date" className="input-field" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
            </div>

            <div>
              <label className="label-text"><FileSpreadsheet size={14} /> Archivo Excel (.xlsm)</label>
              <div className={`dropzone ${excelData ? 'active' : ''}`} onClick={() => document.getElementById('sidebar-excel')?.click()}>
                <FileSpreadsheet size={24} style={{ opacity: 0.5, color: excelData ? '#34d399' : 'inherit' }} />
                <p style={{ fontSize: '0.8rem' }}>{excelData ? 'Archivo Cargado ✓' : 'Seleccionar archivo'}</p>
                <input id="sidebar-excel" type="file" hidden onChange={handleExcelChange} />
              </div>
            </div>

            <div>
              <label className="label-text"><BarChart3 size={14} /> Rango para Gráficos</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input type="date" className="input-field" value={chartStartDate} onChange={e => setChartStartDate(e.target.value)} />
                <input type="date" className="input-field" value={chartEndDate} onChange={e => setChartEndDate(e.target.value)} />
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem', justifyContent: 'center' }} 
              onClick={() => {
                if (!excelData) alert('Carga un Excel primero');
                else {
                  setIsSidebarOpen(false);
                  setStep(2);
                }
              }}
            >
              Cargar y Continuar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
          <FileSpreadsheet size={64} style={{ margin: '0 auto 1.5rem', display: 'block' }} />
          <h3>Bienvenido al Cambio de Turno</h3>
          <p>Presiona el botón verde de la izquierda para configurar los datos del turno.</p>
          <button className="btn-primary" style={{ margin: '2rem auto 0' }} onClick={() => setIsSidebarOpen(true)}>
            Configurar Datos <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="animate-in">
          <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase' }}>Turno Saliente</span>
              <h3 style={{ margin: 0 }}>{supervisor}</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase' }}>Fecha</span>
              <h3 style={{ margin: 0 }}>{shiftDate}</h3>
            </div>
          </div>

          {/* Sector de Gráficos (Preview) */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
            <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} /> Sector con gráficos (Pre-visualización)
            </h4>
            
            {/* Gráfico Simplificado Novandino */}
            {novandinoLive.length > 0 && (
              <div style={{ height: '300px', marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>NOVANDINO</p>
                <ResponsiveContainer>
                  <ComposedChart data={novandinoLive}>
                    <XAxis dataKey="name" fontSize={10} stroke="rgba(255,255,255,0.3)" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none' }} />
                    <Bar dataKey="realTon" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="realVal" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico Simplificado SQM */}
            {sqmLive.length > 0 && (
              <div style={{ height: '300px' }}>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>SQM N.Y.</p>
                <ResponsiveContainer>
                  <ComposedChart data={sqmLive}>
                    <XAxis dataKey="name" fontSize={10} stroke="rgba(255,255,255,0.3)" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none' }} />
                    <Bar dataKey="realTon" fill="#4c1d95" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="realVal" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Novedades e Informaciones */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <label className="label-text"><FileText size={14} /> Novedades e informaciones</label>
            <textarea 
              className="input-field" 
              rows={6} 
              placeholder="Escribe aquí los puntos clave del turno..."
              value={observations}
              onChange={e => setObservations(e.target.value)}
            />
          </div>

          {/* Imágenes */}
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <label className="label-text"><Camera size={14} /> Imágenes / Evidencia</label>
            <div className="dropzone" onClick={() => document.getElementById('img-input')?.click()}>
              <Camera size={24} style={{ opacity: 0.5 }} />
              <p>Subir fotos del turno</p>
              <input id="img-input" type="file" multiple hidden accept="image/*" onChange={handleImageChange} />
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto' }}>
                {previews.map((s, i) => <img key={i} src={s} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />)}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} onClick={() => setStep(1)}>
              Atrás
            </button>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              {loading ? 'Publicando...' : 'Publicar Reporte Final'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Camera, Send, FileText, User, Calendar, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export const ShiftForm: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [supervisor, setSupervisor] = useState('');
  const [observations, setObservations] = useState('');
  const [dateTime, setDateTime] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      
      // Buscar específicamente la pestaña "Base de Datos"
      const wsname = wb.SheetNames.find(n => n === 'Base de Datos');
      if (!wsname) {
        alert('Error: No se encontró la pestaña "Base de Datos" en el archivo Excel.');
        setLoading(false);
        return;
      }
      
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      setExcelData(jsonData);
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Subir imágenes a Storage
      const imageUrls = [];
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('shift-images')
          .upload(fileName, file);
        
        if (data) {
          const { data: publicUrl } = supabase.storage.from('shift-images').getPublicUrl(data.path);
          imageUrls.push(publicUrl.publicUrl);
        }
      }

      // 2. Guardar reporte en base de datos
      const { error } = await supabase.from('shift_reports').insert([
        {
          supervisor_name: supervisor,
          observations: observations,
          created_at: dateTime || new Date().toISOString(),
          image_urls: imageUrls,
          excel_data: excelData
        }
      ]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      
      // Limpiar formulario
      setImages([]);
      setPreviews([]);
      setExcelData(null);
      setSupervisor('');
      setObservations('');
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Hubo un error al enviar el reporte. Verifica la conexión con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card animate-in" style={{ textAlign: 'center', padding: '4rem' }}>
        <CheckCircle2 size={64} color="#34d399" style={{ marginBottom: '1rem', margin: '0 auto' }} />
        <h2>¡Reporte Enviado!</h2>
        <p>El cambio de turno y los datos del dashboard han sido publicados exitosamente.</p>
        <button className="btn-primary" style={{ marginTop: '2rem' }} onClick={() => setSuccess(false)}>
          Crear otro reporte
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>📝 Publicar Cambio de Turno</h2>
        <p style={{ opacity: 0.7 }}>Completa el reporte y adjunta el archivo Excel de la red.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <User size={14} style={{ marginRight: '4px' }} /> Supervisor Saliente
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Nombre completo" 
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <Calendar size={14} style={{ marginRight: '4px' }} /> Fecha y Hora
            </label>
            <input 
              type="datetime-local" 
              className="input-field" 
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <FileText size={14} style={{ marginRight: '4px' }} /> Novedades y Observaciones
          </label>
          <textarea 
            className="input-field" 
            rows={5} 
            placeholder="Describe incidencias, pendientes o estados de máquinas..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            required
          ></textarea>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Imágenes */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <Camera size={14} style={{ marginRight: '4px' }} /> Evidencia (Fotos)
            </label>
            <div className="dropzone" style={{ padding: '1.5rem' }} onClick={() => document.getElementById('image-upload')?.click()}>
              <Camera size={24} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '0.8rem' }}>Subir fotos</p>
              <input id="image-upload" type="file" multiple accept="image/*" hidden onChange={handleImageChange} />
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto' }}>
                {previews.map((src, i) => (
                  <img key={i} src={src} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                ))}
              </div>
            )}
          </div>

          {/* Excel */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <FileSpreadsheet size={14} style={{ marginRight: '4px' }} /> Datos del Dashboard (.xlsm)
            </label>
            <div 
              className="dropzone" 
              style={{ padding: '1.5rem', borderColor: excelData ? '#34d399' : 'var(--glass-border)' }} 
              onClick={() => document.getElementById('excel-upload')?.click()}
            >
              <FileSpreadsheet size={24} style={{ opacity: 0.5, color: excelData ? '#34d399' : 'inherit' }} />
              <p style={{ fontSize: '0.8rem' }}>{excelData ? 'Excel Cargado ✓' : 'Subir archivo de red'}</p>
              <input id="excel-upload" type="file" accept=".xlsx, .xls, .xlsm" hidden onChange={handleExcelChange} />
            </div>
          </div>
        </div>

        <button 
          className="btn-primary" 
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {loading ? 'Publicando...' : 'Publicar Reporte y Dashboard'}
        </button>
      </form>
    </div>
  );
};

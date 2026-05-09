import React, { useState } from 'react';
import { Camera, Send, FileText, User, Calendar } from 'lucide-react';

export const ShiftForm: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray]);
      
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  return (
    <div className="glass-card animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>📝 Reporte de Cambio de Turno</h2>
        <p style={{ opacity: 0.7 }}>Completa la información clave para el siguiente turno.</p>
      </div>

      <form className="shift-form" onSubmit={(e) => e.preventDefault()}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <User size={14} style={{ marginRight: '4px' }} /> Supervisor Saliente
            </label>
            <input type="text" className="input-field" placeholder="Nombre completo" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <Calendar size={14} style={{ marginRight: '4px' }} /> Fecha y Hora
            </label>
            <input type="datetime-local" className="input-field" />
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
          ></textarea>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <Camera size={14} style={{ marginRight: '4px' }} /> Adjuntar Evidencia (Fotos)
          </label>
          <div 
            className="dropzone"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Camera size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Haz clic para subir o arrastra imágenes aquí</p>
            <input 
              id="image-upload" 
              type="file" 
              multiple 
              accept="image/*" 
              hidden 
              onChange={handleImageChange}
            />
          </div>

          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', overflowX: 'auto', padding: '0.5rem' }}>
              {previews.map((src, i) => (
                <img 
                  key={i} 
                  src={src} 
                  alt="Preview" 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }} 
                />
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <Send size={18} /> Enviar Reporte de Turno
        </button>
      </form>
    </div>
  );
};

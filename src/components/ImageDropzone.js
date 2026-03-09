'use client';

import React, { useState, useRef } from 'react';

export default function ImageDropzone({ 
  onImageSave, 
  previewUrl = null, 
  onRemove = null,
  label = "Arrastra una imagen o PDF aquí, o haz clic para seleccionar",
  maxSizeMB = 20
}) {
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef(null);

  const esPDF = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== 'string') return false;
    return dataUrl.startsWith('data:application/pdf');
  };

  const procesarArchivo = (file) => {
    if (!file) return;
    
    const esImagen = file.type.startsWith('image/');
    const esPdf = file.type === 'application/pdf';
    
    if (!esImagen && !esPdf) {
      alert('Solo se permiten imágenes o archivos PDF');
      return;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`El archivo es muy grande (máx ${maxSizeMB}MB)`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (esPdf) {
        // PDF: guardar Base64 crudo sin compresión
        if (onImageSave) {
          onImageSave(reader.result);
        }
      } else {
        // Imagen: comprimir vía canvas
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 800;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          if (onImageSave) {
            onImageSave(compressedBase64);
          }
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    procesarArchivo(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    procesarArchivo(e.dataTransfer.files[0]);
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (previewUrl) {
    const mostrarComoPDF = esPDF(previewUrl);
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {mostrarComoPDF ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '100%', minHeight: '100px', padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            borderRadius: '8px', border: '2px solid #f59e0b',
          }}>
            <span style={{ fontSize: '40px' }}>📄</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e', marginTop: '6px' }}>PDF Adjunto</span>
          </div>
        ) : (
          <img 
            src={previewUrl} 
            alt="Comprobante" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '150px', 
              borderRadius: '8px',
              border: '2px solid #ddd',
              objectFit: 'contain'
            }} 
          />
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: `2px dashed ${arrastrando ? '#6366f1' : '#ddd'}`,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        background: arrastrando ? 'rgba(99, 102, 241, 0.1)' : '#f9fafb',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf,application/pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📎</span>
      <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
        {label}
      </p>
    </div>
  );
}

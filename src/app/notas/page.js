'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './notas.module.css';
import { getNotas, addNota, updateNota, deleteNota } from '@/lib/storage';

export default function NotasPage() {
  const [notas, setNotas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [notaEnEdicion, setNotaEnEdicion] = useState(null);
  
  // Formulario
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    color: '#ffedd5', // default orange
  });

  const colores = [
    { bg: '#ffedd5', name: 'Naranja' }, // orange-100
    { bg: '#dbeafe', name: 'Azul' },    // blue-100
    { bg: '#dcfce7', name: 'Verde' },   // green-100
    { bg: '#fce7f3', name: 'Rosa' },    // pink-100
    { bg: '#f3e8ff', name: 'Morado' },  // purple-100
    { bg: '#fef3c7', name: 'Amarillo' }, // amber-100
  ];

  useEffect(() => {
    cargarNotas();
  }, []);

  const cargarNotas = async () => {
    setNotas(await getNotas());
  };

  const abrirModal = (nota = null) => {
    if (nota) {
      setNotaEnEdicion(nota);
      setFormData({
        titulo: nota.titulo,
        contenido: nota.contenido,
        color: nota.color,
      });
    } else {
      setNotaEnEdicion(null);
      setFormData({
        titulo: '',
        contenido: '',
        color: '#ffedd5',
      });
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setNotaEnEdicion(null);
  };

  const guardarNota = async (e) => {
    e.preventDefault();
    
    if (notaEnEdicion) {
      await updateNota(notaEnEdicion.id, formData);
    } else {
      await addNota(formData);
    }
    
    await cargarNotas();
    cerrarModal();
  };

  const eliminarNota = async (id, e) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar esta nota?')) {
      await deleteNota(id);
      await cargarNotas();
    }
  };

  const formatearFecha = (fechaISO) => {
    return new Date(fechaISO).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <main className="main-content">
      <header className={styles.pageHeader}>
        <div className={styles.headerTitle}>
          <div className={styles.headerIcon}>📝</div>
          <div>
            <h1>Notas</h1>
            <p>Tus recordatorios e ideas</p>
          </div>
        </div>
        <button className={styles.addButton} onClick={() => abrirModal()}>
          <span>➕</span> Nueva Nota
        </button>
      </header>

      <div className={styles.notesGrid}>
        {notas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>✨</span>
            <h3>No tienes notas aún</h3>
            <p>Crea tu primera nota para no olvidar nada importante.</p>
          </div>
        ) : (
          notas.map((nota) => (
            <div 
              key={nota.id} 
              className={styles.noteCard}
              style={{ backgroundColor: nota.color }}
              onClick={() => abrirModal(nota)}
            >
              <div className={styles.noteHeader}>
                <h3 className={styles.noteTitle}>{nota.titulo}</h3>
                <span className={styles.pinIcon}>📌</span>
              </div>
              <div className={styles.noteContent}>
                {nota.contenido}
              </div>
              <div className={styles.noteFooter}>
                <span>{formatearFecha(nota.fecha)}</span>
                <div className={styles.actions}>
                  <button 
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={(e) => { e.stopPropagation(); abrirModal(nota); }}
                  >
                    ✏️
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={(e) => eliminarNota(nota.id, e)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {mostrarModal && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{notaEnEdicion ? 'Editar Nota' : 'Nueva Nota'}</h2>
              <button className={styles.closeButton} onClick={cerrarModal}>✕</button>
            </div>
            <form onSubmit={guardarNota}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Título</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    placeholder="Ej. Llamar a proveedor..."
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Contenido</label>
                  <textarea
                    className={styles.textarea}
                    value={formData.contenido}
                    onChange={(e) => setFormData({...formData, contenido: e.target.value})}
                    placeholder="Escribe aquí..."
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Color</label>
                  <div className={styles.colorsGrid}>
                    {colores.map((c) => (
                      <div
                        key={c.bg}
                        className={`${styles.colorOption} ${formData.color === c.bg ? styles.active : ''}`}
                        style={{ backgroundColor: c.bg }}
                        onClick={() => setFormData({...formData, color: c.bg})}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className={styles.btnSave}>Guardar Nota</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

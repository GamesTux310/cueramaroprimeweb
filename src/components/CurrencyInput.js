'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './CurrencyInput.module.css';

export default function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = '0.00', 
  name, 
  required = false 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // Sincronizar valor inicial
  useEffect(() => {
    if (isFocused) return;
    
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isFocused]);

  const formatCurrency = (val) => {
    if (val === '' || isNaN(val)) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 10, // Permitir más decimales si existen
    }).format(val);
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Permitir solo números y un punto decimal
    if (/^\d*\.?\d*$/.test(inputValue)) {
      setDisplayValue(inputValue);
      onChange({ target: { name, value: inputValue } });
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Mostrar valor crudo al editar
    setDisplayValue(value ? value.toString() : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    // El useEffect se encargará de formatear al perder el foco
  };

  return (
    <div className={styles.container}>
      {/* Visualmente ocultar el prefix si está formateado ya que Intl lo incluye, 
          pero en modo edición mostrarlo */}
      {isFocused && <span className={styles.prefix}>$</span>}
      
      <input
        type="text"
        name={name}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={`${styles.input} ${!isFocused ? styles.formatted : ''}`}
        inputMode="decimal"
        autoComplete="off"
      />
    </div>
  );
}

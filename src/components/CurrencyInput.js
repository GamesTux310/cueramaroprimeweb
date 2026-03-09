'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './CurrencyInput.module.css';

export default function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = '$0.00', 
  name, 
  required = false,
  className = ''
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef(null);

  // Misión 1: Función super robusta para parsear decimales y evitar NaN
  const parseDecimal = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    
    // Limpiar de comas, letras, símbolos extra.
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Efecto para sincronizar el value crudo (prop) hacia nuestro display
  useEffect(() => {
    if (isFocused) return; // No interferir mientras el usuario escribe
    
    if (value === null || value === undefined || value === '') {
      setDisplayValue('');
    } else {
      const numValue = parseDecimal(value);
      setDisplayValue(new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numValue));
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;
    
    // 1. Extraer solo dígitos y el punto decimal
    let rawStr = input.value.replace(/[^0-9.]/g, '');
    
    // 2. Limpiar múltiples puntos y forzar solo 1
    const parts = rawStr.split('.');
    if (parts.length > 2) {
      rawStr = parts[0] + '.' + parts.slice(1).join('');
    }

    // 3. Limitar a máximo 2 decimales visualmente
    if (parts.length > 1) {
      rawStr = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }

    // 4. Construir display formateado con $, y comas (sin usar Intl vivo para no bloquear borrado de '.' ni forzar '.00' fijo)
    let formattedDisplay = '';
    if (rawStr !== '') {
      let intPart = parts[0];
      let intValue = intPart ? parseInt(intPart, 10) : 0;
      
      // Formateo de enteros (comas)
      let intFormatted = new Intl.NumberFormat('es-MX').format(intValue);
      
      formattedDisplay = '$' + intFormatted;
      if (rawStr.includes('.')) {
        formattedDisplay += '.' + (parts.length > 1 ? parts[1].slice(0, 2) : '');
      }
    }

    setDisplayValue(formattedDisplay);

    // 5. Ajustar el cursor de forma fluida
    window.requestAnimationFrame(() => {
      if (inputRef.current) {
        const newLength = formattedDisplay.length;
        const diff = newLength - oldLength;
        let newCursorPos = cursorPosition + diff;
        
        // No permitir que el cursor quede antes del signo $
        if (newCursorPos < 1 && formattedDisplay.length > 0) {
          newCursorPos = 1;
        }
        
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });

    // 6. Misión 1: Emitir SIEMPRE el numérico crudo (0, nunca NaN)
    const finalNumber = parseDecimal(rawStr);
    if (onChange) {
      onChange({ target: { name, value: finalNumber } });
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    const numValue = parseDecimal(displayValue);
    if (displayValue !== '') {
      // Re-formatear perfecto al perder el foco (rellenando .00 si hace falta con Intl completo)
      setDisplayValue(new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numValue));
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={styles.input}
        inputMode="decimal"
        autoComplete="off"
      />
    </div>
  );
}

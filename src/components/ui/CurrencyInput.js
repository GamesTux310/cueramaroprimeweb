import React, { useState, useEffect } from 'react';

/**
 * CurrencyInput - Un "Widget" equivalente a TextFormField con TextInputFormatter.
 * Muestra el formato con comas en tiempo real al usuario ($ 1,500.00)
 * pero internamente devuelve el número limpio (1500) a tu estado/store.
 * 
 * @param {string|number} value - El valor numérico crudo desde la DB o Estado.
 * @param {function} onChange - Devuelve un (Number|String vacío). Ej: onChange(1500.50)
 * @param {string} prefix - Ej: '$'
 * @param {string} suffix - Ej: ' KG'
 * @param {string} placeholder - Placeholder nativo.
 * @param {boolean} readOnly - Si está bloqueado.
 * @param {string} className - Clases CSS del input.
 */
export const CurrencyInput = ({
  value,
  onChange,
  prefix = '$ ',
  suffix = '',
  placeholder = '0.00',
  readOnly = false,
  className = '',
  style = {},
  id,
  name
}) => {
  // Estado local para lo que VE el usuario (El string con comas)
  const [displayValue, setDisplayValue] = useState('');

  // 1. Sincronizar hacia abajo (padre -> hijo)
  // Cuando el estado real (value) cambia externamente, formatearlo para la vista.
  useEffect(() => {
    if (value === null || value === undefined || value === '') {
      setDisplayValue('');
      return;
    }

    // Convertirlo a string para la UI, pero si ya estamos escribiéndolo
    // y el usuario tiene un punto decimal inconcluso "150.", no arruinárselo.
    const numericValue = parseFloat(value);
    
    // Solo formatear fuerte si el valor visual ya es muy viejo o al inicio.
    // Esto evita que el cursor brinque feo si está en medio de la escritura (Un problema clásico de React)
    if (!isNaN(numericValue) && document.activeElement?.id !== id) {
       setDisplayValue(formatMoneyString(numericValue.toString()));
    }
  }, [value, id]);

  // Utils: Limpiador de texto sucio a números limpios matemáticos
  const cleanToRawNumber = (str) => {
    if (!str) return '';
    // Permite números y un solo punto, remueve $, comas, letras y otros símbolos
    const digitsOnly = str.replace(/[^\d.]/g, '');
    
    // Asegurarse de que no haya dos puntos ej: "1.5.00"
    const parts = digitsOnly.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return digitsOnly;
  };

  // Utils: Formateador a '1,500.00' (Solo agrega comas para no romper decimales)
  const formatMoneyString = (str) => {
    if (!str) return '';
    
    // Separar los enteros de los decimales
    const parts = str.split('.');
    let enteros = parts[0];
    const decimales = parts.length > 1 ? '.' + parts[1] : '';

    // Si tiene ceros a la izquierda y no son necesarios (ej: '0150' -> '150')
    if (enteros.length > 1 && enteros.startsWith('0')) {
        enteros = parseInt(enteros, 10).toString();
    }

    // Agregar comas con Regex bonito a la parte entera
    const conComas = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${prefix}${conComas}${decimales}${suffix}`;
  };

  // 2. Manejo de pulsaciones del teclado del usuario (hijo -> padre)
  const handleChange = (e) => {
    let inputVal = e.target.value;

    // Si el usuario borra por completo
    if (inputVal === '' || inputVal === prefix || inputVal === suffix) {
      setDisplayValue('');
      onChange('');
      return;
    }

    // 1. Limpiar la basura
    const cleanNumberString = cleanToRawNumber(inputVal);

    // 2. Si todavía hay algo limpio que mandar
    if (cleanNumberString !== '') {
      // Dibujar con comas visualmente
      // Un hack sutil: No formatear full si terminal en punto ej "150."
      // porque visualmente borraría el punto flotante al instante
      if (cleanNumberString.endsWith('.')) {
        setDisplayValue(`${prefix}${cleanNumberString}${suffix}`);
      } else {
        setDisplayValue(formatMoneyString(cleanNumberString));
      }
      
      // Enviar el DATO MATEMÁTICO REAL ($1,500.00 -> 1500)
      onChange(parseFloat(cleanNumberString));
    } else {
      setDisplayValue('');
      onChange('');
    }
  };

  // 3. Cuando pierde el foco (On Blur) -> Asegurar el ".00"
  const handleBlur = () => {
    if (value !== '' && value !== null && value !== undefined) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        // Formateo Nativo JavaScript Estricto Internacional (Añade ceros faltantes a decimales .5 => .50)
        const formatFuerte = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: prefix.includes('$') ? 2 : 0, // Kilos no fuerzan .00
            maximumFractionDigits: prefix.includes('$') ? 2 : 3  // Kilos permiten .500
        }).format(numericValue);

        setDisplayValue(`${prefix}${formatFuerte}${suffix}`);
        onChange(numericValue);
      }
    }
  };

  // 4. Focus (Opcional): Que el click vaya directo a los números y no seleccione el prefijo.
  const handleFocus = (e) => {
    const val = e.target.value;
    e.target.setSelectionRange(val.length - suffix.length, val.length - suffix.length);
  };

  return (
    <input
      id={id}
      name={name}
      type="text" // Usar TEXT, no NUMBER para soportar comas y símbolos de pesos visuales
      inputMode="decimal" // Levanta teclado numérico en móviles de todos modos
      className={className}
      style={style}
      readOnly={readOnly}
      placeholder={`${prefix}${placeholder}${suffix}`}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  );
};

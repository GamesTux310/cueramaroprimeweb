import styles from '../../app/ventas/ventas.module.css';

/**
 * Componente visual (Dumb Component / StatelessWidget) para la selección de clientes.
 * Encapsula la barra de búsqueda y el dropdown visual sin manejar la lógica local.
 */
export const CustomerSelector = ({ 
  clienteSeleccionado, 
  busquedaCliente, 
  mostrarClientes, 
  clientesFiltrados,
  onSeleccionarCliente,
  onDeseleccionarCliente,
  onBusquedaChange,
  onMostrarClientesChange
}) => {
  return (
    <div className={styles.clienteSection}>
      <label>👤 Cliente</label>
      {clienteSeleccionado ? (
        <div className={styles.clienteSeleccionado}>
          <div className={styles.clienteInfo}>
            {clienteSeleccionado.avatarURL ? (
              <img
                src={clienteSeleccionado.avatarURL}
                alt="Avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }}
              />
            ) : null}
            <div>
              <span className={styles.clienteNombre}>{clienteSeleccionado.nombre}</span>
              <span className={styles.clienteTipo}>
                {clienteSeleccionado.tipoCliente === 'credito' ? '💳 Crédito' : '💵 Contado'}
              </span>
            </div>
          </div>
          <button onClick={onDeseleccionarCliente}>✕</button>
        </div>
      ) : (
        <div className={styles.clienteSearch}>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busquedaCliente}
            onChange={(e) => {
              onBusquedaChange(e.target.value);
              onMostrarClientesChange(e.target.value.length > 0);
            }}
            onFocus={() => onMostrarClientesChange(true)}
            onBlur={() => setTimeout(() => onMostrarClientesChange(false), 200)}
          />
          {mostrarClientes && clientesFiltrados.length > 0 && (
            <div className={styles.clienteDropdown}>
              {clientesFiltrados.map((cliente) => (
                <div
                  key={cliente.id}
                  className={styles.clienteOption}
                  onClick={() => onSeleccionarCliente(cliente)}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  {cliente.avatarURL ? (
                    <img
                      src={cliente.avatarURL}
                      alt="Avatar"
                      style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }}
                    />
                  ) : (
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#6b7280'
                    }}>
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ flex: 1 }}>{cliente.nombre}</span>
                  <span className={styles.clienteTipoBadge}>
                    {cliente.tipoCliente === 'credito' ? '💳' : '💵'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  UserCircleIcon,
  LockClosedIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';
import AttendanceClock from '@/components/AttendanceClock';

export default function Home() {
  const [numeroEmpleado, setNumeroEmpleado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [informacionEmpleado, setInformacionEmpleado] = useState(null);
  const [registrosRecientes, setRegistrosRecientes] = useState([]);
  
  // Estados para el modal de autenticación
  const [mostrarModalAuth, setMostrarModalAuth] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');
  const [autenticando, setAutenticando] = useState(false);

  // Estado para verificar si ya registró asistencia
  const [tieneAsistenciaReciente, setTieneAsistenciaReciente] = useState(false);
  const [proximoRegistroPermitido, setProximoRegistroPermitido] = useState(null);

  // Verificar empleado en tiempo real Y si ya tiene asistencia reciente
  useEffect(() => {
    const verificarEmpleado = async () => {
      if (numeroEmpleado.trim().length >= 1) {
        setValidando(true);
        try {
          const respuesta = await fetch(`/api/registrar-asistencia?employeeId=${numeroEmpleado}`);
          if (respuesta.ok) {
            const datos = await respuesta.json();
            setInformacionEmpleado({
              nombre: datos.name,
              area: datos.department
            });
            
            // Verificar si ya tiene asistencia reciente (menos de 20 horas)
            const verificacionAsistencia = await verificarAsistenciaReciente(numeroEmpleado);
            setTieneAsistenciaReciente(verificacionAsistencia.tiene_asistencia_reciente);
            
            if (verificacionAsistencia.tiene_asistencia_reciente) {
              setMensaje({ 
                texto: `Empleado encontrado: ${datos.name} - Ya registró asistencia recientemente`, 
                tipo: 'warning' 
              });
              setProximoRegistroPermitido(verificacionAsistencia.proximo_registro_permitido);
            } else {
              setMensaje({ 
                texto: `Empleado encontrado: ${datos.name}`, 
                tipo: 'info' 
              });
              setProximoRegistroPermitido(null);
            }
          } else {
            setInformacionEmpleado(null);
            setTieneAsistenciaReciente(false);
            setProximoRegistroPermitido(null);
            setMensaje({ 
              texto: 'Empleado no encontrado en el sistema', 
              tipo: 'error' 
            });
          }
        } catch (error) {
          console.error('Error verificando empleado:', error);
          setInformacionEmpleado(null);
          setTieneAsistenciaReciente(false);
          setProximoRegistroPermitido(null);
        } finally {
          setValidando(false);
        }
      } else {
        setInformacionEmpleado(null);
        setTieneAsistenciaReciente(false);
        setProximoRegistroPermitido(null);
        setMensaje({ texto: '', tipo: '' });
      }
    };

    const timerDebounce = setTimeout(() => {
      if (numeroEmpleado.trim()) {
        verificarEmpleado();
      }
    }, 500);

    return () => clearTimeout(timerDebounce);
  }, [numeroEmpleado]);

  // Función para verificar asistencia reciente
  const verificarAsistenciaReciente = async (numeroEmpleado) => {
    try {
      const respuesta = await fetch(`/api/verificar-asistencia?numero_empleado=${numeroEmpleado}`);
      if (respuesta.ok) {
        const datos = await respuesta.json();
        console.log('📊 Respuesta de verificar-asistencia:', datos);
        return {
          tiene_asistencia_reciente: datos.tiene_asistencia_reciente,
          ultima_asistencia: datos.ultima_asistencia,
          proximo_registro_permitido: datos.proximo_registro_permitido,
          horas_restantes: datos.horas_restantes,
          detalles: datos.detalles
        };
      } else {
        const error = await respuesta.json();
        console.error('❌ Error en verificar-asistencia:', error);
      }
    } catch (error) {
      console.error('❌ Error verificando asistencia reciente:', error);
    }
    return { 
      tiene_asistencia_reciente: false, 
      ultima_asistencia: null, 
      proximo_registro_permitido: null, 
      horas_restantes: 0 
    };
  };

  // Obtener registros recientes
  useEffect(() => {
    obtenerRegistrosRecientes();
  }, []);

  const obtenerRegistrosRecientes = async () => {
    try {
      const respuesta = await fetch('/api/asistencias?limite=5');
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setRegistrosRecientes(datos);
      }
    } catch (error) {
      console.error('Error obteniendo registros recientes:', error);
    }
  };

  // Función para verificar la contraseña
  const verificarContrasena = async (contrasenaInput) => {
    const CONTRASENA_ADMIN = '0810'; 
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Verificación exacta de 4 dígitos
        if (contrasenaInput.length !== 4) {
          resolve(false);
          return;
        }
        
        // Solo dígitos numéricos
        if (!/^\d{4}$/.test(contrasenaInput)) {
          resolve(false);
          return;
        }
        
        resolve(contrasenaInput === CONTRASENA_ADMIN);
      }, 500);
    });
  };

  const manejarClickAdmin = (e) => {
    e.preventDefault();
    setMostrarModalAuth(true);
    setContrasena('');
    setMostrarContrasena(false);
    setErrorAuth('');
  };

  const manejarEnvioContrasena = async (e) => {
    e.preventDefault();
    
    if (contrasena.length !== 4) {
      setErrorAuth('La contraseña debe tener exactamente 4 dígitos');
      return;
    }

    if (!/^\d{4}$/.test(contrasena)) {
      setErrorAuth('La contraseña solo puede contener números');
      return;
    }

    setAutenticando(true);
    
    try {
      const esValida = await verificarContrasena(contrasena);
      
      if (esValida) {
        // Redirigir al panel de administración
        window.location.href = '/admin';
      } else {
        setErrorAuth('Contraseña incorrecta. Inténtalo de nuevo.');
        setContrasena('');
        setMostrarContrasena(false);
      }
    } catch (error) {
      setErrorAuth('Error al verificar contraseña. Por favor, intenta nuevamente.');
      console.error('Error:', error);
    } finally {
      setAutenticando(false);
    }
  };

  const manejarTeclaPresionada = (e) => {
    // Permitir solo números
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
      e.preventDefault();
    }
    
    // Autosubmit al completar 4 dígitos
    if (contrasena.length === 3 && /[0-9]/.test(e.key)) {
      const nuevaContrasena = contrasena + e.key;
      setContrasena(nuevaContrasena);
      
      // Pequeño delay para que se vea el último dígito
      setTimeout(() => {
        const eventoFalso = { preventDefault: () => {} };
        manejarEnvioContrasena(eventoFalso);
      }, 100);
    }
  };

  const alternarVisibilidadContrasena = () => {
    setMostrarContrasena(!mostrarContrasena);
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    
    if (!numeroEmpleado.trim()) {
      setMensaje({ 
        texto: 'Por favor, ingresa tu número de empleado', 
        tipo: 'error' 
      });
      return;
    }

    if (!informacionEmpleado) {
      setMensaje({ 
        texto: 'Por favor, verifica que el número de empleado sea correcto', 
        tipo: 'error' 
      });
      return;
    }

    // Verificar nuevamente si ya tiene asistencia reciente
    const verificacionAsistencia = await verificarAsistenciaReciente(numeroEmpleado);
    if (verificacionAsistencia.tiene_asistencia_reciente) {
      setTieneAsistenciaReciente(true);
      setProximoRegistroPermitido(verificacionAsistencia.proximo_registro_permitido);
      setMensaje({ 
        texto: `Ya registraste asistencia recientemente. Puedes registrar nuevamente en ${verificacionAsistencia.horas_restantes} horas.`, 
        tipo: 'warning' 
      });
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch('/api/asistencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numero_empleado: numeroEmpleado }),
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {
        setMensaje({ 
          texto: `¡Asistencia registrada exitosamente! Bienvenido/a ${datos.nombre_empleado}`, 
          tipo: 'success' 
        });
        
        // Mostrar detalles del registro
        setTimeout(() => {
          setMensaje({ 
            texto: `Registrado: ${datos.fecha} ${datos.hora} - ${datos.area}`, 
            tipo: 'success' 
          });
        }, 2000);
        
        setNumeroEmpleado('');
        setInformacionEmpleado(null);
        setTieneAsistenciaReciente(false);
        setProximoRegistroPermitido(null);
        
        // Actualizar registros recientes
        obtenerRegistrosRecientes();
        
        // Auto-limpiar mensaje después de 8 segundos
        setTimeout(() => {
          setMensaje({ texto: '', tipo: '' });
        }, 8000);
      } else {
        setMensaje({ 
          texto: datos.error || 'Error al registrar asistencia', 
          tipo: 'error' 
        });
        
        // Auto-limpiar mensaje de error después de 5 segundos
        setTimeout(() => {
          setMensaje({ texto: '', tipo: '' });
        }, 5000);
      }
    } catch (error) {
      setMensaje({ 
        texto: 'Error de conexión con el servidor', 
        tipo: 'error' 
      });
      
      setTimeout(() => {
        setMensaje({ texto: '', tipo: '' });
      }, 5000);
    } finally {
      setCargando(false);
    }
  };

  const formatearHora = (marcaTiempo) => {
    const fecha = new Date(marcaTiempo);
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearFechaHora = (cadenaFecha) => {
    if (!cadenaFecha) return '';
    const fecha = new Date(cadenaFecha);
    return fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal - Formulario */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-8">
              {/* Encabezado */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Control de Asistencias
                </h1>
                <p className="text-gray-600 mb-4">
                  Registra tu entrada con tu número de empleado
                </p>
                
                {/* Componente Reloj */}
                <AttendanceClock />
              </div>

              {/* Formulario */}
              <form onSubmit={manejarEnvio} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Empleado
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={numeroEmpleado}
                      onChange={(e) => setNumeroEmpleado(e.target.value)}
                      className="input-field text-lg text-gray-800 pr-12"
                      placeholder=""
                      disabled={cargando}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validando ? (
                        <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : informacionEmpleado ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  {/* Información del empleado */}
                  {informacionEmpleado && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center">
                        <UserCircleIcon className="h-10 w-10 text-blue-600 flex-shrink-0" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-900">{informacionEmpleado.nombre}</p>
                          <p className="text-xs text-blue-700">{informacionEmpleado.area}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advertencia de asistencia reciente */}
                  {tieneAsistenciaReciente && proximoRegistroPermitido && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-amber-800">
                            Ya registraste asistencia recientemente
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Puedes registrar nuevamente después de: {formatearFechaHora(proximoRegistroPermitido)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={cargando || !informacionEmpleado || tieneAsistenciaReciente}
                  className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargando ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registrando en base de datos...
                    </>
                  ) : tieneAsistenciaReciente ? 'Ya registrado (Espere 20h)' : 'Registrar Entrada'}
                </button>
              </form>

              {/* Mensaje de estado */}
              {mensaje.texto && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  mensaje.tipo === 'success' 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700' 
                    : mensaje.tipo === 'error'
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700'
                    : mensaje.tipo === 'warning'
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700'
                    : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="flex items-start">
                    {mensaje.tipo === 'success' ? (
                      <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : mensaje.tipo === 'error' ? (
                      <XCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : mensaje.tipo === 'warning' ? (
                      <InformationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-amber-600" />
                    ) : (
                      <InformationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
                    )}
                    <div>
                      <span className="font-medium">{mensaje.texto}</span>
                      {mensaje.tipo === 'success' && (
                        <p className="text-sm mt-1 text-green-600">
                          La información se ha guardado en la base de datos
                        </p>
                      )}
                      {mensaje.tipo === 'warning' && proximoRegistroPermitido && (
                        <p className="text-sm mt-1 text-amber-600">
                          Próximo registro permitido: {formatearFechaHora(proximoRegistroPermitido)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Nota sobre la base de datos */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center text-sm text-gray-600">
                  <CircleStackIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Tus asistencias se guardan automáticamente en la base de datos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna lateral - Información */}
          <div className="space-y-8">
            {/* Tarjeta de información */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 bg-gradient-to-br from-purple-100 to-pink-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-800">
                  Instrucciones
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ingresa tu número de empleado
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  El sistema verifica automáticamente
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Presiona "Registrar Entrada" para guardar 
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Solo 1 registro cada 20 horas por empleado
                </li>
              </ul>
            </div>

            {/* Registros recientes */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-blue-100 to-cyan-100 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-800">
                    Registros Recientes
                  </h3>
                </div>
                <button
                  onClick={obtenerRegistrosRecientes}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Actualizar
                </button>
              </div>
              
              {registrosRecientes.length > 0 ? (
                <div className="space-y-3">
                  {registrosRecientes.slice(0, 5).map((registro, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {registro.nombre_empleado}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {registro.numero_empleado}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatearHora(registro.marca_tiempo)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {registro.fecha}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">
                    No hay registros recientes
                  </p>
                </div>
              )}
            </div>

            {/* Enlace admin */}
            <div className="glass-card rounded-2xl p-6">
              <div className="text-center">
                <button 
                  onClick={manejarClickAdmin}
                  className="inline-flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all duration-200 font-medium group"
                >
                  <svg className="w-5 h-5 mr-2 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Panel de Administración
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Acceso restringido con contraseña
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center px-4 py-2 bg-white rounded-xl shadow-sm">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <CircleStackIcon className="w-4 h-4" />
              Sistema conectado a MongoDB • Límite: 20h entre registros • v3.0
            </p>
          </div>
        </div>
      </div>

      {/* Modal de autenticación */}
      {mostrarModalAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 p-2 rounded-lg">
                  <LockClosedIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-3 text-xl font-semibold text-gray-800">
                  Acceso Administrativo
                </h3>
              </div>
              <button
                onClick={() => setMostrarModalAuth(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={manejarEnvioContrasena} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña de 4 dígitos
                </label>
                <div className="relative">
                  <input
                    type={mostrarContrasena ? "text" : "password"}
                    value={contrasena}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setContrasena(valor);
                      setErrorAuth('');
                    }}
                    onKeyDown={manejarTeclaPresionada}
                    className="w-full px-4 py-3 text-gray-700 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                    placeholder="●●●●"
                    autoFocus
                    disabled={autenticando}
                    maxLength={4}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={alternarVisibilidadContrasena}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {mostrarContrasena ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Indicador de dígitos */}
                <div className="flex justify-center gap-3 mt-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index < contrasena.length
                          ? 'bg-gray-800'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {errorAuth && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-700">
                      {errorAuth}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={autenticando || contrasena.length !== 4}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {autenticando ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verificando...
                  </>
                ) : 'Acceder al Panel'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMostrarModalAuth(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>

            {/* Nota de seguridad */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start text-xs text-gray-500">
                <InformationCircleIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <p>
                  Este panel es solo para personal autorizado. La contraseña se comparte únicamente con administradores.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
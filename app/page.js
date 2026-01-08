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
  CircleStackIcon,
  ClockIcon
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

  // Estados para verificación de asistencia
  const [tieneAsistenciaHoy, setTieneAsistenciaHoy] = useState(false);
  const [esDespuesDe4PM, setEsDespuesDe4PM] = useState(false);
  const [horaActual, setHoraActual] = useState('');
  const [puedeRegistrar, setPuedeRegistrar] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);

  // Constante para offset de Jalisco (UTC-6)
  const JALISCO_OFFSET = -6;

  // Función para obtener hora actual de Jalisco
  const getCurrentJaliscoTime = () => {
    const ahora = new Date();
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const hora = fechaJalisco.getUTCHours().toString().padStart(2, '0');
    const minutos = fechaJalisco.getUTCMinutes().toString().padStart(2, '0');
    
    return `${hora}:${minutos}`;
  };

  // Función para verificar si es después de las 4:00 PM
  const verificarSiEsDespuesDe4PM = () => {
    const ahora = new Date();
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    const hora = fechaJalisco.getUTCHours();
    return hora >= 16; // 16:00 = 4:00 PM
  };

  // Función para obtener fecha actual en formato Jalisco (DD/MM/YYYY)
  const getCurrentJaliscoDate = () => {
    const ahora = new Date();
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const dia = fechaJalisco.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaJalisco.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fechaJalisco.getUTCFullYear();
    
    return `${dia}/${mes}/${año}`;
  };

  // Actualizar hora actual cada minuto
  useEffect(() => {
    const actualizarHora = () => {
      const hora = getCurrentJaliscoTime();
      setHoraActual(hora);
      const es4PM = verificarSiEsDespuesDe4PM();
      setEsDespuesDe4PM(es4PM);
    };

    // Actualizar inmediatamente
    actualizarHora();
    
    // Actualizar cada minuto
    const intervalo = setInterval(actualizarHora, 60000);
    
    return () => clearInterval(intervalo);
  }, []);

  // Verificar empleado en tiempo real
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
            
            // Verificar asistencia de hoy
            await verificarAsistenciaHoy(numeroEmpleado, datos.name);
            
          } else {
            setInformacionEmpleado(null);
            setTieneAsistenciaHoy(false);
            setPuedeRegistrar(false);
            setMensaje({ 
              texto: 'Empleado no encontrado en el sistema', 
              tipo: 'error' 
            });
          }
        } catch (error) {
          console.error('Error verificando empleado:', error);
          setInformacionEmpleado(null);
          setTieneAsistenciaHoy(false);
          setPuedeRegistrar(false);
        } finally {
          setValidando(false);
        }
      } else {
        setInformacionEmpleado(null);
        setTieneAsistenciaHoy(false);
        setPuedeRegistrar(false);
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

  // Función para verificar asistencia de hoy - CORREGIDA
  const verificarAsistenciaHoy = async (numero_empleado, nombreEmpleado = null) => {
    try {
      const fechaHoy = getCurrentJaliscoDate();
      const respuesta = await fetch(`/api/asistencias?numero_empleado=${numero_empleado}&fecha=${fechaHoy}&limite=10`);
      
      if (respuesta.ok) {
        const registrosHoy = await respuesta.json();
        
        // Verificar lógica según la hora
        const esDespuesDe4PMActual = verificarSiEsDespuesDe4PM();
        
        // Usar el nombre del parámetro o el estado existente
        const nombre = nombreEmpleado || (informacionEmpleado ? informacionEmpleado.nombre : '');
        
        if (registrosHoy.length === 0) {
          // No tiene registros hoy → puede registrar
          setTieneAsistenciaHoy(false);
          setPuedeRegistrar(true);
          setUltimoRegistro(null);
          
          setMensaje({ 
            texto: nombre ? `Empleado encontrado: ${nombre}. Puedes registrar entrada.` : 'Puedes registrar entrada.', 
            tipo: 'info' 
          });
        } else {
          // Tiene registros hoy
          const ultimoRegistro = registrosHoy[0];
          setUltimoRegistro(ultimoRegistro);
          
          if (esDespuesDe4PMActual) {
            // Después de las 4 PM → siempre puede registrar (nuevo ciclo)
            setTieneAsistenciaHoy(true);
            setPuedeRegistrar(true);
            
            setMensaje({ 
              texto: nombre ? `Empleado encontrado: ${nombre}. puedes registrar.` : 'Puedes registrar.', 
              tipo: 'info' 
            });
          } else {
            // Antes de las 4 PM → si ya registró hoy, no puede
            const yaRegistroHoy = registrosHoy.some(r => r.tipo_registro === 'entrada');
            
            if (yaRegistroHoy) {
              setTieneAsistenciaHoy(true);
              setPuedeRegistrar(false);
              
              setMensaje({ 
                texto: `Ya registraste entrada hoy. Espera hasta mañana para registrar nuevamente.`, 
                tipo: 'warning' 
              });
            } else {
              setTieneAsistenciaHoy(false);
              setPuedeRegistrar(true);
              
              setMensaje({ 
                texto: nombre ? `Empleado encontrado: ${nombre}. Puedes registrar entrada.` : 'Puedes registrar entrada.', 
                tipo: 'info' 
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error verificando asistencia hoy:', error);
      setTieneAsistenciaHoy(false);
      setPuedeRegistrar(true); // Por defecto permitir si hay error
    }
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
        if (contrasenaInput.length !== 4) {
          resolve(false);
          return;
        }
        
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
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
      e.preventDefault();
    }
    
    if (contrasena.length === 3 && /[0-9]/.test(e.key)) {
      const nuevaContrasena = contrasena + e.key;
      setContrasena(nuevaContrasena);
      
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

    if (!puedeRegistrar) {
      setMensaje({ 
        texto: 'No puedes registrar en este momento', 
        tipo: 'warning' 
      });
      return;
    }

    // Verificar nuevamente antes de enviar
    await verificarAsistenciaHoy(numeroEmpleado, informacionEmpleado.nombre);
    if (!puedeRegistrar) {
      setMensaje({ 
        texto: 'No puedes registrar en este momento.', 
        tipo: 'warning' 
      });
      return;
    }

    setCargando(true);
    try {
      // Determinar tipo de registro automáticamente
      let tipoRegistro = 'entrada';
      
      const respuesta = await fetch('/api/asistencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          numero_empleado: numeroEmpleado,
        }),
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {
        const mensajeRegistro = datos.tipo_registro === 'entrada' 
          ? `¡Entrada registrada exitosamente! Bienvenido/a ${datos.nombre_empleado}`
          : `¡Registro exitoso! ${datos.nombre_empleado}`;
        
        setMensaje({ 
          texto: mensajeRegistro, 
          tipo: 'success' 
        });
        
        // Mostrar detalles del registro
        setTimeout(() => {
          setMensaje({ 
            texto: `Registrado: ${datos.fecha} ${datos.hora} - ${datos.area} (${datos.tipo_registro})`, 
            tipo: 'success' 
          });
        }, 2000);
        
        setNumeroEmpleado('');
        setInformacionEmpleado(null);
        setTieneAsistenciaHoy(false);
        setPuedeRegistrar(false);
        
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

  // Determinar texto del botón
  const getButtonText = () => {
    if (cargando) return 'Registrando...';
    
    if (!informacionEmpleado) return 'Registrar Asistencia';
    
    if (!puedeRegistrar) {
      return 'Espera hasta mañana';
    }
    
    if (esDespuesDe4PM) {
      return 'Registrar hasta mañana';
    }
    
    return 'Registrar Entrada';
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
                  <ClockIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Control de Asistencias
                </h1>
                <p className="text-gray-600 mb-4">
                  Registra tu entrada y salida con tu número de empleado
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
                          {ultimoRegistro && (
                            <p className="text-xs text-blue-600 mt-1">
                              Último registro: {formatearHora(ultimoRegistro.marca_tiempo)} ({ultimoRegistro.tipo_registro})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje sobre registro después de 4 PM */}
                  {esDespuesDe4PM && informacionEmpleado && puedeRegistrar && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="ml-3">
                          <p className="text-xs text-green-700 mt-1">
                            Puedes registrar normalmente. Al día siguiente podrás registrar entrada sin problemas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advertencia si no puede registrar */}
                  {informacionEmpleado && !puedeRegistrar && !esDespuesDe4PM && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-amber-800">
                            Ya registraste entrada hoy
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Espera hasta mañana para registrar nuevamente
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={cargando || !informacionEmpleado || !puedeRegistrar}
                  className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargando ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registrando...
                    </>
                  ) : getButtonText()}
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
                  Registra entrada al llegar (1 por día)
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Mañana: Registra libremente
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Al día siguiente: Entrada normal sin problemas
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
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className="text-xs text-gray-500">
                              {registro.fecha}
                            </p>
                            <span className={`px-1 py-0.5 text-xs rounded ${
                              registro.tipo_registro === 'entrada' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {registro.tipo_registro || 'entrada'}
                            </span>
                          </div>
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
              Sistema conectado a MongoDB • Registro flexible • Al día siguiente: entrada normal
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
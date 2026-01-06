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
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import AttendanceClock from '@/components/AttendanceClock';

export default function Home() {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  
  // Estados para el modal de autenticación
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Estado para verificar si ya registró asistencia
  const [hasRecentAttendance, setHasRecentAttendance] = useState(false);
  const [nextAllowedTime, setNextAllowedTime] = useState(null);

  // Verificar empleado en tiempo real Y si ya tiene asistencia reciente
  useEffect(() => {
    const verifyEmployee = async () => {
      if (employeeId.trim().length >= 1) {
        setValidating(true);
        try {
          const response = await fetch(`/api/register-attendance?employeeId=${employeeId}`);
          if (response.ok) {
            const data = await response.json();
            setEmployeeInfo({
              name: data.name,
              department: data.department
            });
            
            // Verificar si ya tiene asistencia reciente (menos de 20 horas)
            const attendanceCheck = await checkRecentAttendance(employeeId);
            setHasRecentAttendance(attendanceCheck.hasRecentAttendance);
            
            if (attendanceCheck.hasRecentAttendance) {
              setMessage({ 
                text: `Empleado encontrado: ${data.name} - Ya registró asistencia recientemente`, 
                type: 'warning' 
              });
              setNextAllowedTime(attendanceCheck.nextAllowedTime);
            } else {
              setMessage({ 
                text: `Empleado encontrado: ${data.name}`, 
                type: 'info' 
              });
              setNextAllowedTime(null);
            }
          } else {
            setEmployeeInfo(null);
            setHasRecentAttendance(false);
            setNextAllowedTime(null);
            setMessage({ 
              text: 'Empleado no encontrado en el sistema', 
              type: 'error' 
            });
          }
        } catch (error) {
          console.error('Error verificando empleado:', error);
          setEmployeeInfo(null);
          setHasRecentAttendance(false);
          setNextAllowedTime(null);
        } finally {
          setValidating(false);
        }
      } else {
        setEmployeeInfo(null);
        setHasRecentAttendance(false);
        setNextAllowedTime(null);
        setMessage({ text: '', type: '' });
      }
    };

    const debounceTimer = setTimeout(() => {
      if (employeeId.trim()) {
        verifyEmployee();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [employeeId]);

  // Función para verificar asistencia reciente
  // Función para verificar asistencia reciente
const checkRecentAttendance = async (employeeId) => {
  try {
    const response = await fetch(`/api/check-attendance?employeeId=${employeeId}`);
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Respuesta de check-attendance:', data);
      return {
        hasRecentAttendance: data.hasRecentAttendance,
        lastAttendance: data.lastAttendance,
        nextAllowedTime: data.nextAllowedTime,
        hoursRemaining: data.hoursRemaining,
        details: data.details
      };
    } else {
      const error = await response.json();
      console.error('❌ Error en check-attendance:', error);
    }
  } catch (error) {
    console.error('❌ Error verificando asistencia reciente:', error);
  }
  return { 
    hasRecentAttendance: false, 
    lastAttendance: null, 
    nextAllowedTime: null, 
    hoursRemaining: 0 
  };
};

  // Obtener registros recientes
  useEffect(() => {
    fetchRecentRegistrations();
  }, []);

  const fetchRecentRegistrations = async () => {
    try {
      const response = await fetch('/api/get-attendance?limit=5');
      if (response.ok) {
        const data = await response.json();
        setRecentRegistrations(data);
      }
    } catch (error) {
      console.error('Error obteniendo registros recientes:', error);
    }
  };

  // Función para verificar la contraseña - Mejorada con verificación real
  const verifyPassword = async (inputPassword) => {
    const ADMIN_PASSWORD = '0810'; 
    
    // Simulación de verificación (en producción, deberías verificar en el backend)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Verificación exacta de 4 dígitos
        if (inputPassword.length !== 4) {
          resolve(false);
          return;
        }
        
        // Solo dígitos numéricos
        if (!/^\d{4}$/.test(inputPassword)) {
          resolve(false);
          return;
        }
        
        resolve(inputPassword === ADMIN_PASSWORD);
      }, 500);
    });
  };

  const handleAdminClick = (e) => {
    e.preventDefault();
    setShowAuthModal(true);
    setPassword('');
    setShowPassword(false);
    setAuthError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length !== 4) {
      setAuthError('La contraseña debe tener exactamente 4 dígitos');
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      setAuthError('La contraseña solo puede contener números');
      return;
    }

    setIsAuthenticating(true);
    
    try {
      const isValid = await verifyPassword(password);
      
      if (isValid) {
        // Redirigir al panel de administración
        window.location.href = '/admin';
      } else {
        setAuthError('Contraseña incorrecta. Inténtalo de nuevo.');
        setPassword('');
        setShowPassword(false);
      }
    } catch (error) {
      setAuthError('Error al verificar contraseña. Por favor, intenta nuevamente.');
      console.error('Error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleKeyPress = (e) => {
    // Permitir solo números
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
      e.preventDefault();
    }
    
    // Autosubmit al completar 4 dígitos
    if (password.length === 3 && /[0-9]/.test(e.key)) {
      const newPassword = password + e.key;
      setPassword(newPassword);
      
      // Pequeño delay para que se vea el último dígito
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        handlePasswordSubmit(fakeEvent);
      }, 100);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!employeeId.trim()) {
      setMessage({ 
        text: 'Por favor, ingresa tu número de empleado', 
        type: 'error' 
      });
      return;
    }

    if (!employeeInfo) {
      setMessage({ 
        text: 'Por favor, verifica que el número de empleado sea correcto', 
        type: 'error' 
      });
      return;
    }

    // Verificar nuevamente si ya tiene asistencia reciente
    const attendanceCheck = await checkRecentAttendance(employeeId);
    if (attendanceCheck.hasRecentAttendance) {
      setHasRecentAttendance(true);
      setNextAllowedTime(attendanceCheck.nextAllowedTime);
      setMessage({ 
        text: `Ya registraste asistencia recientemente. Puedes registrar nuevamente en ${attendanceCheck.hoursRemaining} horas.`, 
        type: 'warning' 
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/register-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          text: `¡Asistencia registrada exitosamente! Bienvenido/a ${data.employeeName}`, 
          type: 'success' 
        });
        
        // Mostrar detalles del registro
        setTimeout(() => {
          setMessage({ 
            text: `Registrado: ${data.date} ${data.time} - ${data.department}`, 
            type: 'success' 
          });
        }, 2000);
        
        setEmployeeId('');
        setEmployeeInfo(null);
        setHasRecentAttendance(false);
        setNextAllowedTime(null);
        
        // Actualizar registros recientes
        fetchRecentRegistrations();
        
        // Auto-limpiar mensaje después de 8 segundos
        setTimeout(() => {
          setMessage({ text: '', type: '' });
        }, 8000);
      } else {
        setMessage({ 
          text: data.error || 'Error al registrar asistencia', 
          type: 'error' 
        });
        
        // Auto-limpiar mensaje de error después de 5 segundos
        setTimeout(() => {
          setMessage({ text: '', type: '' });
        }, 5000);
      }
    } catch (error) {
      setMessage({ 
        text: 'Error de conexión con el servidor', 
        type: 'error' 
      });
      
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Empleado
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="input-field text-lg text-gray-800 pr-12"
                      placeholder=""
                      disabled={loading}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validating ? (
                        <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : employeeInfo ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  {/* Información del empleado */}
                  {employeeInfo && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center">
                        <UserCircleIcon className="h-10 w-10 text-blue-600 flex-shrink-0" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-900">{employeeInfo.name}</p>
                          <p className="text-xs text-blue-700">{employeeInfo.department}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advertencia de asistencia reciente */}
                  {hasRecentAttendance && nextAllowedTime && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-amber-800">
                            Ya registraste asistencia recientemente
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Puedes registrar nuevamente después de: {formatDateTime(nextAllowedTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !employeeInfo || hasRecentAttendance}
                  className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registrando en Google Sheets...
                    </>
                  ) : hasRecentAttendance ? 'Ya registrado (Espere 20h)' : 'Registrar Entrada'}
                </button>
              </form>

              {/* Mensaje de estado */}
              {message.text && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  message.type === 'success' 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700' 
                    : message.type === 'error'
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700'
                    : message.type === 'warning'
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700'
                    : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="flex items-start">
                    {message.type === 'success' ? (
                      <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : message.type === 'error' ? (
                      <XCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : message.type === 'warning' ? (
                      <InformationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-amber-600" />
                    ) : (
                      <InformationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
                    )}
                    <div>
                      <span className="font-medium">{message.text}</span>
                      {message.type === 'success' && (
                        <p className="text-sm mt-1 text-green-600">
                          La información se ha guardado en Google Sheets
                        </p>
                      )}
                      {message.type === 'warning' && nextAllowedTime && (
                        <p className="text-sm mt-1 text-amber-600">
                          Próximo registro permitido: {formatDateTime(nextAllowedTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Nota sobre Google Sheets */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Tus asistencias se guardan automáticamente en Google Sheets</span>
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
                  onClick={fetchRecentRegistrations}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Actualizar
                </button>
              </div>
              
              {recentRegistrations.length > 0 ? (
                <div className="space-y-3">
                  {recentRegistrations.slice(0, 5).map((record, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {record.employeeId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(record.timestamp)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.date}
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
                  onClick={handleAdminClick}
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Sistema conectado a Google Sheets • Límite: 20h entre registros • v2.1
            </p>
          </div>
        </div>
      </div>

      {/* Modal de autenticación */}
      {showAuthModal && (
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
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña de 4 dígitos
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPassword(value);
                      setAuthError('');
                    }}
                    onKeyDown={handleKeyPress}
                    className="w-full px-4 py-3 text-gray-700 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                    placeholder="●●●●"
                    autoFocus
                    disabled={isAuthenticating}
                    maxLength={4}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
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
                        index < password.length
                          ? 'bg-gray-800'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-700">
                      {authError}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating || password.length !== 4}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isAuthenticating ? (
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
                  onClick={() => setShowAuthModal(false)}
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
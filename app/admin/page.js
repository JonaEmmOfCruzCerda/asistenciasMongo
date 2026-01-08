'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UsersIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  UserPlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleStackIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// Constante para offset de Jalisco (UTC-6)
const JALISCO_OFFSET = -6;
const ITEMS_PER_PAGE = 10;

export default function AdminPage() {
  // Estados para asistencias
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState({
    total_empleados: 0,
    empleados_activos: 0,
    total_asistencias: 0,
    asistencias_hoy: 0,
    empleados_unicos_hoy: 0,
    registros_por_area: {}
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dbStatus, setDbStatus] = useState('conectando');
  
  // Estados para gestión de empleados
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Formulario de empleado
  const [employeeForm, setEmployeeForm] = useState({
    numero_empleado: '',
    nombre_completo: '',
    area: '',
    departamento: '',
    activo: 'Sí',
    originalId: '',
    isEditing: false
  });
  const [formErrors, setFormErrors] = useState({});

  // Estado para la nueva tabla de verificación de asistencia
  const [attendanceCheckData, setAttendanceCheckData] = useState([]);
  const [attendanceCheckLoading, setAttendanceCheckLoading] = useState(false);
  
  // NUEVOS ESTADOS PARA OBSERVACIONES
  const [observaciones, setObservaciones] = useState({});
  const [observacionInput, setObservacionInput] = useState({});
  const [savingObservacion, setSavingObservacion] = useState({});
  
  // NUEVOS ESTADOS PARA TABLA SEMANAL
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });
  
  // PAGINACIÓN - Estados para cada tabla
  const [currentAttendancePage, setCurrentAttendancePage] = useState(1);
  const [currentEmployeesPage, setCurrentEmployeesPage] = useState(1);
  const [currentCheckPage, setCurrentCheckPage] = useState(1);
  const [currentWeeklyPage, setCurrentWeeklyPage] = useState(1);

  // Referencias para menús desplegables
  const exportCheckMenuRef = useRef(null);
  const exportAttendanceMenuRef = useRef(null);
  const exportEmployeesMenuRef = useRef(null);
  const exportWeeklyMenuRef = useRef(null);
  
  // Función para obtener fecha actual en formato Jalisco
  const getCurrentJaliscoDate = () => {
    const ahora = new Date();
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const dia = fechaJalisco.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaJalisco.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fechaJalisco.getUTCFullYear();
    
    return `${dia}/${mes}/${año}`;
  };

  const [currentDate] = useState(() => getCurrentJaliscoDate());

  // Función para formatear fecha con zona horaria
  const formatDateTime = (date) => {
    const fecha = new Date(date);
    const fechaJalisco = new Date(fecha.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const hora = fechaJalisco.getUTCHours().toString().padStart(2, '0');
    const minutos = fechaJalisco.getUTCMinutes().toString().padStart(2, '0');
    const segundos = fechaJalisco.getUTCSeconds().toString().padStart(2, '0');
    
    return `${hora}:${minutos}:${segundos}`;
  };

  // Función para obtener hora actual de Jalisco
  const getCurrentJaliscoTime = () => {
    const ahora = new Date();
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const hora = fechaJalisco.getUTCHours().toString().padStart(2, '0');
    const minutos = fechaJalisco.getUTCMinutes().toString().padStart(2, '0');
    
    return `${hora}:${minutos}`;
  };

  // Función para convertir fecha UTC a fecha Jalisco string
  const convertToJaliscoDateString = (date) => {
    const fecha = new Date(date);
    const fechaJalisco = new Date(fecha.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const dia = fechaJalisco.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaJalisco.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fechaJalisco.getUTCFullYear();
    
    return `${dia}/${mes}/${año}`;
  };

  

  // REEMPLAZA estas funciones en tu código:

  

// Función para obtener el inicio de la semana (LUNES a viernes)
const getWeekStartDate = () => {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  // Calcular días desde el último lunes (lunes = 1)
  let diasDesdeLunes;
  if (diaSemana === 0) { // Domingo
    diasDesdeLunes = 6; // Retroceder al lunes anterior
  } else if (diaSemana === 1) { // Lunes
    diasDesdeLunes = 0; // Ya es lunes
  } else {
    diasDesdeLunes = diaSemana - 1; // Martes(2) -> 1, Miércoles(3) -> 2, etc.
  }
  
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - diasDesdeLunes);
  
  // Formatear a DD/MM/YYYY
  const dia = inicioSemana.getDate().toString().padStart(2, '0');
  const mes = (inicioSemana.getMonth() + 1).toString().padStart(2, '0');
  const año = inicioSemana.getFullYear();
  
  return `${dia}/${mes}/${año}`;
};

// Función para obtener el fin de la semana (lunes a VIERNES)
const getWeekEndDate = () => {
  const inicioSemana = getWeekStartDate();
  const [dia, mes, año] = inicioSemana.split('/').map(Number);
  const fechaInicio = new Date(año, mes - 1, dia);
  
  // Sumar 4 días para llegar al viernes (lunes + 4 = viernes)
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaInicio.getDate() + 4);
  
  // Formatear a DD/MM/YYYY
  const diaFin = fechaFin.getDate().toString().padStart(2, '0');
  const mesFin = (fechaFin.getMonth() + 1).toString().padStart(2, '0');
  const añoFin = fechaFin.getFullYear();
  
  return `${diaFin}/${mesFin}/${añoFin}`;
};

// Función para obtener rango de semana actual según tu fecha de inicio (6 de enero 2026)
const getCurrentWeekRange = () => {
  const hoy = new Date();
  const fechaInicioSistema = new Date(2026, 0, 6); // 6 de enero de 2026 (mes 0 = enero)
  
  // Si la fecha actual es anterior al 6 de enero 2026
  if (hoy < fechaInicioSistema) {
    return {
      start: '06/01/2026',
      end: '10/01/2026'
    };
  }
  
  const diaSemana = hoy.getDay();
  
  // Calcular días desde el último lunes
  let diasDesdeLunes;
  if (diaSemana === 0) { // Domingo
    diasDesdeLunes = 6; // Retroceder al lunes anterior
  } else if (diaSemana === 1) { // Lunes
    diasDesdeLunes = 0; // Ya es lunes
  } else {
    diasDesdeLunes = diaSemana - 1; // Martes(2) -> 1, etc.
  }
  
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diasDesdeLunes);
  
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);
  
  // Formatear fechas
  const formatDate = (date) => {
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
  };
  
  return {
    start: formatDate(lunes),
    end: formatDate(viernes)
  };
};

const [availableDates, setAvailableDates] = useState([]);
const [loadingDates, setLoadingDates] = useState(false);

// Función para cargar fechas disponibles
const fetchAvailableDates = async () => {
  setLoadingDates(true);
  try {
    console.log('📅 Cargando fechas disponibles...');
    const response = await fetch('/api/fechas-disponibles');
    
    if (response.ok) {
      const dates = await response.json();
      console.log(`✅ ${dates.length} fechas cargadas`);
      setAvailableDates(dates);
    } else {
      console.error('❌ Error cargando fechas');
      setAvailableDates([]);
    }
  } catch (error) {
    console.error('❌ Error en fetchAvailableDates:', error);
    setAvailableDates([]);
  } finally {
    setLoadingDates(false);
  }
};

// Luego en tu useEffect, usa:
useEffect(() => {
  fetchDataFromDB();
  fetchEmployees();
  fetchAvailableDates();
  
  // Cargar observaciones
  fetchObservaciones();
  
  // Obtener rango de semana actual (LUNES a VIERNES)
  const weekRange = getCurrentWeekRange();
  console.log('📅 Rango de semana actual:', weekRange);
  setWeekRange(weekRange);
  fetchWeeklyData(weekRange.start, weekRange.end);
  
  // Actualizar automáticamente cada 30 segundos
  const interval = setInterval(fetchDataFromDB, 30000);
  return () => clearInterval(interval);
}, []);

  // Función para verificar si un empleado registró antes de las 9:00 AM
  const checkAttendanceBefore9AM = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return false;
    
    const today = getCurrentJaliscoDate();
    
    for (const record of attendanceRecords) {
      const recordDate = new Date(record.marca_tiempo || record.timestamp);
      const recordDateStr = convertToJaliscoDateString(recordDate);
      
      // Verificar si es hoy
      if (recordDateStr === today) {
        const recordHour = new Date(recordDate.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000)).getUTCHours();
        
        // Verificar si es antes de las 9:00 AM
        if (recordHour < 9) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Función para obtener el tipo de registro (entrada/salida) de hoy
  const getTodayAttendanceType = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 'Sin registro';
    
    const today = getCurrentJaliscoDate();
    const todayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.marca_tiempo || record.timestamp);
      const recordDateStr = convertToJaliscoDateString(recordDate);
      return recordDateStr === today;
    });
    
    if (todayRecords.length === 0) return 'Sin registro';
    
    // Obtener el último registro de hoy
    const latestRecord = todayRecords.reduce((latest, current) => {
      return new Date(current.marca_tiempo || current.timestamp) > 
             new Date(latest.marca_tiempo || latest.timestamp) ? current : latest;
    });
    
    return latestRecord.tipo_registro || latestRecord.type || 'entrada';
  };

  // Función para obtener la hora del último registro de hoy
  const getTodayLastAttendanceTime = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return '';
    
    const today = getCurrentJaliscoDate();
    const todayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.marca_tiempo || record.timestamp);
      const recordDateStr = convertToJaliscoDateString(recordDate);
      return recordDateStr === today;
    });
    
    if (todayRecords.length === 0) return '';
    
    const latestRecord = todayRecords.reduce((latest, current) => {
      return new Date(current.marca_tiempo || current.timestamp) > 
             new Date(latest.marca_tiempo || latest.timestamp) ? current : latest;
    });
    
    const recordDate = new Date(latestRecord.marca_tiempo || latestRecord.timestamp);
    const fechaJalisco = new Date(recordDate.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const hora = fechaJalisco.getUTCHours().toString().padStart(2, '0');
    const minutos = fechaJalisco.getUTCMinutes().toString().padStart(2, '0');
    
    return `${hora}:${minutos}`;
  };

  // NUEVA FUNCIÓN: Cargar observaciones
  const fetchObservaciones = async () => {
    try {
      const response = await fetch('/api/observaciones');
      if (response.ok) {
        const data = await response.json();
        
        // Convertir array a objeto por employeeId
        const observacionesObj = {};
        data.forEach(obs => {
          observacionesObj[obs.employeeId] = obs.text;
        });
        
        setObservaciones(observacionesObj);
      }
    } catch (error) {
      console.error('Error cargando observaciones:', error);
    }
  };

  // NUEVA FUNCIÓN: Guardar observación
  const saveObservacion = async (employeeId, text) => {
    setSavingObservacion(prev => ({ ...prev, [employeeId]: true }));
    
    try {
      const response = await fetch('/api/observaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId,
          text: text,
          date: new Date().toISOString(),
          adminId: 'admin'
        }),
      });
      
      if (response.ok) {
        setObservaciones(prev => ({
          ...prev,
          [employeeId]: text
        }));
        
        // Limpiar input
        setObservacionInput(prev => ({
          ...prev,
          [employeeId]: ''
        }));
        
        alert('Observación guardada exitosamente');
      } else {
        alert('Error al guardar observación');
      }
    } catch (error) {
      console.error('Error guardando observación:', error);
      alert('Error de conexión al guardar observación');
    } finally {
      setSavingObservacion(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  // Función para cargar datos semanales - VERSIÓN MEJORADA
const fetchWeeklyData = async (startDate, endDate) => {
  setWeeklyLoading(true);
  try {
    console.log('📅 Solicitando datos semanales para:', { startDate, endDate });
    
    // Usar fetch con manejo de errores mejorado
    const response = await fetch(`/api/asistencias-semana?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Datos semanales recibidos:', {
      cantidad: data.length,
      primerEmpleado: data[0]?.nombre,
      fechaInicio: data[0]?.fechas?.viernes,
      fechaFin: data[0]?.fechas?.jueves
    });
    
    // Filtrar solo empleados activos si es necesario
    const activeEmployees = employees.filter(emp => emp.activo);
    const filteredData = data.filter(item => 
      activeEmployees.some(emp => emp.nombre_completo === item.nombre)
    );
    
    console.log('👥 Empleados activos en semana:', filteredData.length);
    setWeeklyData(filteredData.length > 0 ? filteredData : data);
    
  } catch (error) {
    console.error('❌ Error cargando datos semanales:', error);
    alert('Error al cargar datos semanales: ' + error.message);
    setWeeklyData([]);
  } finally {
    setWeeklyLoading(false);
  }
};

// Función para generar datos de ejemplo (solo desarrollo)
const generateSampleWeeklyData = (startDate, endDate) => {
  const sampleEmployees = [
    { id: '001', nombre: 'Juan Pérez', area: 'Ventas', departamento: 'Comercial' },
    { id: '002', nombre: 'María García', area: 'IT', departamento: 'Sistemas' },
    { id: '003', nombre: 'Carlos López', area: 'RH', departamento: 'Reclutamiento' },
    { id: '004', nombre: 'Ana Martínez', area: 'Finanzas', departamento: 'Contabilidad' },
    { id: '005', nombre: 'Pedro Sánchez', area: 'Producción', departamento: 'Manufactura' },
  ];
  
  return sampleEmployees.map(emp => ({
    ...emp,
    lunes: Math.random() > 0.3 ? 'X' : '',
    martes: Math.random() > 0.3 ? 'X' : '',
    miercoles: Math.random() > 0.3 ? 'X' : '',
    jueves: Math.random() > 0.3 ? 'X' : '',
    viernes: Math.random() > 0.3 ? 'X' : '',
    faltas: Math.floor(Math.random() * 3),
    fechas: {
      lunes: startDate,
      martes: startDate,
      miercoles: startDate,
      jueves: startDate,
      viernes: endDate,
    },
    esFuturo: {
      lunes: false,
      martes: false,
      miercoles: false,
      jueves: false,
      viernes: false,
    },
    esInactivo: {
      lunes: false,
      martes: false,
      miercoles: false,
      jueves: false,
      viernes: false,
    }
  }));
};

  // Función para cargar datos de verificación de asistencia (MODIFICADA)
  const fetchAttendanceCheckData = async () => {
    setAttendanceCheckLoading(true);
    try {
      const activeEmployees = employees.filter(emp => emp.activo);
      
      const today = getCurrentJaliscoDate();
      const response = await fetch(`/api/asistencias?fecha=${today}&limite=500`);
      
      if (response.ok) {
        const todayAttendance = await response.json();
        
        const checkData = activeEmployees.map(employee => {
          const employeeTodayRecords = todayAttendance.filter(record => 
            record.numero_empleado === employee.numero_empleado
          );
          
          const attendedToday = employeeTodayRecords.length > 0;
          const before9AM = checkAttendanceBefore9AM(employeeTodayRecords);
          const attendanceType = getTodayAttendanceType(employeeTodayRecords);
          const lastTime = getTodayLastAttendanceTime(employeeTodayRecords);
          
          return {
            id: employee.numero_empleado,
            name: employee.nombre_completo,
            area: employee.area,
            departamento: employee.departamento || '',
            attendedToday,
            before9AM,
            attendanceType,
            lastTime,
            records: employeeTodayRecords
          };
        });
        
        checkData.sort((a, b) => a.name.localeCompare(b.name));
        setAttendanceCheckData(checkData);
      } else {
        const checkData = activeEmployees.map(employee => ({
          id: employee.numero_empleado,
          name: employee.nombre_completo,
          area: employee.area,
          departamento: employee.departamento || '',
          attendedToday: false,
          before9AM: false,
          attendanceType: 'Sin registro',
          lastTime: '',
          records: []
        }));
        
        setAttendanceCheckData(checkData);
      }
    } catch (error) {
      console.error('Error fetching attendance check data:', error);
      const activeEmployees = employees.filter(emp => emp.activo);
      const checkData = activeEmployees.map(employee => ({
        id: employee.numero_empleado,
        name: employee.nombre_completo,
        area: employee.area,
        departamento: employee.departamento || '',
        attendedToday: false,
        before9AM: false,
        attendanceType: 'Sin registro',
        lastTime: '',
        records: []
      }));
      
      setAttendanceCheckData(checkData);
    } finally {
      setAttendanceCheckLoading(false);
    }
  };

  // Obtener datos de MongoDB
  // En fetchDataFromDB, después de cargar los datos, actualiza las fechas
const fetchDataFromDB = async () => {
  setRefreshing(true);
  setDbStatus('conectando');
  
  try {
    console.log('🔄 Iniciando carga de datos desde MongoDB...');
    
    // Obtener estadísticas desde la API
    const statsResponse = await fetch('/api/estadisticas');
    
    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error('❌ Error en estadísticas:', statsResponse.status, errorText);
      
      // Intentar conectar directamente a las APIs individuales
      await fetchDirectAPIs();
      return;
    }
    
    const statsData = await statsResponse.json();
    console.log('📊 Datos de estadísticas:', statsData);
    
    // Verificar si hay un error en los datos
    if (statsData.error) {
      console.warn('⚠️ Estadísticas con error:', statsData.error);
      setStats({
        total_empleados: statsData.total_empleados || 0,
        empleados_activos: statsData.empleados_activos || 0,
        total_asistencias: statsData.total_asistencias || 0,
        asistencias_hoy: statsData.asistencias_hoy || 0,
        empleados_unicos_hoy: statsData.empleados_unicos_hoy || 0,
        registros_por_area: statsData.registros_por_area || {}
      });
    } else {
      setStats(statsData);
    }
    
    // Obtener registros de asistencia con filtros
    const params = new URLSearchParams();
    if (searchTerm) params.append('buscar', searchTerm);
    if (dateFilter) params.append('fecha', dateFilter);
    params.append('limite', '1000');
    
    const attendanceResponse = await fetch(`/api/asistencias?${params}`);
    
    if (!attendanceResponse.ok) {
      console.error('❌ Error en asistencias:', attendanceResponse.status);
      setAttendanceData([]);
    } else {
      const attendanceData = await attendanceResponse.json();
      console.log(`📝 ${attendanceData.length} registros cargados`);
      
      const processedData = attendanceData.map(record => ({
        ...record,
        employeeId: record.numero_empleado || '',
        employeeName: record.nombre_empleado || '',
        date: record.fecha || '',
        time: record.hora || '',
        timestamp: record.marca_tiempo || new Date().toISOString(),
        department: record.area_empleado || '',
        type: record.tipo_registro || 'entrada'
      }));
      
      setAttendanceData(processedData);
    }
    
    // ACTUALIZAR LA LISTA DE FECHAS DISPONIBLES
    await fetchAvailableDates();
    
    setLastUpdated(new Date());
    setDbStatus('conectado');
    
  } catch (error) {
    console.error('❌ Error fetching data from MongoDB:', error);
    setDbStatus('error');
    
    setStats({
      total_empleados: 0,
      empleados_activos: 0,
      total_asistencias: 0,
      asistencias_hoy: 0,
      empleados_unicos_hoy: 0,
      registros_por_area: {}
    });
    
    setAttendanceData([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Función alternativa para conectar a APIs directamente si /api/estadisticas falla
  const fetchDirectAPIs = async () => {
    try {
      console.log('🔄 Intentando conexión directa a APIs...');
      
      // Obtener empleados
      const empleadosResponse = await fetch('/api/empleados');
      let total_empleados = 0;
      let empleados_activos = 0;
      
      if (empleadosResponse.ok) {
        const empleados = await empleadosResponse.json();
        total_empleados = empleados.length;
        empleados_activos = empleados.filter(emp => emp.activo).length;
        setEmployees(empleados);
      }
      
      // Obtener asistencias
      const asistenciasResponse = await fetch('/api/asistencias?limite=1000');
      let total_asistencias = 0;
      let asistencias_hoy = 0;
      let empleados_unicos_hoy = new Set();
      
      if (asistenciasResponse.ok) {
        const asistencias = await asistenciasResponse.json();
        total_asistencias = asistencias.length;
        
        const today = getCurrentJaliscoDate();
        const asistenciasHoy = asistencias.filter(a => a.fecha === today);
        asistencias_hoy = asistenciasHoy.length;
        
        asistenciasHoy.forEach(a => {
          if (a.numero_empleado) {
            empleados_unicos_hoy.add(a.numero_empleado);
          }
        });
        
        setAttendanceData(asistencias);
      }
      
      // Establecer estadísticas
      setStats({
        total_empleados,
        empleados_activos,
        total_asistencias,
        asistencias_hoy,
        empleados_unicos_hoy: empleados_unicos_hoy.size,
        registros_por_area: {}
      });
      
      setLastUpdated(new Date());
      setDbStatus('conectado');
      
    } catch (error) {
      console.error('❌ Error en conexión directa:', error);
      setDbStatus('error');
    }
  };

  // Cargar empleados (MODIFICADA para ordenar por departamento)
  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Empleados cargados:', data.length);
        
        const sortedEmployees = data.sort((a, b) => {
          if (a.departamento < b.departamento) return -1;
          if (a.departamento > b.departamento) return 1;
          return parseInt(a.numero_empleado) - parseInt(b.numero_empleado);
        });
        
        setEmployees(sortedEmployees);
      } else {
        console.error('Error al cargar empleados:', response.status);
      }
    } catch (error) {
      console.error('Error al cargar empleados:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchDataFromDB();
    fetchEmployees();
    
    // Cargar observaciones
    fetchObservaciones();
    
    // Calcular semana actual (jueves a jueves)
    const weekStart = getWeekStartDate();
    const weekEnd = getWeekEndDate();
    setWeekRange({ start: weekStart, end: weekEnd });
    fetchWeeklyData(weekStart, weekEnd);
    
    // Actualizar automáticamente cada 30 segundos
    const interval = setInterval(fetchDataFromDB, 30000);
    return () => clearInterval(interval);
  }, []);

  // Actualizar datos de verificación cuando cambian empleados o asistencias
  useEffect(() => {
    if (employees.length > 0 && !employeesLoading) {
      fetchAttendanceCheckData();
    }
  }, [employees, employeesLoading, attendanceData]);

  // Cerrar menús desplegables al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportCheckMenuRef.current && !exportCheckMenuRef.current.contains(event.target)) {
        const menu = document.getElementById('export-check-menu');
        if (menu) menu.classList.add('hidden');
      }
      if (exportAttendanceMenuRef.current && !exportAttendanceMenuRef.current.contains(event.target)) {
        const menu = document.getElementById('export-attendance-menu');
        if (menu) menu.classList.add('hidden');
      }
      if (exportEmployeesMenuRef.current && !exportEmployeesMenuRef.current.contains(event.target)) {
        const menu = document.getElementById('export-employees-menu');
        if (menu) menu.classList.add('hidden');
      }
      if (exportWeeklyMenuRef.current && !exportWeeklyMenuRef.current.contains(event.target)) {
        const menu = document.getElementById('export-weekly-menu');
        if (menu) menu.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ============ FUNCIONES DE PAGINACIÓN ============

  // Función para obtener datos paginados de una tabla
  const getPaginatedData = (data, currentPage, itemsPerPage = ITEMS_PER_PAGE) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Función para calcular el total de páginas
  const getTotalPages = (data, itemsPerPage = ITEMS_PER_PAGE) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Función para cambiar de página
  const goToPage = (page, setPageFunction, totalPages) => {
    if (page >= 1 && page <= totalPages) {
      setPageFunction(page);
    }
  };

  // Función para renderizar controles de paginación
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    dataLength,
    itemsPerPage = ITEMS_PER_PAGE 
  }) => {
    if (totalPages <= 1) return null;

    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, dataLength);

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-gray-200 bg-white">
        <div className="mb-2 sm:mb-0">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{startItem}</span> a <span className="font-medium">{endItem}</span> de{' '}
            <span className="font-medium">{dataLength}</span> resultados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`p-1 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Primera página"
          >
            <ChevronDoubleLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-1 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Página anterior"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="text-gray-500">...</span>
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-1 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Página siguiente"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`p-1 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Última página"
          >
            <ChevronDoubleRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // ============ FUNCIONES DE EXPORTACIÓN ============

  // Función para exportar a CSV todas las asistencias
  const exportAllToCSV = () => {
  try {
    // Encabezado informativo
    const headerInfo = [
      ['REPORTE DE ASISTENCIAS - SISTEMA DE CONTROL'],
      [`Generado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`],
      [`Zona horaria: Jalisco (UTC-6)`],
      [`Total de registros: ${filteredData.length}`],
      [`Empleados únicos: ${new Set(filteredData.map(r => r.numero_empleado)).size}`],
      searchTerm ? [`Filtro de búsqueda: "${searchTerm}"`] : [''],
      dateFilter ? [`Filtro de fecha: ${dateFilter}`] : ['Periodo: Todas las fechas'],
      [''] // Línea en blanco
    ];

    // Encabezados de columnas
    const headers = [
      'ID REGISTRO',
      'N° EMPLEADO', 
      'NOMBRE COMPLETO', 
      'ÁREA/DEPARTAMENTO', 
      'SUB-DEPARTAMENTO', 
      'FECHA REGISTRO', 
      'HORA REGISTRO', 
      'TIPO DE REGISTRO',
      'ESTATUS'
    ];
    
    // Preparar datos con formato
    const csvData = filteredData.map((row, index) => {
      const tipo = row.tipo_registro || row.type || 'entrada';
      const fecha = row.fecha || row.date || '';
      const hora = row.hora || row.time || '';
      
      return [
        `REG-${index + 1}`,
        row.numero_empleado || row.employeeId || 'N/A',
        `"${row.nombre_empleado || row.employeeName || 'SIN NOMBRE'}"`,
        `"${row.area_empleado || row.department || 'NO ESPECIFICADO'}"`,
        `"${row.departamento || 'NO ESPECIFICADO'}"`,
        fecha,
        hora,
        tipo.toUpperCase(),
        tipo === 'entrada' ? 'ENTRADA REGISTRADA' : 'SALIDA REGISTRADA'
      ];
    });

    // Pie de página
    const footerInfo = [
      [''],
      ['RESUMEN ESTADÍSTICO:'],
      [`- Total registros de entrada: ${filteredData.filter(r => (r.tipo_registro || r.type) === 'entrada').length}`],
      [`- Total registros de salida: ${filteredData.filter(r => (r.tipo_registro || r.type) === 'salida').length}`],
      [`- Proporción entrada/salida: ${filteredData.length > 0 ? 
        ((filteredData.filter(r => (r.tipo_registro || r.type) === 'entrada').length / filteredData.length) * 100).toFixed(1) + '%' : '0%'}`],
      [''],
      ['NOTAS:'],
      ['1. Este reporte fue generado automáticamente por el Sistema de Control de Asistencias'],
      ['2. Los datos están en formato 24 horas (zona horaria Jalisco)'],
      ['3. Para consultas, contacte al departamento de Recursos Humanos']
    ];

    // Construir contenido completo
    const csvContent = [
      ...headerInfo.map(row => row.join(',')),
      headers.join(','),
      ...csvData.map(row => row.join(',')),
      ...footerInfo.map(row => row.join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Nombre del archivo con fecha y hora
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    let filename = `Reporte_Asistencias_Completo_${timestamp}`;
    
    if (dateFilter) {
      filename = `Reporte_Asistencias_${dateFilter.replace(/\//g,'-')}_${timestamp}`;
    } else if (searchTerm) {
      const termShort = searchTerm.substring(0, 15).replace(/\s+/g, '_');
      filename = `Reporte_Asistencias_Busqueda_${termShort}_${timestamp}`;
    }
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostrar notificación de éxito
    showNotification(`✅ CSV exportado exitosamente (${filteredData.length} registros)`, 'success');
    
  } catch (error) {
    console.error('Error exportando CSV:', error);
    showNotification('❌ Error al exportar el archivo CSV', 'error');
  }
};


  // Función para exportar a PDF todas las asistencias
  const exportAllToPDF = async () => {
  try {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    // Crear elemento HTML para el PDF con diseño profesional
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      background: white;
      padding: 30px;
      font-family: 'Arial', 'Helvetica', sans-serif;
    `;
    
    // Generar contenido HTML con diseño
    pdfContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px;">
        <h1 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 28px;">
          📊 REPORTE DE ASISTENCIAS
        </h1>
        <h2 style="color: #3498db; margin: 0 0 15px 0; font-size: 18px; font-weight: normal;">
          Sistema de Control de Asistencia
        </h2>
        <div style="display: flex; justify-content: center; gap: 30px; font-size: 12px; color: #7f8c8d;">
          <div style="text-align: center;">
            <div style="font-weight: bold; color: #2c3e50;">Fecha de generación</div>
            <div>${new Date().toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div>${new Date().toLocaleTimeString('es-MX')}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold; color: #2c3e50;">Zona horaria</div>
            <div>Jalisco (UTC-6)</div>
            <div>Hora actual: ${getCurrentJaliscoTime()}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold; color: #2c3e50;">Total registros</div>
            <div style="font-size: 24px; color: #27ae60; font-weight: bold;">${filteredData.length}</div>
          </div>
        </div>
      </div>
      
      ${searchTerm || dateFilter ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
          <div style="font-weight: bold; color: #2c3e50; margin-bottom: 5px;">Filtros aplicados:</div>
          ${searchTerm ? `<div>🔍 Búsqueda: <strong>"${searchTerm}"</strong></div>` : ''}
          ${dateFilter ? `<div>📅 Fecha: <strong>${dateFilter}</strong></div>` : ''}
        </div>
      ` : ''}
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #ecf0f1;">
          📋 Resumen estadístico
        </h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
          <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #d4edda, #c3e6cb); border-radius: 8px; border: 1px solid #c3e6cb;">
            <div style="font-size: 12px; color: #155724; margin-bottom: 5px;">Registros de entrada</div>
            <div style="font-size: 24px; font-weight: bold; color: #155724;">
              ${filteredData.filter(r => (r.tipo_registro || r.type) === 'entrada').length}
            </div>
          </div>
          <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #d1ecf1, #bee5eb); border-radius: 8px; border: 1px solid #bee5eb;">
            <div style="font-size: 12px; color: #0c5460; margin-bottom: 5px;">Registros de salida</div>
            <div style="font-size: 24px; font-weight: bold; color: #0c5460;">
              ${filteredData.filter(r => (r.tipo_registro || r.type) === 'salida').length}
            </div>
          </div>
          <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #fff3cd, #ffeaa7); border-radius: 8px; border: 1px solid #ffeaa7;">
            <div style="font-size: 12px; color: #856404; margin-bottom: 5px;">Empleados únicos</div>
            <div style="font-size: 24px; font-weight: bold; color: #856404;">
              ${new Set(filteredData.map(r => r.numero_empleado)).size}
            </div>
          </div>
          <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #f8d7da, #f5c6cb); border-radius: 8px; border: 1px solid #f5c6cb;">
            <div style="font-size: 12px; color: #721c24; margin-bottom: 5px;">Porcentaje entradas</div>
            <div style="font-size: 24px; font-weight: bold; color: #721c24;">
              ${filteredData.length > 0 ? 
                ((filteredData.filter(r => (r.tipo_registro || r.type) === 'entrada').length / filteredData.length) * 100).toFixed(1) + '%' : 
                '0%'}
            </div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #ecf0f1;">
          📊 Detalle de registros
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #2c3e50, #34495e); color: white;">
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">N° EMPLEADO</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">NOMBRE</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">ÁREA</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">DEPTO.</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">FECHA</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">HORA</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">TIPO</th>
              <th style="border: 1px solid #34495e; padding: 12px 8px; text-align: left; font-weight: 600;">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.slice(0, 100).map((row, index) => {
              const tipo = row.tipo_registro || row.type || 'entrada';
              const isEntrada = tipo === 'entrada';
              
              return `
                <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : 'background-color: #ffffff;'}">
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px; font-weight: 600; color: #2c3e50;">
                    ${row.numero_empleado || row.employeeId || 'N/A'}
                  </td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">${row.nombre_empleado || row.employeeName || ''}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">${row.area_empleado || row.department || ''}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">${row.departamento || '-'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px; font-weight: 600;">${row.fecha || row.date || ''}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px; font-family: 'Courier New', monospace;">${row.hora || row.time || ''}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">
                    <span style="
                      display: inline-block;
                      padding: 3px 10px;
                      border-radius: 20px;
                      font-size: 10px;
                      font-weight: 600;
                      ${isEntrada ? 
                        'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                        'background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
                      }
                    ">
                      ${tipo.toUpperCase()}
                    </span>
                  </td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">
                    <span style="
                      display: inline-block;
                      padding: 3px 8px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: 600;
                      ${isEntrada ? 
                        'background-color: #28a745; color: white;' : 
                        'background-color: #17a2b8; color: white;'
                      }
                    ">
                      ${isEntrada ? 'ENTRADA' : 'SALIDA'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
            
            ${filteredData.length > 100 ? `
              <tr style="background-color: #e9ecef;">
                <td colspan="8" style="border: 1px solid #dee2e6; padding: 15px; text-align: center; font-weight: 600; color: #6c757d;">
                  ... y ${filteredData.length - 100} registros más (total: ${filteredData.length})
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ecf0f1; font-size: 10px; color: #7f8c8d;">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">INFORMACIÓN DEL SISTEMA</div>
            <div>Sistema de Control de Asistencias v2.0</div>
            <div>Base de datos: MongoDB</div>
            <div>Última sincronización: ${lastUpdated ? formatDateTime(lastUpdated) : 'N/A'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; margin-bottom: 5px;">PÁGINA 1 DE 1</div>
            <div>Generado automáticamente</div>
            <div>${new Date().toLocaleDateString('es-MX')}</div>
            <div>© ${new Date().getFullYear()} - Sistema de Control</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(pdfContainer);
    
    // Configurar html2canvas
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Crear PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Nombre del archivo
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `Reporte_Asistencias_${timestamp}`;
    if (dateFilter) {
      filename = `Reporte_Asistencias_${dateFilter.replace(/\//g, '-')}`;
    } else if (searchTerm) {
      const termShort = searchTerm.substring(0, 10).replace(/\s+/g, '_');
      filename = `Reporte_Asistencias_${termShort}`;
    }
    
    pdf.save(`${filename}.pdf`);
    document.body.removeChild(pdfContainer);
    
    showNotification(`✅ PDF exportado exitosamente (${filteredData.length} registros)`, 'success');
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showNotification('❌ Error al exportar el archivo PDF', 'error');
  }
};

  // Exportar empleados a CSV (MODIFICADO)
  const exportEmployeesToCSV = () => {
  try {
    const headerInfo = [
      ['REPORTE DE EMPLEADOS - SISTEMA DE CONTROL'],
      [`Generado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`],
      [`Total empleados: ${employees.length}`],
      [`Empleados activos: ${employees.filter(e => e.activo).length}`],
      [`Empleados inactivos: ${employees.filter(e => !e.activo).length}`],
      ['']
    ];

    const headers = [
      'N° EMPLEADO',
      'NOMBRE COMPLETO', 
      'ÁREA/DPTO PRINCIPAL', 
      'SUB-DEPARTAMENTO', 
      'ESTADO',
      'FECHA DE ALTA',
      'ÚLTIMA ACTUALIZACIÓN'
    ];
    
    const csvData = employees.map(emp => {
      return [
        emp.numero_empleado,
        `"${emp.nombre_completo}"`,
        `"${emp.area}"`,
        `"${emp.departamento || 'NO ESPECIFICADO'}"`,
        emp.activo ? 'ACTIVO' : 'INACTIVO',
        'S/D', // Fecha de alta (si la tuvieras en tus datos)
        new Date().toLocaleDateString('es-MX')
      ];
    });

    const footerInfo = [
      [''],
      ['DISTRIBUCIÓN POR ÁREAS:'],
      ...Object.entries(
        employees.reduce((acc, emp) => {
          acc[emp.area] = (acc[emp.area] || 0) + 1;
          return acc;
        }, {})
      ).map(([area, count]) => [`- ${area}: ${count} empleados (${((count/employees.length)*100).toFixed(1)}%)`])
    ];

    const csvContent = [
      ...headerInfo.map(row => row.join(',')),
      headers.join(','),
      ...csvData.map(row => row.join(',')),
      ...footerInfo.map(row => row.join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Empleados_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`✅ Empleados exportados (${employees.length} registros)`, 'success');
  } catch (error) {
    console.error('Error exportando empleados:', error);
    showNotification('❌ Error al exportar empleados', 'error');
  }
};

  // Función para exportar empleados a PDF (MODIFICADO)
  const exportEmployeesToPDF = async () => {
  try {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      background: white;
      padding: 30px;
      font-family: 'Arial', 'Helvetica', sans-serif;
    `;
    
    // Calcular estadísticas
    const activos = employees.filter(e => e.activo).length;
    const inactivos = employees.filter(e => !e.activo).length;
    
    // Agrupar por área
    const porArea = employees.reduce((acc, emp) => {
      acc[emp.area] = (acc[emp.area] || 0) + 1;
      return acc;
    }, {});
    
    pdfContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 20px;">
        <h1 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 28px;">
          👥 DIRECTORIO DE EMPLEADOS
        </h1>
        <h2 style="color: #3498db; margin: 0 0 15px 0; font-size: 18px; font-weight: normal;">
          Sistema de Control de Asistencia
        </h2>
        <div style="display: flex; justify-content: center; gap: 40px; font-size: 12px; color: #7f8c8d; margin-top: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 32px; color: #27ae60; font-weight: bold;">${employees.length}</div>
            <div style="font-weight: bold; color: #2c3e50;">Total empleados</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; color: #2ecc71; font-weight: bold;">${activos}</div>
            <div style="font-weight: bold; color: #2c3e50;">Activos</div>
            <div>${((activos/employees.length)*100).toFixed(1)}%</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; color: #e74c3c; font-weight: bold;">${inactivos}</div>
            <div style="font-weight: bold; color: #2c3e50;">Inactivos</div>
            <div>${((inactivos/employees.length)*100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #ecf0f1;">
          📈 Distribución por áreas
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
          ${Object.entries(porArea).map(([area, count]) => `
            <div style="
              padding: 12px;
              background: linear-gradient(135deg, #f8f9fa, #e9ecef);
              border-radius: 8px;
              border-left: 4px solid #3498db;
            ">
              <div style="font-size: 14px; font-weight: 600; color: #2c3e50; margin-bottom: 5px;">
                ${area}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 24px; font-weight: bold; color: #2980b9;">
                  ${count}
                </div>
                <div style="font-size: 12px; color: #7f8c8d;">
                  ${((count/employees.length)*100).toFixed(1)}%
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #ecf0f1;">
          📋 Lista completa de empleados
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #3498db, #2980b9); color: white;">
              <th style="border: 1px solid #2980b9; padding: 12px 8px; text-align: left; font-weight: 600;">N° EMPLEADO</th>
              <th style="border: 1px solid #2980b9; padding: 12px 8px; text-align: left; font-weight: 600;">NOMBRE COMPLETO</th>
              <th style="border: 1px solid #2980b9; padding: 12px 8px; text-align: left; font-weight: 600;">ÁREA</th>
              <th style="border: 1px solid #2980b9; padding: 12px 8px; text-align: left; font-weight: 600;">DEPARTAMENTO</th>
              <th style="border: 1px solid #2980b9; padding: 12px 8px; text-align: left; font-weight: 600;">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            ${employees.slice(0, 50).map((emp, index) => {
              const isActivo = emp.activo;
              return `
                <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : 'background-color: #ffffff;'}">
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px; font-weight: 600; color: #2c3e50;">
                    ${emp.numero_empleado}
                  </td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">${emp.nombre_completo}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">${emp.area}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">${emp.departamento || '-'}</td>
                  <td style="border: 1px solid #dee2e6; padding: 10px 8px;">
                    <span style="
                      display: inline-block;
                      padding: 4px 12px;
                      border-radius: 20px;
                      font-size: 10px;
                      font-weight: 600;
                      ${isActivo ? 
                        'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                        'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
                      }
                    ">
                      ${isActivo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
            
            ${employees.length > 50 ? `
              <tr style="background-color: #e9ecef;">
                <td colspan="5" style="border: 1px solid #dee2e6; padding: 15px; text-align: center; font-weight: 600; color: #6c757d;">
                  ... y ${employees.length - 50} empleados más (total: ${employees.length})
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: 40px; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; font-size: 11px;">
        <div style="font-weight: bold; color: #2c3e50; margin-bottom: 10px;">ℹ️ Información del reporte</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <div style="font-weight: 600; color: #495057;">Fecha de generación:</div>
            <div>${new Date().toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} ${new Date().toLocaleTimeString('es-MX')}</div>
          </div>
          <div>
            <div style="font-weight: 600; color: #495057;">Área con más empleados:</div>
            <div>${Object.entries(porArea).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A'} 
            (${Object.entries(porArea).sort((a,b) => b[1]-a[1])[0]?.[1] || 0} empleados)</div>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ecf0f1; font-size: 10px; color: #7f8c8d; text-align: center;">
        <div>Página 1 de 1 • Generado automáticamente por Sistema de Control de Asistencias</div>
        <div style="margin-top: 5px;">© ${new Date().getFullYear()} - Departamento de Recursos Humanos</div>
      </div>
    `;
    
    document.body.appendChild(pdfContainer);
    
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
    
    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`Directorio_Empleados_${timestamp}.pdf`);
    
    document.body.removeChild(pdfContainer);
    
    showNotification(`✅ Directorio de empleados exportado (${employees.length} registros)`, 'success');
    
  } catch (error) {
    console.error('Error exportando empleados a PDF:', error);
    showNotification('❌ Error al exportar empleados a PDF', 'error');
  }
};

  // Exportar verificación de asistencia a CSV (MODIFICADO)
  const exportAttendanceCheckToCSV = () => {
  try {
    const headerInfo = [
      ['VERIFICACIÓN DE ASISTENCIA - REPORTE DIARIO'],
      [`Fecha de verificación: ${currentDate}`],
      [`Generado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`],
      [`Hora de corte: 9:00 AM (Jalisco)`],
      [`Total empleados activos: ${attendanceCheckData.length}`],
      ['']
    ];

    const headers = [
      'N° EMPLEADO',
      'NOMBRE COMPLETO', 
      'ÁREA', 
      'DEPARTAMENTO', 
      'ASISTIÓ HOY',
      'REGISTRÓ ANTES DE 9:00 AM',
      'TIPO DE REGISTRO',
      'HORA ÚLTIMO REGISTRO',
      'OBSERVACIONES',
      'ESTATUS GENERAL'
    ];
    
    const csvData = attendanceCheckData.map(employee => {
      const asistioHoy = employee.attendedToday ? 'SÍ' : 'NO';
      const antes9AM = employee.before9AM ? 'SÍ' : 'NO';
      const estatus = employee.attendedToday ? 
        (employee.before9AM ? 'EN HORA' : 'REGISTRÓ TARDE') : 
        'SIN REGISTRO';
      
      return [
        employee.id,
        `"${employee.name}"`,
        `"${employee.area}"`,
        `"${employee.departamento}"`,
        asistioHoy,
        antes9AM,
        employee.attendanceType.toUpperCase(),
        employee.lastTime || 'N/A',
        `"${observaciones[employee.id] || 'SIN OBSERVACIONES'}"`,
        estatus
      ];
    });

    const estadisticas = {
      asistieron: attendanceCheckData.filter(e => e.attendedToday).length,
      antes9AM: attendanceCheckData.filter(e => e.before9AM).length,
      sinRegistro: attendanceCheckData.filter(e => !e.attendedToday).length,
      registraronTarde: attendanceCheckData.filter(e => e.attendedToday && !e.before9AM).length
    };

    const footerInfo = [
      [''],
      ['ESTADÍSTICAS DEL DÍA:'],
      [`- Empleados que asistieron: ${estadisticas.asistieron} (${((estadisticas.asistieron/attendanceCheckData.length)*100).toFixed(1)}%)`],
      [`- Asistieron antes de 9:00 AM: ${estadisticas.antes9AM} (${((estadisticas.antes9AM/attendanceCheckData.length)*100).toFixed(1)}%)`],
      [`- Registraron después de 9:00 AM: ${estadisticas.registraronTarde}`],
      [`- Sin registro de asistencia: ${estadisticas.sinRegistro}`],
      [''],
      ['NOTA: Los empleados que no registran antes de las 9:00 AM deben ser notificados']
    ];

    const csvContent = [
      ...headerInfo.map(row => row.join(',')),
      headers.join(','),
      ...csvData.map(row => row.join(',')),
      ...footerInfo.map(row => row.join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `Verificacion_Asistencia_${currentDate.replace(/\//g,'-')}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`✅ Verificación exportada (${attendanceCheckData.length} empleados)`, 'success');
  } catch (error) {
    console.error('Error exportando verificación:', error);
    showNotification('❌ Error al exportar verificación', 'error');
  }
};

  // Función para exportar verificación de asistencia a CSV (todas las fechas) (MODIFICADO)
  const exportAttendanceCheckAllDatesToCSV = async () => {
    try {
      setAttendanceCheckLoading(true);
      
      const response = await fetch('/api/asistencias?limite=5000');
      let allAttendance = [];
      
      if (response.ok) {
        allAttendance = await response.json();
      }
      
      const activeEmployees = employees.filter(emp => emp.activo);
      const checkData = activeEmployees.map(employee => {
        const employeeRecords = allAttendance.filter(record => 
          record.numero_empleado === employee.numero_empleado
        );
        
        const totalRegistros = employeeRecords.length;
        const diasConRegistro = new Set(employeeRecords.map(r => r.fecha || r.date)).size;
        const ultimaAsistencia = employeeRecords.length > 0 
          ? employeeRecords.sort((a, b) => new Date(b.marca_tiempo || b.timestamp) - new Date(a.marca_tiempo || a.timestamp))[0]
          : null;
        
        return {
          id: employee.numero_empleado,
          name: employee.nombre_completo,
          area: employee.area,
          departamento: employee.departamento || '',
          totalRegistros,
          diasConRegistro,
          ultimaFecha: ultimaAsistencia ? (ultimaAsistencia.fecha || ultimaAsistencia.date) : '',
          ultimaHora: ultimaAsistencia ? (ultimaAsistencia.hora || ultimaAsistencia.time) : '',
          ultimoTipo: ultimaAsistencia ? (ultimaAsistencia.tipo_registro || ultimaAsistencia.type) : ''
        };
      });
      
      const headers = ['Número Empleado', 'Nombre', 'Área', 'Departamento', 'Total Registros', 'Días con Registro', 'Última Fecha', 'Última Hora', 'Último Tipo'];
      const csvContent = [
        headers.join(','),
        ...checkData.map(row => [
          row.id,
          `"${row.name}"`,
          `"${row.area}"`,
          `"${row.departamento}"`,
          row.totalRegistros,
          row.diasConRegistro,
          row.ultimaFecha,
          row.ultimaHora,
          row.ultimoTipo
        ].join(','))
      ].join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_asistencia_completo_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setAttendanceCheckLoading(false);
      alert(`Reporte de asistencia exportado exitosamente (${activeEmployees.length} empleados)`);
    } catch (error) {
      console.error('Error exportando reporte completo:', error);
      setAttendanceCheckLoading(false);
      alert('Error al exportar el reporte de asistencia');
    }
  };

  // Función para exportar verificación de asistencia a PDF (todas las fechas) (MODIFICADO)
  const exportAttendanceCheckToPDF = async () => {
    try {
      setAttendanceCheckLoading(true);
      
      const response = await fetch('/api/asistencias?limite=5000');
      let allAttendance = [];
      
      if (response.ok) {
        allAttendance = await response.json();
      }
      
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const activeEmployees = employees.filter(emp => emp.activo);
      const checkData = activeEmployees.map(employee => {
        const employeeRecords = allAttendance.filter(record => 
          record.numero_empleado === employee.numero_empleado
        );
        
        const totalRegistros = employeeRecords.length;
        const diasConRegistro = new Set(employeeRecords.map(r => r.fecha || r.date)).size;
        const ultimaAsistencia = employeeRecords.length > 0 
          ? employeeRecords.sort((a, b) => new Date(b.marca_tiempo || b.timestamp) - new Date(a.marca_tiempo || a.timestamp))[0]
          : null;
        
        return {
          id: employee.numero_empleado,
          name: employee.nombre_completo,
          area: employee.area,
          departamento: employee.departamento || '',
          totalRegistros,
          diasConRegistro,
          ultimaAsistencia
        };
      });
      
      const tableElement = document.createElement('div');
      tableElement.style.position = 'absolute';
      tableElement.style.left = '-9999px';
      tableElement.style.width = '800px';
      
      let tableHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #1f2937; margin-bottom: 10px;">
            Reporte de Asistencia - Todas las Fechas
          </h1>
          <div style="text-align: center; color: #6b7280; margin-bottom: 20px; font-size: 14px;">
            <div>Generado: ${new Date().toLocaleString()}</div>
            <div>Empleados activos: ${activeEmployees.length}</div>
            <div>Registros totales: ${allAttendance.length}</div>
            <div>Período: Todos los registros disponibles</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">N° Empleado</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Nombre</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Área</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Departamento</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Total Registros</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Días con Registro</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Última Asistencia</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      checkData.forEach((employee, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        const ultimaFecha = employee.ultimaAsistencia 
          ? `${employee.ultimaAsistencia.fecha || employee.ultimaAsistencia.date} ${employee.ultimaAsistencia.hora || employee.ultimaAsistencia.time}`
          : 'Sin registros';
        
        tableHTML += `
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${employee.id}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${employee.name}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${employee.area}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${employee.departamento || '-'}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${employee.totalRegistros}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${employee.diasConRegistro}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${ultimaFecha}</td>
          </tr>
        `;
      });
      
      tableHTML += `
            </tbody>
          </table>
          <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
            <h3 style="margin-top: 0; color: #0369a1;">Resumen General</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 12px;">
              <div><strong>Total empleados activos:</strong> ${activeEmployees.length}</div>
              <div><strong>Total registros:</strong> ${allAttendance.length}</div>
              <div><strong>Empleado con más registros:</strong> ${checkData.length > 0 ? Math.max(...checkData.map(e => e.totalRegistros)) : 0}</div>
              <div><strong>Promedio registros por empleado:</strong> ${checkData.length > 0 ? (allAttendance.length / activeEmployees.length).toFixed(1) : 0}</div>
            </div>
          </div>
          <div style="margin-top: 20px; font-size: 11px; color: #6b7280; text-align: right;">
            Página 1 de 1 • Generado por Sistema de Asistencias
          </div>
        </div>
      `;
      
      tableElement.innerHTML = tableHTML;
      document.body.appendChild(tableElement);
      
      const canvas = await html2canvas(tableElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`reporte_asistencia_completo_${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(tableElement);
      
      setAttendanceCheckLoading(false);
      alert(`Reporte de asistencia exportado a PDF exitosamente (${activeEmployees.length} empleados)`);
    } catch (error) {
      console.error('Error exportando verificación a PDF:', error);
      setAttendanceCheckLoading(false);
      alert('Error al exportar el reporte de asistencia a PDF');
    }
  };

  // ============ FUNCIONES DE EXPORTACIÓN PARA TABLA SEMANAL ============
  const exportWeeklyToCSV = () => {
    try {
      const headers = ['Nombre', 'Área', 'Departamento', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Faltas Totales'];
      const csvContent = [
        headers.join(','),
        ...weeklyData.map(row => [
          `"${row.nombre}"`,
          `"${row.area}"`,
          `"${row.departamento || ''}"`,
          row.lunes === 'X' ? 'Presente' : 'Ausente',
          row.martes === 'X' ? 'Presente' : 'Ausente',
          row.miercoles === 'X' ? 'Presente' : 'Ausente',
          row.jueves === 'X' ? 'Presente' : 'Ausente',
          row.viernes === 'X' ? 'Presente' : 'Ausente',
          row.faltas
        ].join(','))
      ].join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_semanal_${weekRange.start.replace(/\//g, '-')}_${weekRange.end.replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Reporte semanal exportado exitosamente');
    } catch (error) {
      console.error('Error exportando reporte semanal:', error);
      alert('Error al exportar reporte semanal');
    }
  };

  const exportWeeklyToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const tableElement = document.createElement('div');
      tableElement.style.position = 'absolute';
      tableElement.style.left = '-9999px';
      tableElement.style.width = '800px';
      
      let tableHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #1f2937; margin-bottom: 10px;">
            Reporte Semanal de Asistencias
          </h1>
          <div style="text-align: center; color: #6b7280; margin-bottom: 20px; font-size: 14px;">
            <div>Período: ${weekRange.start} al ${weekRange.end}</div>
            <div>Generado: ${new Date().toLocaleString()}</div>
            <div>Total empleados: ${weeklyData.length}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Nombre</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Área</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Departamento</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Lunes</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Martes</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Miércoles</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Jueves</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Viernes</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Faltas</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      weeklyData.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        tableHTML += `
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${row.nombre}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${row.area}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">${row.departamento || '-'}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${row.lunes === 'X' ? '#d1fae5' : '#fee2e2'}; color: ${row.lunes === 'X' ? '#065f46' : '#991b1b'};">
                ${row.lunes === 'X' ? '✓' : '✗'}
              </span>
            </td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${row.martes === 'X' ? '#d1fae5' : '#fee2e2'}; color: ${row.martes === 'X' ? '#065f46' : '#991b1b'};">
                ${row.martes === 'X' ? '✓' : '✗'}
              </span>
            </td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${row.miercoles === 'X' ? '#d1fae5' : '#fee2e2'}; color: ${row.miercoles === 'X' ? '#065f46' : '#991b1b'};">
                ${row.miercoles === 'X' ? '✓' : '✗'}
              </span>
            </td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${row.jueves === 'X' ? '#d1fae5' : '#fee2e2'}; color: ${row.jueves === 'X' ? '#065f46' : '#991b1b'};">
                ${row.jueves === 'X' ? '✓' : '✗'}
              </span>
            </td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${row.viernes === 'X' ? '#d1fae5' : '#fee2e2'}; color: ${row.viernes === 'X' ? '#065f46' : '#991b1b'};">
                ${row.viernes === 'X' ? '✓' : '✗'}
              </span>
            </td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
              <span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; border-radius: 50%; background-color: ${row.faltas > 0 ? '#fee2e2' : '#d1fae5'}; color: ${row.faltas > 0 ? '#991b1b' : '#065f46'}; font-weight: bold;">
                ${row.faltas}
              </span>
            </td>
          </tr>
        `;
      });
      
      tableHTML += `
            </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 11px; color: #6b7280; text-align: right;">
            Página 1 de 1 • Generado por Sistema de Asistencias
          </div>
        </div>
      `;
      
      tableElement.innerHTML = tableHTML;
      document.body.appendChild(tableElement);
      
      const canvas = await html2canvas(tableElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`reporte_semanal_${weekRange.start.replace(/\//g, '-')}_${weekRange.end.replace(/\//g, '-')}.pdf`);
      
      document.body.removeChild(tableElement);
      
      alert(`Reporte semanal exportado a PDF exitosamente (${weeklyData.length} empleados)`);
    } catch (error) {
      console.error('Error exportando reporte semanal a PDF:', error);
      alert('Error al exportar reporte semanal a PDF');
    }
  };

  // Función para aplicar filtros
const applyFilters = async (e) => {
  e.preventDefault();
  setCurrentAttendancePage(1);
  
  // Mostrar información de depuración
  console.log('🔍 Aplicando filtros:', {
    fecha: dateFilter,
    busqueda: searchTerm
  });
  
  if (dateFilter) {
    console.log('📅 Verificando si la fecha existe en la lista...');
    const fechaExiste = availableDates.some(f => f.valor === dateFilter);
    console.log(`❓ ¿Fecha ${dateFilter} existe? ${fechaExiste ? 'SÍ' : 'NO'}`);
    
    if (!fechaExiste && availableDates.length > 0) {
      console.log('⚠️ La fecha seleccionada no está en la lista disponible');
      console.log('📋 Fechas disponibles:', availableDates.map(f => f.valor));
      
      // Sugerir la fecha más cercana
      const sugerencia = availableDates[0];
      if (sugerencia && confirm(`La fecha "${dateFilter}" no tiene registros.\n\n¿Desea ver los registros de "${sugerencia.valor}" en su lugar?`)) {
        setDateFilter(sugerencia.valor);
      }
    }
  }
  
  await fetchDataFromDB();
};

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setCurrentAttendancePage(1);
    
    // Recargar la lista de fechas disponibles
    fetchAvailableDates();
    
    // Recargar datos
    fetchDataFromDB();
    
    console.log('🧹 Filtros limpiados');
  };

  // Función para obtener el estado de la base de datos
  const getDbStatus = () => {
    switch (dbStatus) {
      case 'conectado':
        return { color: 'text-green-600', bg: 'bg-green-100', text: 'Conectado' };
      case 'conectando':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Conectando...' };
      case 'error':
        return { color: 'text-red-600', bg: 'bg-red-100', text: 'Error de conexión' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', text: 'Desconectado' };
    }
  };

  // Función para verificar si debe resaltar la fila en rojo
  const shouldHighlightRow = (employee) => {
    const ahora = new Date();
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    const currentHour = fechaJalisco.getUTCHours();
    const currentMinutes = fechaJalisco.getUTCMinutes();
    
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    const deadlineMinutes = 9 * 60;
    
    if (currentTimeInMinutes >= deadlineMinutes) {
      return !employee.attendedToday || !employee.before9AM;
    }
    
    return false;
  };

  // Filtrar datos localmente
  const filteredData = attendanceData.filter(record => {
    const matchesSearch = 
      (record.numero_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.nombre_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.area_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       record.department?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.departamento?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !dateFilter || record.fecha === dateFilter || record.date === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  // Datos paginados para cada tabla
  const paginatedAttendanceData = getPaginatedData(filteredData, currentAttendancePage);
  const paginatedEmployeesData = getPaginatedData(employees, currentEmployeesPage);
  const paginatedCheckData = getPaginatedData(attendanceCheckData, currentCheckPage);
  const paginatedWeeklyData = getPaginatedData(weeklyData, currentWeeklyPage);

  // Total de páginas para cada tabla
  const totalAttendancePages = getTotalPages(filteredData);
  const totalEmployeesPages = getTotalPages(employees);
  const totalCheckPages = getTotalPages(attendanceCheckData);
  const totalWeeklyPages = getTotalPages(weeklyData);

  // Funciones para gestión de empleados (MODIFICADAS)
  const handleEmployeeFormChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEmployeeForm = () => {
    const errors = {};
    
    if (!employeeForm.numero_empleado.trim()) {
      errors.numero_empleado = 'El número de empleado es requerido';
    } else if (!/^\d+$/.test(employeeForm.numero_empleado.trim())) {
      errors.numero_empleado = 'Debe ser un número válido (ej: 1, 2, 3...)';
    } else if (parseInt(employeeForm.numero_empleado) < 1) {
      errors.numero_empleado = 'El número debe ser mayor a 0';
    }
    
    if (!employeeForm.nombre_completo.trim()) errors.nombre_completo = 'El nombre es requerido';
    if (!employeeForm.area.trim()) errors.area = 'El área/departamento es requerido';
    if (!employeeForm.departamento.trim()) errors.departamento = 'El departamento es requerido';
    
    if (employeeForm.isEditing) {
      if (employeeForm.originalId !== employeeForm.numero_empleado) {
        if (employees.some(emp => emp.numero_empleado === employeeForm.numero_empleado)) {
          errors.numero_empleado = 'Este número ya está registrado por otro empleado';
        }
      }
    } else {
      if (employees.some(emp => emp.numero_empleado === employeeForm.numero_empleado)) {
        errors.numero_empleado = 'Este número ya está registrado';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (!validateEmployeeForm()) return;
    
    try {
      const employeeData = {
        numero_empleado: employeeForm.numero_empleado.trim(),
        nombre_completo: employeeForm.nombre_completo.trim(),
        area: employeeForm.area.trim(),
        departamento: employeeForm.departamento.trim(),
        activo: employeeForm.activo === 'Sí'
      };
      
      console.log('📤 Enviando datos del empleado:', employeeData);
      
      let endpoint = '/api/empleados';
      let method = 'POST';
      
      if (employeeForm.isEditing) {
        method = 'PUT';
        employeeData.id = employeeForm.numero_empleado.trim();
        employeeData.id_original = employeeForm.originalId;
      }
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        let message = employeeForm.isEditing 
          ? 'Empleado actualizado exitosamente' 
          : 'Empleado agregado exitosamente';
        
        if (!employeeForm.isEditing && result.numero_generado) {
          message = `Empleado agregado exitosamente con número: ${result.numero_generado}`;
        } else if (employeeForm.isEditing) {
          const changedNumber = employeeForm.numero_empleado !== employeeForm.originalId;
          if (changedNumber) {
            message = `Empleado actualizado exitosamente. Número cambiado de ${employeeForm.originalId} a ${employeeForm.numero_empleado}`;
          } else {
            message = `Empleado actualizado exitosamente (Número: ${employeeForm.numero_empleado})`;
          }
        }
        
        alert(message);
        console.log('✅ Respuesta del servidor:', result);
        
        resetEmployeeForm();
        fetchEmployees();
        fetchDataFromDB();
      } else {
        console.error('❌ Error del servidor:', result);
        alert(result.error || 'Error al guardar empleado');
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert('Error de conexión con el servidor');
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      numero_empleado: employee.numero_empleado,
      nombre_completo: employee.nombre_completo,
      area: employee.area,
      departamento: employee.departamento || '',
      activo: employee.activo ? 'Sí' : 'No',
      originalId: employee.numero_empleado,
      isEditing: true
    });
    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este empleado?')) return;
    
    try {
      const response = await fetch(`/api/empleados?id=${employeeId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        alert('Empleado eliminado exitosamente');
        fetchEmployees();
        fetchDataFromDB();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar empleado');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      numero_empleado: '',
      nombre_completo: '',
      area: '',
      departamento: '',
      activo: 'Sí',
      originalId: '',
      isEditing: false
    });
    setFormErrors({});
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  };

  // Componente simple para la tabla de asistencias
  const AdminTable = ({ attendanceData, loading }) => {
    if (loading) return <div>Cargando...</div>;
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número Empleado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Área
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Departamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceData.map((record, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {record.numero_empleado || record.employeeId}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{record.nombre_empleado || record.employeeName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.area_empleado || record.department}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.departamento || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.fecha || record.date}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.hora || record.time}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    (record.tipo_registro || record.type) === 'entrada' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {record.tipo_registro || record.type || 'entrada'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const dbStatusInfo = getDbStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <span className="text-xl font-bold text-gray-800">Panel de Administración</span>
                  <div className="flex items-center mt-1">
                    <CircleStackIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs text-gray-500">MongoDB</span>
                    <div className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${dbStatusInfo.bg} ${dbStatusInfo.color}`}>
                      {dbStatusInfo.text}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  fetchDataFromDB();
                  fetchEmployees();
                  fetchAttendanceCheckData();
                  fetchObservaciones();
                  
                  const weekStart = getWeekStartDate();
                  const weekEnd = getWeekEndDate();
                  setWeekRange({ start: weekStart, end: weekEnd });
                  fetchWeeklyData(weekStart, weekEnd);
                }}
                disabled={refreshing}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
              <a
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100"
              >
                ← Volver al Registro
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de conexión */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="w-4 h-4 mr-1" />
                {lastUpdated ? (
                  <>Última actualización: {formatDateTime(lastUpdated)}</>
                ) : (
                  'Cargando datos...'
                )}
              </div>
              <div className="text-sm text-gray-600">
                <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                {attendanceData.length} registros cargados
              </div>
            </div>
            {dbStatus === 'error' && (
              <div className="flex items-center text-sm text-red-600">
                <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                Error de conexión con MongoDB
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Empleados */}
          <div className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_empleados}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-green-600 font-medium">{stats.empleados_activos}</span> activos
                </p>
              </div>
            </div>
          </div>

          {/* Registros Totales */}
          <div className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-purple-100 to-purple-50 p-3 rounded-lg">
                <DocumentTextIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Registros Totales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_asistencias}</p>
                <p className="text-xs text-gray-500 mt-1">En base de datos</p>
              </div>
            </div>
          </div>

          {/* Registros Hoy */}
          <div className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-green-100 to-green-50 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Registros Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.asistencias_hoy}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getCurrentJaliscoDate()}
                </p>
              </div>
            </div>
          </div>

          {/* Empleados Únicos Hoy */}
          <div className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-yellow-100 to-yellow-50 p-3 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Únicos Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.empleados_unicos_hoy}</p>
                <p className="text-xs text-gray-500 mt-1">Empleados distintos</p>
              </div>
            </div>
          </div>

          {/* Porcentaje Asistencia */}
          <div className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gradient-to-br from-indigo-100 to-indigo-50 p-3 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Asistencia Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.empleados_activos > 0 
                    ? `${Math.round((stats.empleados_unicos_hoy / stats.empleados_activos) * 100)}%`
                    : '0%'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">Del total activos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Verificación de Asistencia */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <ClockIcon className="w-6 h-6 mr-2 text-red-600" />
              Verificación de Asistencia Hoy ({currentDate})
            </h2>
            <div className="flex gap-3" ref={exportCheckMenuRef}>
              <div className="relative">
                <button
                  onClick={() => {
                    const menu = document.getElementById('export-check-menu');
                    if (menu) {
                      menu.classList.toggle('hidden');
                    }
                  }}
                  disabled={attendanceCheckData.length === 0}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Exportar Verificación
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Menú desplegable de exportación */}
                <div id="export-check-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    <button
                      onClick={() => {
                        exportAttendanceCheckToCSV();
                        const menu = document.getElementById('export-check-menu');
                        if (menu) menu.classList.add('hidden');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2 text-green-600" />
                      Exportar Hoy (CSV)
                    </button>
                    <button
                      onClick={() => {
                        exportAttendanceCheckAllDatesToCSV();
                        const menu = document.getElementById('export-check-menu');
                        if (menu) menu.classList.add('hidden');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2 text-blue-600" />
                      Exportar Todas las Fechas (CSV)
                    </button>
                    <button
                      onClick={() => {
                        exportAttendanceCheckToPDF();
                        const menu = document.getElementById('export-check-menu');
                        if (menu) menu.classList.add('hidden');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar Reporte Completo (PDF)
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                onClick={fetchAttendanceCheckData}
                disabled={attendanceCheckLoading}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${attendanceCheckLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Tabla de Verificación de Asistencia */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Estado de Asistencia de Empleados Activos
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Empleados que no registraron antes de las 9:00 AM aparecen en rojo
                  </p>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Hora actual (Jalisco): {getCurrentJaliscoTime()}
                </div>
              </div>
            </div>

            <div className="p-4">
              {attendanceCheckLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Verificando asistencia...</p>
                </div>
              ) : attendanceCheckData.length === 0 ? (
                <div className="text-center py-8">
                  <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay empleados activos para verificar</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Número
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nombre
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Área
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Departamento
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Asistió Hoy
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Antes de 9:00 AM
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Última Hora
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Observaciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedCheckData.map((employee) => {
                          const highlight = shouldHighlightRow(employee);
                          
                          return (
                            <tr 
                              key={employee.id} 
                              className={`${highlight ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' : 'hover:bg-gray-50'} transition-colors duration-150`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {employee.id}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{employee.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{employee.area}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{employee.departamento}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {employee.attendedToday ? (
                                    <>
                                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                                      <span className="text-sm text-green-800">Sí</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                                      <span className="text-sm text-red-800">No</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {employee.before9AM ? (
                                    <>
                                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                                      <span className="text-sm text-green-800">Sí</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                                      <span className="text-sm text-red-800">No</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  employee.attendanceType === 'entrada' 
                                    ? 'bg-green-100 text-green-800'
                                    : employee.attendanceType === 'salida'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {employee.attendanceType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {employee.lastTime || 'Sin registro'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col space-y-2">
                                  <textarea
                                    value={observacionInput[employee.id] || observaciones[employee.id] || ''}
                                    onChange={(e) => setObservacionInput(prev => ({
                                      ...prev,
                                      [employee.id]: e.target.value
                                    }))}
                                    placeholder="Escriba una observación..."
                                    className="w-full text-gray-800 text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows="2"
                                  />
                                  <button
                                    onClick={() => saveObservacion(employee.id, observacionInput[employee.id] || observaciones[employee.id] || '')}
                                    disabled={savingObservacion[employee.id] || !(observacionInput[employee.id] || observaciones[employee.id])}
                                    className="flex items-center justify-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    <PaperAirplaneIcon className="w-3 h-3 mr-1" />
                                    {savingObservacion[employee.id] ? 'Guardando...' : 'Guardar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Controles de paginación para verificación */}
                  <PaginationControls
                    currentPage={currentCheckPage}
                    totalPages={totalCheckPages}
                    onPageChange={(page) => setCurrentCheckPage(page)}
                    dataLength={attendanceCheckData.length}
                  />
                </>
              )}
            </div>

            {/* Resumen de la tabla de verificación */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                <div className="mb-2 sm:mb-0">
                  <span className="font-medium">{attendanceCheckData.length}</span> empleados activos
                  <span className="mx-2">•</span>
                  <span className="text-green-600 font-medium">
                    {attendanceCheckData.filter(e => e.attendedToday).length}
                  </span> asistieron hoy
                  <span className="mx-2">•</span>
                  <span className="text-red-600 font-medium">
                    {attendanceCheckData.filter(e => !e.attendedToday).length}
                  </span> sin asistencia
                </div>
                <div className="flex items-center">
                  <ExclamationCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-red-700 font-medium">
                    {attendanceCheckData.filter(employee => shouldHighlightRow(employee)).length} 
                    empleados pendientes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ NUEVA SECCIÓN: TABLA SEMANAL ============ */}
        {/* Sección de Tabla Semanal - CÓDIGO CORREGIDO */}
{/* ============ SECCIÓN: TABLA SEMANAL CORREGIDA ============ */}
<div className="mb-8">
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
      <CalendarDaysIcon className="w-6 h-6 mr-2 text-indigo-600" />
      Reporte Semanal de Asistencias
    </h2>
    <div className="flex gap-3" ref={exportWeeklyMenuRef}>
      <div className="flex items-center space-x-3">
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
          Semana: {weekRange.start} al {weekRange.end}
        </div>
        
        <div className="relative">
          <button
            onClick={() => {
              const menu = document.getElementById('export-weekly-menu');
              if (menu) {
                menu.classList.toggle('hidden');
              }
            }}
            disabled={weeklyData.length === 0}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Exportar Semanal
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Menú desplegable de exportación semanal */}
          <div id="export-weekly-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu">
              <button
                onClick={() => {
                  exportWeeklyToCSV();
                  const menu = document.getElementById('export-weekly-menu');
                  if (menu) menu.classList.add('hidden');
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2 text-green-600" />
                Exportar CSV
              </button>
              <button
                onClick={() => {
                  exportWeeklyToPDF();
                  const menu = document.getElementById('export-weekly-menu');
                  if (menu) menu.classList.add('hidden');
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => {
          const weekStart = getWeekStartDate();
          const weekEnd = getWeekEndDate();
          setWeekRange({ start: weekStart, end: weekEnd });
          fetchWeeklyData(weekStart, weekEnd);
        }}
        disabled={weeklyLoading}
        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
      >
        <ArrowPathIcon className={`w-4 h-4 mr-2 ${weeklyLoading ? 'animate-spin' : ''}`} />
        Actualizar
      </button>
    </div>
  </div>

  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Asistencias por Semana (Lunes a Viernes)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Semana del {weekRange.start} al {weekRange.end}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Nota: Los días futuros y el 5/01/2026 no cuentan como faltas
          </p>
        </div>
        <div className="text-sm text-gray-500">
          <CircleStackIcon className="w-4 h-4 inline mr-1" />
          Total empleados: {weeklyData.length}
        </div>
      </div>
    </div>

    <div className="p-4">
      {weeklyLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos semanales...</p>
        </div>
      ) : weeklyData.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay datos para esta semana</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lunes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Martes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miércoles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jueves
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Viernes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faltas Reales
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedWeeklyData.map((row, index) => {
                  // Función para renderizar cada celda de día
                  const renderDayCell = (dayName) => {
                    const valor = row[dayName]; // 'X' o ''
                    const fecha = row.fechas?.[dayName]; // fecha DD/MM/YYYY
                    const esFuturo = row.esFuturo?.[dayName]; // true/false
                    const esInactivo = row.esInactivo?.[dayName]; // true/false para 5/01/2026
                    
                    // Día futuro
                    if (esFuturo) {
                      return (
                        <div className="flex justify-center">
                          <div 
                            className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center"
                            title={`${fecha} - Día futuro (no cuenta como falta)`}
                          >
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      );
                    }
                    
                    // Día inactivo (5 de enero de 2026)
                    if (esInactivo) {
                      return (
                        <div className="flex justify-center">
                          <div 
                            className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center"
                            title={`${fecha} - Sistema no activo (no cuenta como falta)`}
                          >
                            <span className="text-xs text-gray-500">-</span>
                          </div>
                        </div>
                      );
                    }
                    
                    // Día pasado - mostrar asistencia real
                    return (
                      <div className="flex justify-center">
                        {valor === 'X' ? (
                          <div 
                            className="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center"
                            title={`${fecha} - Asistió`}
                          >
                            <CheckIcon className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div 
                            className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center"
                            title={`${fecha} - Ausente (falta)`}
                          >
                            <XMarkIcon className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </div>
                    );
                  };
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.area}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.departamento || '-'}</div>
                      </td>
                      
                      {/* Lunes */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderDayCell('lunes')}
                      </td>
                      
                      {/* Martes */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderDayCell('martes')}
                      </td>
                      
                      {/* Miércoles */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderDayCell('miercoles')}
                      </td>
                      
                      {/* Jueves */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderDayCell('jueves')}
                      </td>
                      
                      {/* Viernes */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderDayCell('viernes')}
                      </td>
                      
                      {/* Faltas reales (ya calculadas en el backend - NO incluye futuros ni 5/01/2026) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            row.faltas > 0 
                              ? 'bg-red-100 text-red-800 border border-red-300' 
                              : 'bg-green-100 text-green-800 border border-green-300'
                          }`}>
                            {row.faltas}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Controles de paginación para tabla semanal */}
          <PaginationControls
            currentPage={currentWeeklyPage}
            totalPages={totalWeeklyPages}
            onPageChange={(page) => setCurrentWeeklyPage(page)}
            dataLength={weeklyData.length}
          />
        </>
      )}
    </div>
    
    {/* Resumen y leyenda */}
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
        <div className="mb-2 sm:mb-0">
          <span className="font-medium">Faltas reales</span> no incluyen días futuros ni el 5/01/2026
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-xs">Asistió</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
              <XMarkIcon className="w-3 h-3 text-red-600" />
            </div>
            <span className="text-xs">Ausente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center">
              <ClockIcon className="w-3 h-3 text-gray-400" />
            </div>
            <span className="text-xs">Futuro</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center">
              <span className="text-xs text-gray-500">-</span>
            </div>
            <span className="text-xs">Inactivo</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Sección de Gestión de Empleados */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <UserGroupIcon className="w-6 h-6 mr-2 text-blue-600" />
            Gestión de Empleados
          </h2>
          <div className="flex gap-3" ref={exportEmployeesMenuRef}>
            <div className="relative">
              <button
                onClick={() => {
                  const menu = document.getElementById('export-employees-menu');
                  if (menu) {
                    menu.classList.toggle('hidden');
                  }
                }}
                disabled={employees.length === 0}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Exportar Empleados
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Menú desplegable de exportación */}
              <div id="export-employees-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu">
                  <button
                    onClick={() => {
                      exportEmployeesToCSV();
                      const menu = document.getElementById('export-employees-menu');
                      if (menu) menu.classList.add('hidden');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-green-600" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => {
                      exportEmployeesToPDF();
                      const menu = document.getElementById('export-employees-menu');
                      if (menu) menu.classList.add('hidden');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar PDF
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowEmployeeForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </button>
          </div>
        </div>

        {/* Formulario de Empleado (Modal) */}
        {showEmployeeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    {employeeForm.isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
                  </h3>
                  <button
                    onClick={resetEmployeeForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddEmployee} className="space-y-4 text-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Empleado *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="numero_empleado"
                        value={employeeForm.numero_empleado}
                        onChange={handleEmployeeFormChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.numero_empleado ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={employeeForm.isEditing ? 
                          "Número actual: " + employeeForm.originalId : 
                          "Ingresa el número (ej: 1, 2, 3...)"}
                        disabled={false}
                      />
                      {!employeeForm.isEditing && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {formErrors.numero_empleado && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.numero_empleado}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {employeeForm.isEditing ? 
                        "Puedes cambiar el número si es necesario" : 
                        "Ingresa manualmente el número del empleado"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      name="nombre_completo"
                      value={employeeForm.nombre_completo}
                      onChange={handleEmployeeFormChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.nombre_completo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Juan Pérez"
                    />
                    {formErrors.nombre_completo && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.nombre_completo}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área/Departamento *
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={employeeForm.area}
                      onChange={handleEmployeeFormChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.area ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Ventas, IT, RRHH"
                    />
                    {formErrors.area && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.area}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento *
                    </label>
                    <input
                      type="text"
                      name="departamento"
                      value={employeeForm.departamento}
                      onChange={handleEmployeeFormChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.departamento ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Ventas, Producción, Administración"
                    />
                    {formErrors.departamento && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.departamento}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      name="activo"
                      value={employeeForm.activo}
                      onChange={handleEmployeeFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Sí">Activo</option>
                      <option value="No">Inactivo</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      {employeeForm.isEditing ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={resetEmployeeForm}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Empleados */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Lista de Empleados
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {employees.length} empleados registrados
                </p>
              </div>
              <div className="text-sm text-gray-500">
                <CircleStackIcon className="w-4 h-4 inline mr-1" />
                Base de datos MongoDB
              </div>
            </div>
          </div>

          <div className="p-4">
            {employeesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando empleados...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay empleados registrados</p>
                <button
                  onClick={() => setShowEmployeeForm(true)}
                  className="mt-3 px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Agregar primer empleado
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Área
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Departamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedEmployeesData.map((employee) => (
                        <tr key={employee.numero_empleado} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.numero_empleado}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{employee.nombre_completo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.area}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.departamento || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              employee.activo 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditEmployee(employee)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(employee.numero_empleado)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Controles de paginación para empleados */}
                <PaginationControls
                  currentPage={currentEmployeesPage}
                  totalPages={totalEmployeesPages}
                  onPageChange={(page) => setCurrentEmployeesPage(page)}
                  dataLength={employees.length}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Asistencias */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Registros de Asistencia</h2>
          <div className="text-sm text-gray-600">
            Filtros y exportación
          </div>
        </div>

        {/* Filtros y Acciones */}
        <div className="mb-8">
          <form onSubmit={applyFilters} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número, nombre, área o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
              
              {/* REEMPLAZA ESTE INPUT DATE POR UN SELECT */}
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="input-field pl-10"
                  disabled={loading || loadingDates}
                >
                  <option value="">Todas las fechas</option>
                  {availableDates.map((fecha) => (
                    <option key={fecha.valor} value={fecha.valor}>
                      {fecha.texto} ({fecha.registros} registros)
                    </option>
                  ))}
                  {availableDates.length === 0 && !loadingDates && (
                    <option value="" disabled>No hay fechas disponibles</option>
                  )}
                  {loadingDates && (
                    <option value="" disabled>Cargando fechas...</option>
                  )}
                </select>
              </div>
              {/* 
              <div>
                <button
                  type="submit"
                  disabled={loading || refreshing}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Aplicar Filtros'}
                </button>
              </div>
              */}
            </div>
            
            <div className="flex gap-3" ref={exportAttendanceMenuRef}>
              <button
                type="button"
                onClick={clearFilters}
                disabled={loading || refreshing}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
              >
                Limpiar Filtros
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const menu = document.getElementById('export-attendance-menu');
                    if (menu) {
                      menu.classList.toggle('hidden');
                    }
                  }}
                  disabled={loading || filteredData.length === 0}
                  className="flex items-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                  Exportar
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Menú desplegable de exportación */}
                <div id="export-attendance-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    <button
                      onClick={() => {
                        exportAllToCSV();
                        const menu = document.getElementById('export-attendance-menu');
                        if (menu) menu.classList.add('hidden');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2 text-green-600" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => {
                        exportAllToPDF();
                        const menu = document.getElementById('export-attendance-menu');
                        if (menu) menu.classList.add('hidden');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
          
          {/* Información adicional sobre el filtro */}
          {dateFilter && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-blue-800">
                    Filtro activo: <span className="font-bold">{dateFilter}</span>
                  </span>
                  {availableDates.find(f => f.valor === dateFilter) && (
                    <span className="ml-3 text-sm text-blue-600">
                      ({availableDates.find(f => f.valor === dateFilter).registros} registros)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    // Botón para actualizar la lista de fechas
                    fetchAvailableDates();
                    fetchDataFromDB();
                  }}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  disabled={loadingDates}
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-1 ${loadingDates ? 'animate-spin' : ''}`} />
                  {loadingDates ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de Asistencias */}
        <div className="glass-card rounded-xl overflow-hidden shadow-lg">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Historial de Asistencias
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Datos en tiempo real desde MongoDB
                  <span className="ml-2 text-gray-500">
                    • {filteredData.length} registros encontrados
                  </span>
                </p>
              </div>
              <div className="mt-2 sm:mt-0">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                  <CircleStackIcon className="w-4 h-4 mr-1" />
                  MongoDB
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                  <CircleStackIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
                </div>
                <p className="text-gray-600 mt-4">Conectando con MongoDB...</p>
                <p className="text-sm text-gray-500 mt-2">Obteniendo datos en tiempo real</p>
              </div>
            ) : dbStatus === 'error' ? (
              <div className="text-center py-12">
                <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Error de conexión con MongoDB
                </h3>
                <p className="text-gray-600 mb-4">
                  No se pudieron cargar los datos desde la base de datos.
                </p>
                <button
                  onClick={fetchDataFromDB}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Reintentar conexión
                </button>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay registros de asistencia
                </h3>
                <p className="text-gray-600">
                  No se encontraron registros con los filtros aplicados.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Ver todos los registros
                </button>
              </div>
            ) : (
              <>
                <AdminTable 
                  attendanceData={paginatedAttendanceData} 
                  loading={false} 
                />
                
                {/* Controles de paginación para asistencias */}
                <PaginationControls
                  currentPage={currentAttendancePage}
                  totalPages={totalAttendancePages}
                  onPageChange={(page) => setCurrentAttendancePage(page)}
                  dataLength={filteredData.length}
                />
              </>
            )}
          </div>
          
          {/* Footer de la tabla */}
          {!loading && filteredData.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                <div className="mb-2 sm:mb-0">
                  Mostrando <span className="font-medium">{paginatedAttendanceData.length}</span> de <span className="font-medium">{filteredData.length}</span> registros
                  {searchTerm && (
                    <span className="ml-2">
                      para "<span className="font-medium">{searchTerm}</span>"
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <CircleStackIcon className="w-4 h-4 mr-1" />
                  <span>Sincronizado con MongoDB</span>
                  {lastUpdated && (
                    <span className="ml-2 text-gray-500">
                      • Actualizado: {formatDateTime(lastUpdated)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
    
  );
}
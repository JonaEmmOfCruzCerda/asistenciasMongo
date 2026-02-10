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
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx-js-style';

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

  const [showEmployeesWithoutAttendance, setShowEmployeesWithoutAttendance] = useState(false);
  
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
  
  // ESTADOS PARA OBSERVACIONES - SOLO TIPO DE FALTA
  const [tiposFalta, setTiposFalta] = useState({}); 
  const [savingObservacion, setSavingObservacion] = useState({});
  
  // ESTADOS PARA TABLA SEMANAL CON FILTRO POR SEMANAS
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });
  const [selectedWeek, setSelectedWeek] = useState(1); // Estado para semana seleccionada
  const [availableWeeks, setAvailableWeeks] = useState([]); // Lista de semanas disponibles
  const [weekStats, setWeekStats] = useState({
    totalEmpleados: 0,
    totalPresentes: 0,
    totalFaltas: 0,
    porcentajeAsistencia: 0
  });
  
  // PAGINACIÓN - Estados para cada tabla
  const [currentAttendancePage, setCurrentAttendancePage] = useState(1);
  const [currentEmployeesPage, setCurrentEmployeesPage] = useState(1);
  const [currentCheckPage, setCurrentCheckPage] = useState(1);
  const [currentWeeklyPage, setCurrentWeeklyPage] = useState(1);

  // ESTADOS PARA CONTROLAR QUÉ TABLAS ESTÁN ABIERTAS
  const [openTables, setOpenTables] = useState({
    verification: false,     // Verificación de asistencia
    weekly: false,          // Reporte semanal
    employees: false,      // Gestión de empleados
    attendance: false      // Registros de asistencia
  });

  // Referencias para menús desplegables
  const exportCheckMenuRef = useRef(null);
  const exportAttendanceMenuRef = useRef(null);
  const exportEmployeesMenuRef = useRef(null);
  const exportWeeklyMenuRef = useRef(null);

  // ============ FUNCIONES DE FECHA Y HORA ============
  
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

  // ============ FUNCIONES PARA MANEJO DE SEMANAS ============
  
  // Función para obtener rango de fecha por número de semana (Semana 1: 1-7 enero 2026)
  const getWeekRangeByNumber = (weekNumber) => {
    // Fecha base: 1 de enero de 2026 (jueves) - semana empieza en jueves
    const fechaBase = new Date(2026, 0, 1); // 1 de enero 2026 (jueves)
    
    // Calcular fecha de inicio de la semana solicitada (jueves)
    const inicioSemana = new Date(fechaBase);
    inicioSemana.setDate(fechaBase.getDate() + ((weekNumber - 1) * 7));
    
    // Calcular fecha de fin (miércoles - 6 días después)
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    
    // Formatear fechas
    const formatDate = (date) => {
      const dia = date.getDate().toString().padStart(2, '0');
      const mes = (date.getMonth() + 1).toString().padStart(2, '0');
      const año = date.getFullYear();
      return `${dia}/${mes}/${año}`;
    };
    
    return {
      start: formatDate(inicioSemana),
      end: formatDate(finSemana),
      numero: weekNumber
    };
  };

  // Función para calcular número de semana actual (jueves a miércoles)
  const getCurrentWeekNumber = () => {
    const hoy = new Date();
    const fechaInicio = new Date(2026, 0, 1); // 1 de enero 2026 (jueves)
    
    // Si la fecha actual es anterior al 1 de enero 2026
    if (hoy < fechaInicio) {
      return 1;
    }
    
    // Calcular diferencia en días
    const diffTime = Math.abs(hoy - fechaInicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calcular número de semana (cada 7 días)
    const weekNumber = Math.floor(diffDays / 7) + 1;
    
    return weekNumber;
  };

  // Función para obtener rango de semana actual
  const getCurrentWeekRange = () => {
    const weekNumber = getCurrentWeekNumber();
    return getWeekRangeByNumber(weekNumber);
  };

  // Primero, asegúrate de tener esta función para verificar fechas inactivas:
const esFechaInactiva = (fechaDDMMYYYY) => {
  const fechasInactivas = [
    '05/01/2026', // 5 de enero 2026 - sistema no activo
    '02/02/2026', // 2 de febrero 2026 - sistema inactivo
  ];
  return fechasInactivas.includes(fechaDDMMYYYY);
};

  // ============ FUNCIÓN PARA CALCULAR FECHA PARA DÍA ESPECÍFICO DE SEMANA ============
  // Función para calcular la fecha específica para un día de la semana
const calcularFechaParaDiaSemana = (semanaNumero, diaNombre) => {
  // Mapeo de nombres de días a índices (0 = jueves, 1 = viernes, 2 = lunes, 3 = martes, 4 = miércoles)
  const diasMap = {
    'jueves': 0,
    'viernes': 1,
    'lunes': 2,
    'martes': 3,
    'miercoles': 4
  };
  
  // Fecha base: 1 de enero de 2026 (jueves)
  const fechaBase = new Date(2026, 0, 1);
  
  // Calcular fecha de inicio de la semana (jueves)
  const inicioSemana = new Date(fechaBase);
  inicioSemana.setDate(fechaBase.getDate() + ((semanaNumero - 1) * 7));
  
  // Calcular fecha específica para el día solicitado
  const fechaDia = new Date(inicioSemana);
  
  // Ajustar según el día solicitado
  switch(diaNombre) {
    case 'jueves':
      // Ya es jueves, no ajustar
      break;
    case 'viernes':
      fechaDia.setDate(inicioSemana.getDate() + 1);
      break;
    case 'lunes':
      fechaDia.setDate(inicioSemana.getDate() + 4); // Jueves + 4 días = Lunes
      break;
    case 'martes':
      fechaDia.setDate(inicioSemana.getDate() + 5);
      break;
    case 'miercoles':
      fechaDia.setDate(inicioSemana.getDate() + 6);
      break;
    default:
      // Si no es un día válido, devolver la fecha de inicio
      break;
  }
  
  // Formatear fecha como DD/MM/YYYY
  const dia = fechaDia.getDate().toString().padStart(2, '0');
  const mes = (fechaDia.getMonth() + 1).toString().padStart(2, '0');
  const año = fechaDia.getFullYear();
  
  return `${dia}/${mes}/${año}`;
};

  // Función para cambiar de semana
  const handleWeekChange = (weekNumber) => {
    setSelectedWeek(weekNumber);
    const weekRange = getWeekRangeByNumber(weekNumber);
    setWeekRange(weekRange);
    fetchWeeklyData(weekRange.start, weekRange.end);
  };

  // ============ FUNCIONES DE CARGA DE DATOS ============
  
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);

  // Función para cargar fechas disponibles
  const fetchAvailableDates = async () => {
    setLoadingDates(true);
    try {
      console.log('📅 Cargando fechas disponibles...');
      const response = await fetch('api/fechas-disponibles');
      
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

  // Función para cargar semanas disponibles
  const fetchAvailableWeeks = async () => {
    try {
      console.log('📅 Cargando semanas disponibles basadas en asistencias...');
      const response = await fetch('/api/semanas-disponibles');
      
      if (response.ok) {
        const semanas = await response.json();
        console.log(`✅ ${semanas.length} semanas cargadas desde asistencias`);
        
        // Filtrar solo semanas que tengan registros o sean la actual
        const semanasConDatos = semanas.filter(s => s.tieneRegistros || s.esSemanaActual);
        
        if (semanasConDatos.length > 0) {
          const semanasOrdenadas = semanasConDatos.sort((a, b) => b.numero - a.numero);
          setAvailableWeeks(semanasOrdenadas);
          
          // Seleccionar la semana más reciente con datos
          const semanaMasReciente = semanasOrdenadas[0];
          setSelectedWeek(semanaMasReciente.numero);
          setWeekRange({
            start: semanaMasReciente.inicio,
            end: semanaMasReciente.fin
          });
          
          // Cargar datos de esa semana
          fetchWeeklyData(semanaMasReciente.inicio, semanaMasReciente.fin);
        } else {
          // Usar semanas por defecto si no hay datos
          generarSemanasPorDefecto();
        }
      } else {
        console.error('❌ Error cargando semanas');
        generarSemanasPorDefecto();
      }
    } catch (error) {
      console.error('❌ Error en fetchAvailableWeeks:', error);
      generarSemanasPorDefecto();
    }
  };

  // Función para generar semanas por defecto
  const generarSemanasPorDefecto = () => {
    const semanas = [];
    for (let i = 1; i <= 4; i++) {
      const weekRange = getWeekRangeByNumber(i);
      semanas.push({
        numero: i,
        inicio: weekRange.start,
        fin: weekRange.end,
        registros: 0
      });
    }
    setAvailableWeeks(semanas);
    
    if (semanas.length > 0) {
      setSelectedWeek(1);
      setWeekRange({
        start: semanas[0].inicio,
        end: semanas[0].fin
      });
    }
  };

  // Función para verificar si un empleado registró antes de las 9:00 AM
  const checkAttendanceBefore9AM = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return false;
    
    const today = getCurrentJaliscoDate();
    
    for (const record of attendanceRecords) {
      const recordDate = new Date(record.marca_tiempo || record.timestamp);
      const recordDateStr = convertToJaliscoDateString(recordDate);
      
      if (recordDateStr === today) {
        const recordHour = new Date(recordDate.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000)).getUTCHours();
        if (recordHour < 9) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Función para obtener el tipo de registro de hoy
  const getTodayAttendanceType = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 'Sin registro';
    
    const today = getCurrentJaliscoDate();
    const todayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.marca_tiempo || record.timestamp);
      const recordDateStr = convertToJaliscoDateString(recordDate);
      return recordDateStr === today;
    });
    
    if (todayRecords.length === 0) return 'Sin registro';
    
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

  // Función: Cargar tipos de falta con filtro por fecha
  const fetchTiposFalta = async (fechaEspecifica = null) => {
    try {
      const fecha = fechaEspecifica || getCurrentJaliscoDate();
      const response = await fetch(`/api/observaciones?fecha=${fecha}`);
      
      if (response.ok) {
        const data = await response.json();
        
        const tiposFaltaObj = {};
        
        data.forEach(obs => {
          if (obs.tipoFalta && obs.tipoFalta.trim()) {
            tiposFaltaObj[obs.employeeId] = obs.tipoFalta;
          }
        });
        
        setTiposFalta(tiposFaltaObj);
      }
    } catch (error) {
      console.error('Error cargando tipos de falta:', error);
    }
  };

  // Función: Guardar tipo de falta
  const saveObservacion = async (employeeId, tipoFalta, fechaEspecifica = null) => {
    // Validar que haya un tipo de falta
    const tipoFaltaValue = tipoFalta || '';
    
    if (!tipoFaltaValue) {
      alert('Debe seleccionar un tipo de falta');
      setSavingObservacion(prev => ({ ...prev, [employeeId]: false }));
      return;
    }
    
    setSavingObservacion(prev => ({ ...prev, [employeeId]: true }));
    
    try {
      const fecha = fechaEspecifica || getCurrentJaliscoDate();
      
      console.log('📤 Guardando tipo de falta:', {
        employeeId,
        tipoFalta: tipoFaltaValue,
        fecha
      });
      
      const datos = {
        employeeId: employeeId,
        text: '', // Texto vacío
        tipoFalta: tipoFaltaValue,
        fecha: fecha,
        adminId: 'admin'
      };
      
      const response = await fetch('/api/observaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Tipo de falta guardado:', result);
        
        // Actualizar estado local
        setTiposFalta(prev => ({
          ...prev,
          [employeeId]: tipoFaltaValue
        }));
        
        // Recargar datos
        await fetchTiposFalta(fecha);
      } else {
        console.error('❌ Error del servidor:', result);
      }
    } catch (error) {
      console.error('Error guardando tipo de falta:', error);
    } finally {
      setSavingObservacion(prev => ({ ...prev, [employeeId]: false }));
    }
  };

// Función para cargar datos semanales - VERSIÓN OPTIMIZADA
const fetchWeeklyData = async (startDate, endDate, forceRefresh = false) => {
  // Si ya está cargando, no hacer otra solicitud
  if (weeklyLoading && !forceRefresh) return;
  
  setWeeklyLoading(true);
  try {
    console.log('📅 SOLICITANDO DATOS SEMANALES OPTIMIZADO');
    console.log('Rango:', startDate, 'al', endDate);

    // Verificar si las fechas son válidas
    if (!startDate || !endDate) {
      console.error('❌ Fechas no válidas');
      setWeeklyData([]);
      return;
    }

    // Cache key para evitar cargas duplicadas
    const cacheKey = `week_${selectedWeek}_${startDate}_${endDate}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    // Usar datos cacheados si existen y no forzamos refresh
    if (cachedData && !forceRefresh) {
      const { data: cachedWeeklyData, stats: cachedStats, timestamp } = JSON.parse(cachedData);
      
      // Verificar si el cache es reciente (menos de 5 minutos)
      const cacheAge = Date.now() - timestamp;
      const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutos
      
      if (cacheAge < MAX_CACHE_AGE) {
        console.log('📊 Usando datos cacheados para semana', selectedWeek);
        setWeeklyData(cachedWeeklyData);
        setWeekStats(cachedStats);
        setWeeklyLoading(false);
        return;
      }
    }

    // Construir la URL con parámetros optimizados
    const apiUrl = `/api/asistencias-semana?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&cache=${Date.now()}`;
    
    // Configurar timeout más corto pero con reintentos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos

    try {
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Formato de datos inválido');
      }

      // Si no hay datos, establecer valores por defecto
      if (data.length === 0) {
        console.log('⚠️ No hay datos para esta semana');
        setWeeklyData([]);
        setWeekStats({
          totalEmpleados: 0,
          totalPresentes: 0,
          totalFaltas: 0,
          porcentajeAsistencia: 0
        });
        return;
      }

      // Procesar los datos de forma más eficiente
      let processedData = data;
      
      // Solo combinar con empleados si es necesario (optimización)
      const needsEmployeeData = data.length > 0 && (!data[0].departamento || data[0].departamento === '');
      
      if (needsEmployeeData && employees.length > 0) {
        console.log('🔄 Combinando con datos de empleados...');
        
        // Crear mapa de empleados para acceso rápido
        const employeesMap = new Map();
        employees.forEach(emp => {
          employeesMap.set(emp.nombre_completo, {
            departamento: emp.departamento || '',
            numero_empleado: emp.numero_empleado || ''
          });
        });
        
        processedData = data.map(item => {
          const empleadoInfo = employeesMap.get(item.nombre) || {};
          return {
            ...item,
            departamento: empleadoInfo.departamento || item.departamento || '',
            numero_empleado: empleadoInfo.numero_empleado || item.numero_empleado || ''
          };
        });
      }

      // Filtrar solo empleados activos si tenemos la lista
      let filteredData = processedData;
      if (employees.length > 0) {
        // Crear Set de IDs de empleados activos para búsqueda rápida
        const activeEmployeeIds = new Set(
          employees.filter(emp => emp.activo)
                  .map(emp => emp.numero_empleado || emp.nombre_completo)
        );
        
        filteredData = processedData.filter(item => 
          activeEmployeeIds.has(item.numero_empleado) || 
          activeEmployeeIds.has(item.nombre)
        );
      }

      // Calcular estadísticas
      const estadisticas = calcularEstadisticasSemana(filteredData);
      
      // Guardar en cache
      const cacheData = {
        data: filteredData,
        stats: estadisticas,
        timestamp: Date.now()
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Actualizar estado
      setWeekStats(estadisticas);
      setWeeklyData(filteredData);
      
      console.log(`✅ Datos semanales cargados: ${filteredData.length} empleados`);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Timeout: La solicitud tardó demasiado');
        
        // Intentar con datos cacheados antiguos si existen
        if (cachedData) {
          console.log('🔄 Usando datos cacheados debido a timeout');
          const { data: cachedWeeklyData, stats: cachedStats } = JSON.parse(cachedData);
          setWeeklyData(cachedWeeklyData);
          setWeekStats(cachedStats);
        } else {
          alert('La solicitud está tardando demasiado. Por favor, verifica tu conexión.');
        }
      } else {
        throw fetchError;
      }
    }

  } catch (error) {
    console.error('❌ Error en fetchWeeklyData:', error);
    
    // Intentar usar datos cacheados como fallback
    const cacheKey = `week_${selectedWeek}_${startDate}_${endDate}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log('🔄 Usando datos cacheados como fallback');
      const { data: cachedWeeklyData, stats: cachedStats } = JSON.parse(cachedData);
      setWeeklyData(cachedWeeklyData);
      setWeekStats(cachedStats);
    } else {
      // Establecer datos vacíos
      setWeeklyData([]);
      setWeekStats({
        totalEmpleados: 0,
        totalPresentes: 0,
        totalFaltas: 0,
        porcentajeAsistencia: 0
      });
    }
  } finally {
    setWeeklyLoading(false);
  }
};

// Función corregida para calcular estadísticas de la semana
const calcularEstadisticasSemana = (datos) => {
  if (!datos || datos.length === 0) {
    return {
      totalEmpleados: 0,
      totalPresentes: 0,
      totalFaltas: 0,
      porcentajeAsistencia: 0
    };
  }
  
  let totalPresentes = 0;
  let totalFaltas = 0;
  let totalDiasLaborales = 0;
  
  // Días de la semana en el orden que aparecen (jueves a miércoles)
  const diasSemana = ['jueves', 'viernes', 'lunes', 'martes', 'miercoles'];
  
  datos.forEach(empleado => {
    diasSemana.forEach(dia => {
      // Obtener la fecha del día
      const fechaDia = calcularFechaParaDiaSemana(selectedWeek, dia);
      
      // Verificar si es fecha inactiva del sistema
      const esFechaInactivaSistema = esFechaInactiva(fechaDia);
      
      // Verificar si es día laboral válido
      const esFuturo = empleado.esFuturo?.[dia];
      const esInactivo = empleado.esInactivo?.[dia];
      const esFinDeSemana = empleado.esFinDeSemana?.[dia];
      
      // Solo contar días que sean laborales y no futuros ni inactivos
      if (!esFuturo && !esInactivo && !esFinDeSemana && !esFechaInactivaSistema) {
        totalDiasLaborales++; // Contar día laboral
        
        // Contar 'X' (asistencia) o 'R' (retardo) como presente
        if (empleado[dia] === 'X' || empleado[dia] === 'R') {
          totalPresentes++;
        } else if (empleado[dia] === '' || empleado[dia] === undefined) {
          // Solo contar como falta si está vacío
          totalFaltas++;
        }
      }
    });
  });
  
  const porcentajeAsistencia = totalDiasLaborales > 0 ? 
    (totalPresentes / totalDiasLaborales) * 100 : 0;
  
  return {
    totalEmpleados: datos.length,
    totalPresentes,
    totalFaltas,
    totalDiasLaborales,
    porcentajeAsistencia: parseFloat(porcentajeAsistencia.toFixed(1))
  };
};

  // Función para cargar datos de verificación de asistencia
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



// Obtener datos de MongoDB - VERSIÓN OPTIMIZADA
const fetchDataFromDB = async (forceRefresh = false) => {
  // Si ya está refrescando y no forzamos refresh, salir
  if (refreshing && !forceRefresh) return;
  
  setRefreshing(true);
  setDbStatus('conectando');
  
  try {
    console.log('🔄 Carga optimizada de datos desde MongoDB...');
    
    // Usar Promise.all para cargar datos en paralelo
    const [statsResponse, attendanceResponse] = await Promise.all([
      fetch('/api/estadisticas'),
      fetch(`/api/asistencias?${new URLSearchParams({
        buscar: searchTerm || '',
        fecha: dateFilter || '',
        limite: '500' // Reducir límite para mejorar velocidad
      })}`)
    ]);

    // Procesar estadísticas
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      setStats(statsData.error ? {
        total_empleados: statsData.total_empleados || 0,
        empleados_activos: statsData.empleados_activos || 0,
        total_asistencias: statsData.total_asistencias || 0,
        asistencias_hoy: statsData.asistencias_hoy || 0,
        empleados_unicos_hoy: statsData.empleados_unicos_hoy || 0,
        registros_por_area: statsData.registros_por_area || {}
      } : statsData);
    }

    // Procesar asistencias
    if (attendanceResponse.ok) {
      const attendanceData = await attendanceResponse.json();
      
      // Crear mapa de empleados solo si es necesario
      let employeesMap = {};
      if (employees.length > 0) {
        employees.forEach(emp => {
          employeesMap[emp.numero_empleado] = {
            departamento: emp.departamento || '',
            nombre_completo: emp.nombre_completo || ''
          };
        });
      }
      
      const processedData = attendanceData.map(record => {
        const empleadoInfo = employeesMap[record.numero_empleado] || {};
        
        return {
          ...record,
          employeeId: record.numero_empleado || '',
          employeeName: record.nombre_empleado || empleadoInfo.nombre_completo || '',
          date: record.fecha || '',
          time: record.hora || '',
          timestamp: record.marca_tiempo || new Date().toISOString(),
          department: record.area_empleado || '',
          departamento: empleadoInfo.departamento || record.departamento || '',
          type: record.tipo_registro || 'entrada'
        };
      });
      
      setAttendanceData(processedData);
      console.log(`📝 ${processedData.length} registros cargados`);
    }
    
    // Cargar fechas disponibles en segundo plano
    fetchAvailableDates().catch(() => {
      console.warn('No se pudieron cargar fechas disponibles');
    });
    
    setLastUpdated(new Date());
    setDbStatus('conectado');
    
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    setDbStatus('error');
    
    // Datos de respaldo
    setStats({
      total_empleados: employees.length || 0,
      empleados_activos: employees.filter(e => e.activo).length || 0,
      total_asistencias: 0,
      asistencias_hoy: 0,
      empleados_unicos_hoy: 0,
      registros_por_area: {}
    });
    
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Función alternativa para conectar a APIs directamente
  const fetchDirectAPIs = async () => {
    try {
      console.log('🔄 Intentando conexión directa a APIs...');
      
      const empleadosResponse = await fetch('/api/empleados');
      let total_empleados = 0;
      let empleados_activos = 0;
      
      if (empleadosResponse.ok) {
        const empleados = await empleadosResponse.json();
        total_empleados = empleados.length;
        empleados_activos = empleados.filter(emp => emp.activo).length;
        setEmployees(empleados);
      }
      
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

  // Cargar empleados
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

  // ============ EFECTOS ============
  
// ============ EFECTOS ============
  
useEffect(() => {
  const loadInitialData = async () => {
    try {
      // 1. Primero cargar datos esenciales
      await fetchEmployees();
      
      // 2. Cargar estadísticas y datos básicos
      await fetchDataFromDB();
      
      // 3. Configurar semana inicial (no esperar)
      const weekNumber = getCurrentWeekNumber();
      const weekRange = getWeekRangeByNumber(weekNumber);
      setSelectedWeek(weekNumber);
      setWeekRange(weekRange);
      
      // 4. Cargar datos en paralelo para mejorar velocidad
      await Promise.all([
        fetchTiposFalta(),
        fetchAvailableWeeks(),
        fetchAvailableDates(),
        fetchWeeklyData(weekRange.start, weekRange.end) // Pasar fechas directamente
      ]);
      
    } catch (error) {
      console.error('Error en carga inicial:', error);
    }
  };
  
  loadInitialData();
  
  const interval = setInterval(fetchDataFromDB, 30000);
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    if (employees.length > 0 && !employeesLoading) {
      fetchAttendanceCheckData();
    }
  }, [employees, employeesLoading, attendanceData]);

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
  
  const getPaginatedData = (data, currentPage, itemsPerPage = ITEMS_PER_PAGE) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data, itemsPerPage = ITEMS_PER_PAGE) => {
    return Math.ceil(data.length / itemsPerPage);
  };

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
  
  // Exportar datos semanales a Excel con nuevo diseño
  // Función para exportar a Excel - VERSIÓN CORREGIDA
const exportWeeklyToExcel = async () => {
  try {
    let tiposFaltaPorFechaMap = {};
    let empleadosMap = {};

    try {
      // OBTENER SOLO LAS OBSERVACIONES DE LOS DÍAS ESPECÍFICOS DE LA SEMANA
      const fechaJueves = calcularFechaParaDiaSemana(selectedWeek, 'jueves');
      const fechaViernes = calcularFechaParaDiaSemana(selectedWeek, 'viernes');
      const fechaLunes = calcularFechaParaDiaSemana(selectedWeek, 'lunes');
      const fechaMartes = calcularFechaParaDiaSemana(selectedWeek, 'martes');
      const fechaMiercoles = calcularFechaParaDiaSemana(selectedWeek, 'miercoles');
      
      // Array con todas las fechas de la semana
      const fechasSemana = [fechaJueves, fechaViernes, fechaLunes, fechaMartes, fechaMiercoles];
      
      console.log('📅 Buscando observaciones para las fechas específicas:', fechasSemana);
      
      // Obtener observaciones para CADA fecha específica
      for (const fechaDia of fechasSemana) {
        const response = await fetch(`/api/observaciones?fecha=${fechaDia}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${data.length} observaciones para ${fechaDia}`);
          
          data.forEach(obs => {
            if (obs.tipoFalta && obs.tipoFalta.trim()) {
              const employeeId = obs.employeeId;
              if (!tiposFaltaPorFechaMap[employeeId]) {
                tiposFaltaPorFechaMap[employeeId] = {};
              }
              // Solo guardar si coincide con la fecha exacta
              if (obs.fecha === fechaDia) {
                tiposFaltaPorFechaMap[employeeId][fechaDia] = obs.tipoFalta;
                console.log(`📝 Empleado ${employeeId}: ${obs.tipoFalta} el ${fechaDia}`);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error cargando tipos de falta:', error);
    }

    try {
      const empRes = await fetch('/api/empleados');
      if (empRes.ok) {
        const data = await empRes.json();
        data.forEach(emp => {
          empleadosMap[emp.nombre_completo] = emp.numero_empleado;
        });
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }

    const weeklyDataFinal = weeklyData.map(row => {
      const num = empleadosMap[row.nombre];
      return { 
        ...row, 
        numero_empleado: num || 'N/A'
      };
    });

    if (!weeklyDataFinal.length) {
      alert('No hay datos para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Obtener fechas de cada día
    const fechaJueves = calcularFechaParaDiaSemana(selectedWeek, 'jueves');
    const fechaViernes = calcularFechaParaDiaSemana(selectedWeek, 'viernes');
    const fechaLunes = calcularFechaParaDiaSemana(selectedWeek, 'lunes');
    const fechaMartes = calcularFechaParaDiaSemana(selectedWeek, 'martes');
    const fechaMiercoles = calcularFechaParaDiaSemana(selectedWeek, 'miercoles');

    const headers = [
      'Número Empleado','Nombre','Área','Departamento',
      `Jueves\n${fechaJueves}`,
      `Viernes\n${fechaViernes}`,
      `Lunes\n${fechaLunes}`,
      `Martes\n${fechaMartes}`,
      `Miércoles\n${fechaMiercoles}`,
      'Faltas Totales'
    ];

    // Función corregida para formatear cada día
    const formatDia = (valor, esFuturo, esInactivo, esFinDeSemana, employeeId, fechaDia, esFalta = false) => {
      // Verificar si es fecha inactiva del sistema
      const esFechaInactivaSistema = esFechaInactiva(fechaDia);
      
      if (esFuturo || esInactivo || esFinDeSemana || esFechaInactivaSistema) return '';
      
      if (valor === 'X') {
        return 'Asistencia';
      } else if (valor === 'R') {
        return 'Retardo';
      } else {
        // SOLO buscar tipo de falta específico para esta fecha y este empleado
        if (esFalta && employeeId && fechaDia && tiposFaltaPorFechaMap[employeeId]) {
          const tipoFaltaEspecifico = tiposFaltaPorFechaMap[employeeId][fechaDia];
          if (tipoFaltaEspecifico && tipoFaltaEspecifico.trim()) {
            console.log(`✅ Usando tipo de falta específico: ${employeeId} - ${fechaDia}: ${tipoFaltaEspecifico}`);
            return tipoFaltaEspecifico.trim();
          }
        }
        
        // Si no hay tipo de falta específico, mostrar "Falta" solo si es falta real
        if (esFalta) {
          return 'Falta';
        }
        return '';
      }
    };

    const getFaltasTotales = r => {
      const dias = ['jueves','viernes','lunes','martes','miercoles'];
      return dias.filter(d => {
        const esFinDeSemana = r.esFinDeSemana?.[d];
        const fechaDia = calcularFechaParaDiaSemana(selectedWeek, d);
        const esFechaInactivaSistema = esFechaInactiva(fechaDia);
        
        return (
          (r[d] === '' || r[d] === undefined) && // Solo contar si está vacío
          !r.esFuturo?.[d] && 
          !r.esInactivo?.[d] &&
          !esFinDeSemana &&
          !esFechaInactivaSistema
        );
      }).length;
    };

    const rows = weeklyDataFinal.map(r => {
      const employeeId = r.numero_empleado;
      
      // Determinar si cada día es falta
      const esFaltaJueves = r.jueves !== 'X' && r.jueves !== 'R' && !r.esFuturo?.jueves && !r.esInactivo?.jueves && !r.esFinDeSemana?.jueves;
      const esFaltaViernes = r.viernes !== 'X' && r.viernes !== 'R' && !r.esFuturo?.viernes && !r.esInactivo?.viernes && !r.esFinDeSemana?.viernes;
      const esFaltaLunes = r.lunes !== 'X' && r.lunes !== 'R' && !r.esFuturo?.lunes && !r.esInactivo?.lunes && !r.esFinDeSemana?.lunes;
      const esFaltaMartes = r.martes !== 'X' && r.martes !== 'R' && !r.esFuturo?.martes && !r.esInactivo?.martes && !r.esFinDeSemana?.martes;
      const esFaltaMiercoles = r.miercoles !== 'X' && r.miercoles !== 'R' && !r.esFuturo?.miercoles && !r.esInactivo?.miercoles && !r.esFinDeSemana?.miercoles;
      
      return [
        r.numero_empleado,
        r.nombre,
        r.area,
        r.departamento || '',
        formatDia(r.jueves, r.esFuturo?.jueves, r.esInactivo?.jueves, r.esFinDeSemana?.jueves, employeeId, fechaJueves, esFaltaJueves),
        formatDia(r.viernes, r.esFuturo?.viernes, r.esInactivo?.viernes, r.esFinDeSemana?.viernes, employeeId, fechaViernes, esFaltaViernes),
        formatDia(r.lunes, r.esFuturo?.lunes, r.esInactivo?.lunes, r.esFinDeSemana?.lunes, employeeId, fechaLunes, esFaltaLunes),
        formatDia(r.martes, r.esFuturo?.martes, r.esInactivo?.martes, r.esFinDeSemana?.martes, employeeId, fechaMartes, esFaltaMartes),
        formatDia(r.miercoles, r.esFuturo?.miercoles, r.esInactivo?.miercoles, r.esFinDeSemana?.miercoles, employeeId, fechaMiercoles, esFaltaMiercoles),
        getFaltasTotales(r)
      ];
    });

    const sheetData = [
      ['REPORTE SEMANAL DE ASISTENCIAS'],
      [`Semana ${selectedWeek}: ${weekRange.start} al ${weekRange.end}`],
      [`Generado: ${new Date().toLocaleDateString('es-MX')} ${getCurrentJaliscoTime()} p.m.`],
      [],
      [`Total empleados: ${weeklyDataFinal.length}`],
      [`Faltas totales: ${weekStats.totalFaltas}`],
      [`Porcentaje de asistencia: ${weekStats.porcentajeAsistencia}%`],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const subtitleStyle = {
      font: { bold: true, sz: 12, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const statsStyle = {
      font: { bold: true, sz: 11, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2E5A8D' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    const cellStyle = {
      font: { sz: 11, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
        left: { style: 'thin', color: { rgb: 'E0E0E0' } },
        right: { style: 'thin', color: { rgb: 'E0E0E0' } }
      }
    };

    const nombreCellStyle = {
      font: { sz: 11, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
        left: { style: 'thin', color: { rgb: 'E0E0E0' } },
        right: { style: 'thin', color: { rgb: 'E0E0E0' } }
      }
    };

    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let R = 0; R <= range.e.r; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (!cell) continue;

        if (R === 0 || R === 1) {
          cell.s = titleStyle;
          if (R === 0) {
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
          }
          if (R === 1) {
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } });
          }
        }

        if (R === 2) {
          cell.s = subtitleStyle;
          if (!ws['!merges']) ws['!merges'] = [];
          ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } });
        }

        if (R >= 4 && R <= 6) {
          cell.s = statsStyle;
        }

        if (R === 8) {
          cell.s = headerStyle;
        }

        if (R > 8) {
          if (C === 1) {
            cell.s = nombreCellStyle;
          }
          else if (C >= 4 && C <= 8) {
            const cellValue = ws[XLSX.utils.encode_cell({ r: R, c: C })]?.v;
            const diaStyle = { ...cellStyle };
            
            if (cellValue === 'Asistencia') {
              diaStyle.fill = { fgColor: { rgb: 'C6EFCE' } };
              diaStyle.font = { ...diaStyle.font, color: { rgb: '006100' }, bold: true };
            } else if (cellValue === 'Retardo') {
              diaStyle.fill = { fgColor: { rgb: 'FFEB9C' } };
              diaStyle.font = { ...diaStyle.font, color: { rgb: '9C5700' }, bold: true };
            } else if (cellValue === 'Falta') {
              diaStyle.fill = { fgColor: { rgb: 'FFC7CE' } };
              diaStyle.font = { ...diaStyle.font, color: { rgb: '9C0006' }, bold: true };
            } else if (cellValue === 'Vacaciones') {
              diaStyle.fill = { fgColor: { rgb: 'FFEB9C' } };
              diaStyle.font = { ...diaStyle.font, color: { rgb: '9C5700' }, bold: true };
            } else if (cellValue === 'Incapacidad') {
              diaStyle.fill = { fgColor: { rgb: 'DDEBF7' } };
              diaStyle.font = { ...diaStyle.font, color: { rgb: '2F5496' }, bold: true };
            } else if (cellValue === 'Prestamo') {
              diaStyle.fill = { fgColor: { rgb: 'EADDFF' } };
              diaStyle.font = { ...diaStyle.font, color: { rgb: '5A3D8A' }, bold: true };
            }
            
            cell.s = diaStyle;
          }
          else if (C === 9) {
            const cellValue = ws[XLSX.utils.encode_cell({ r: R, c: C })]?.v;
            const faltasStyle = { ...cellStyle };
            
            if (cellValue > 0) {
              faltasStyle.fill = { fgColor: { rgb: 'FFC7CE' } };
              faltasStyle.font = { ...faltasStyle.font, color: { rgb: '9C0006' }, bold: true };
            } else {
              faltasStyle.fill = { fgColor: { rgb: 'C6EFCE' } };
              faltasStyle.font = { ...faltasStyle.font, color: { rgb: '006100' }, bold: true };
            }
            
            cell.s = faltasStyle;
          }
          else {
            cell.s = cellStyle;
          }
        }
      }
    }

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }
    ];

    ws['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 }
    ];

    ws['!freeze'] = { xSplit: 0, ySplit: 8, topLeftCell: 'A9', activePane: 'bottomRight' };

    XLSX.utils.book_append_sheet(wb, ws, `Semana ${selectedWeek}`);

    XLSX.writeFile(
      wb,
      `REPORTE_SEMANAL_ASISTENCIAS_SEMANA_${selectedWeek}_${weekRange.start.replace(/\//g, '-')}.xlsx`
    );

    console.log('✅ Reporte semanal exportado con tipos de falta específicos por fecha');
  } catch (e) {
    console.error('❌ Error al exportar reporte semanal:', e);
    alert('Error al exportar el Excel. Por favor, intente nuevamente.');
  }
};

  // Exportar datos semanales a PDF con tipos de falta
  // Exportar datos semanales a PDF - VERSIÓN CORREGIDA
const exportWeeklyToPDF = async () => {
  try {
    const { jsPDF } = await import('jspdf');

    let tiposFaltaPorFechaMap = {};
    
    try {
      // OBTENER SOLO LAS OBSERVACIONES DE LOS DÍAS ESPECÍFICOS DE LA SEMANA
      const fechaJueves = calcularFechaParaDiaSemana(selectedWeek, 'jueves');
      const fechaViernes = calcularFechaParaDiaSemana(selectedWeek, 'viernes');
      const fechaLunes = calcularFechaParaDiaSemana(selectedWeek, 'lunes');
      const fechaMartes = calcularFechaParaDiaSemana(selectedWeek, 'martes');
      const fechaMiercoles = calcularFechaParaDiaSemana(selectedWeek, 'miercoles');
      
      // Array con todas las fechas de la semana
      const fechasSemana = [fechaJueves, fechaViernes, fechaLunes, fechaMartes, fechaMiercoles];
      
      console.log('📅 Buscando observaciones para PDF:', fechasSemana);
      
      for (const fechaDia of fechasSemana) {
        const response = await fetch(`/api/observaciones?fecha=${fechaDia}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${data.length} observaciones para ${fechaDia}`);
          
          data.forEach(obs => {
            if (obs.tipoFalta && obs.tipoFalta.trim()) {
              const employeeId = obs.employeeId;
              if (!tiposFaltaPorFechaMap[employeeId]) {
                tiposFaltaPorFechaMap[employeeId] = {};
              }
              // Solo guardar si coincide con la fecha exacta
              if (obs.fecha === fechaDia) {
                tiposFaltaPorFechaMap[employeeId][fechaDia] = obs.tipoFalta;
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error cargando tipos de falta para PDF:', error);
    }

    let empleadosMap = {};
    try {
      const empRes = await fetch('/api/empleados');
      if (empRes.ok) {
        const data = await empRes.json();
        data.forEach(emp => {
          empleadosMap[emp.nombre_completo] = emp.numero_empleado;
        });
      }
    } catch {}

    const weeklyDataFinal = weeklyData.map(row => {
      const num = empleadosMap[row.nombre];
      return {
        ...row,
        numero_empleado: num || 'N/A'
      };
    });

    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const MAX_ROWS = 12;
    const totalPages = Math.ceil(weeklyDataFinal.length / MAX_ROWS);

    // Función corregida para renderizar cada día
    const renderDay = (valor, esFuturo, esInactivo, esFinDeSemana, employeeId, fechaDia) => {
      const esFechaInactivaSistema = esFechaInactiva(fechaDia);
      
      if (esFuturo || esInactivo || esFinDeSemana || esFechaInactivaSistema) return { t: '—', c: [156, 163, 175] };
      if (valor === 'X') return { t: '✓', c: [16, 185, 129] };
      if (valor === 'R') return { t: 'R', c: [245, 158, 11] };
      
      // Buscar tipo de falta específico para esta fecha
      if (employeeId && fechaDia && tiposFaltaPorFechaMap[employeeId] && tiposFaltaPorFechaMap[employeeId][fechaDia]) {
        const tipoFalta = tiposFaltaPorFechaMap[employeeId][fechaDia];
        let color;
        switch(tipoFalta) {
          case 'Vacaciones': color = [255, 235, 156]; break;
          case 'Incapacidad': color = [221, 235, 247]; break;
          case 'Prestamo': color = [234, 221, 255]; break;
          case 'Falta': color = [255, 199, 206]; break;
          default: color = [255, 199, 206]; break;
        }
        return { t: tipoFalta.charAt(0), c: color, texto: tipoFalta };
      }
      
      // Si no hay asistencia y no hay tipo de falta específico, es falta
      return { t: '✗', c: [239, 68, 68] };
    };

    const drawHeader = (page) => {
      pdf.setDrawColor(229, 231, 235);
      pdf.line(10, 26, pageWidth - 10, 26);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Reporte Semanal de Asistencias', 15, 15);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        `Semana ${selectedWeek} · ${weekRange.start} al ${weekRange.end}`,
        15,
        22
      );

      pdf.text(
        `Página ${page} de ${totalPages}`,
        pageWidth - 15,
        22,
        { align: 'right' }
      );

      const y = 30;
      const cardW = 42;
      const gap = 6;

      const metrics = [
        { t: 'Empleados', v: weeklyDataFinal.length },
        { t: 'Faltas', v: weekStats.totalFaltas },
        { t: '% Asistencia', v: `${weekStats.porcentajeAsistencia}%` }
      ];

      metrics.forEach((m, i) => {
        const x = 15 + i * (cardW + gap);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(x, y, cardW, 18, 3, 3);

        pdf.setFontSize(7);
        pdf.setTextColor(107, 114, 128);
        pdf.text(m.t, x + cardW / 2, y + 6, { align: 'center' });

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(String(m.v), x + cardW / 2, y + 14, { align: 'center' });
      });
    };

    const colW = [45, 25, 35, 8, 8, 8, 8, 8, 12, 30];

    const drawTableHeader = (y) => {
      pdf.setFillColor(243, 244, 246);
      pdf.rect(10, y, pageWidth - 20, 9, 'F');

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);

      const headers = ['Nombre', 'Área', 'Departamento', 'J', 'V', 'L', 'M', 'X', 'Faltas', 'Tipos por Día'];
      let x = 12;
      headers.forEach((h, i) => {
        pdf.text(h, x + colW[i] / 2, y + 6, { align: 'center' });
        x += colW[i];
      });
    };

    const drawRow = (row, y) => {
      let x = 12;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      const nombre = row.nombre.length > 20 ? row.nombre.substring(0, 20) + '...' : row.nombre;
      pdf.text(nombre, x + 2, y + 6);
      x += colW[0];

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(row.area || '—', x + 2, y + 6);
      x += colW[1];

      pdf.text(row.departamento || '—', x + 2, y + 6);
      x += colW[2];

      const dias = [
        { 
          v: row.jueves, 
          f: row.esFuturo?.jueves, 
          i: row.esInactivo?.jueves, 
          fs: row.esFinDeSemana?.jueves,
          fecha: calcularFechaParaDiaSemana(selectedWeek, 'jueves')
        },
        { 
          v: row.viernes, 
          f: row.esFuturo?.viernes, 
          i: row.esInactivo?.viernes, 
          fs: row.esFinDeSemana?.viernes,
          fecha: calcularFechaParaDiaSemana(selectedWeek, 'viernes')
        },
        { 
          v: row.lunes, 
          f: row.esFuturo?.lunes, 
          i: row.esInactivo?.lunes, 
          fs: row.esFinDeSemana?.lunes,
          fecha: calcularFechaParaDiaSemana(selectedWeek, 'lunes')
        },
        { 
          v: row.martes, 
          f: row.esFuturo?.martes, 
          i: row.esInactivo?.martes, 
          fs: row.esFinDeSemana?.martes,
          fecha: calcularFechaParaDiaSemana(selectedWeek, 'martes')
        },
        { 
          v: row.miercoles, 
          f: row.esFuturo?.miercoles, 
          i: row.esInactivo?.miercoles, 
          fs: row.esFinDeSemana?.miercoles,
          fecha: calcularFechaParaDiaSemana(selectedWeek, 'miercoles')
        }
      ];

      dias.forEach(d => {
        const r = renderDay(d.v, d.f, d.i, d.fs, row.numero_empleado, d.fecha);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...r.c);
        pdf.text(r.t, x + colW[3] / 2, y + 6, { align: 'center' });
        x += colW[3];
      });

      pdf.setTextColor(17, 24, 39);
      const faltasTotales = ['jueves','viernes','lunes','martes','miercoles']
        .filter(d => {
          const esFinDeSemana = row.esFinDeSemana?.[d];
          const fechaDia = calcularFechaParaDiaSemana(selectedWeek, d);
          const esFechaInactivaSistema = esFechaInactiva(fechaDia);
          
          return (
            row[d] !== 'X' && 
            row[d] !== 'R' && // No contar retardos como faltas
            !row.esFuturo?.[d] && 
            !row.esInactivo?.[d] &&
            !esFinDeSemana &&
            !esFechaInactivaSistema
          );
        }).length;
      pdf.text(String(faltasTotales), x + colW[8] / 2, y + 6, { align: 'center' });
      x += colW[8];

      // Mostrar tipos de falta por día (solo de esta semana)
      let tiposPorDia = [];
      dias.forEach((d, idx) => {
        if (d.v !== 'X' && d.v !== 'R' && !d.f && !d.i && !d.fs) {
          const r = renderDay(d.v, d.f, d.i, d.fs, row.numero_empleado, d.fecha);
          if (r.texto) {
            tiposPorDia.push(r.texto);
          }
        }
      });
      
      const tiposTexto = tiposPorDia.length > 0 ? tiposPorDia.join(', ') : '—';
      const tiposShort = tiposTexto.length > 20 ? tiposTexto.substring(0, 20) + '...' : tiposTexto;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(75, 85, 99);
      pdf.text(tiposShort, x + 2, y + 6);

      pdf.setDrawColor(229, 231, 235);
      pdf.line(10, y + 9, pageWidth - 10, y + 9);
    };

    let page = 1;
    for (let i = 0; i < weeklyDataFinal.length; i += MAX_ROWS) {
      if (page > 1) pdf.addPage();
      drawHeader(page);

      let y = 55;
      drawTableHeader(y);
      y += 9;

      weeklyDataFinal.slice(i, i + MAX_ROWS).forEach(row => {
        drawRow(row, y);
        y += 10;
      });

      page++;
    }

    pdf.setPage(totalPages);
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    
    const leyenda = [
      '✓ = Asistencia',
      'R = Retardo',
      '✗ = Falta',
      'V = Vacaciones',
      'I = Incapacidad',
      'P = Préstamo',
      '— = No aplica'
    ];
    
    let xPos = 15;
    leyenda.forEach((text, index) => {
      pdf.text(text, xPos, pageHeight - 12);
      xPos += 35;
    });

    pdf.save(`reporte_semana_${selectedWeek}.pdf`);
  } catch (e) {
    console.error(e);
    alert('Error al generar PDF');
  }
};

  // Exportar registros de asistencia con diseño similar
  const exportAllToExcel = () => {
    try {
      const filteredData = attendanceData.filter(r => {
        const matchesSearch =
          r.numero_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.nombre_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.area_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.departamento?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDate = !dateFilter || r.fecha === dateFilter || r.date === dateFilter;
        return matchesSearch && matchesDate;
      });

      if (filteredData.length === 0) {
        alert('No hay datos de asistencia para exportar');
        return;
      }

      const wb = XLSX.utils.book_new();

      const titleRow1 = ['REPORTE DE REGISTROS DE ASISTENCIA'];
      const titleRow2 = [dateFilter ? `Fecha: ${dateFilter}` : 'Rango: Todas las fechas'];
      const titleRow3 = [`Generado: ${new Date().toLocaleDateString('es-MX')} ${getCurrentJaliscoTime()} p.m.`];
      const titleRow4 = [];
      
      const entradas = filteredData.filter(r => (r.tipo_registro || r.type) === 'entrada').length;
      const salidas = filteredData.filter(r => (r.tipo_registro || r.type) === 'salida').length;
      const empleadosUnicos = [...new Set(filteredData.map(r => r.numero_empleado || r.employeeId))].length;
      
      const statsRow1 = [`Total registros: ${filteredData.length}`];
      const statsRow2 = [`Registros de entrada: ${entradas}`];
      const statsRow3 = [`Registros de salida: ${salidas}`];
      const statsRow4 = [`Empleados únicos: ${empleadosUnicos}`];
      if (searchTerm) {
        statsRow4.push(`Búsqueda: "${searchTerm}"`);
      }
      const statsRow5 = [];
      
      const headers = [
        'Número Empleado',
        'Nombre',
        'Área',
        'Departamento',
        'Fecha',
        'Hora',
        'Tipo de Registro'
      ];

      const rows = filteredData.map(r => ([
        r.numero_empleado || r.employeeId || 'N/A',
        r.nombre_empleado || r.employeeName || 'SIN NOMBRE',
        r.area_empleado || r.department || '',
        r.departamento || '',
        r.fecha || r.date || '',
        r.hora || r.time || '',
        (r.tipo_registro || r.type || 'entrada').toUpperCase()
      ]));

      const sheetData = [
        titleRow1,
        titleRow2,
        titleRow3,
        titleRow4,
        statsRow1,
        statsRow2,
        statsRow3,
        statsRow4,
        statsRow5,
        headers,
        ...rows
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const subtitleStyle = {
        font: { bold: true, sz: 12, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const statsStyle = {
        font: { bold: true, sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2E5A8D' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const cellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const nombreCellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const range = XLSX.utils.decode_range(ws['!ref']);

      for (let R = 0; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;

          if (R === 0 || R === 1) {
            cell.s = titleStyle;
            if (R === 0) {
              if (!ws['!merges']) ws['!merges'] = [];
              ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
            }
            if (R === 1) {
              if (!ws['!merges']) ws['!merges'] = [];
              ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } });
            }
          }

          if (R === 2) {
            cell.s = subtitleStyle;
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } });
          }

          if (R >= 4 && R <= 7) {
            cell.s = statsStyle;
          }

          if (R === 10) {
            cell.s = headerStyle;
          }

          if (R > 10) {
            if (C === 1) {
              cell.s = nombreCellStyle;
            }
            else {
              cell.s = cellStyle;
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 16 },
        { wch: 30 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
        { wch: 10 },
        { wch: 16 }
      ];

      ws['!freeze'] = { xSplit: 0, ySplit: 10, topLeftCell: 'A12', activePane: 'bottomRight' };

      XLSX.utils.book_append_sheet(wb, ws, 'Registros Asistencia');

      let fileName = 'REPORTE_REGISTROS_ASISTENCIA';
      if (dateFilter) fileName += `_${dateFilter.replace(/\//g, '-')}`;
      if (searchTerm) {
        const termShort = searchTerm.substring(0, 10).replace(/\s+/g, '_');
        fileName += `_BUSQUEDA_${termShort}`;
      }
      fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(wb, fileName);

      console.log('✅ Registros de asistencia exportados con diseño de imagen');
    } catch (e) {
      console.error('❌ Error al exportar registros:', e);
      alert('Error al exportar los registros. Por favor, intente nuevamente.');
    }
  };

  // Exportar lista de empleados con diseño similar
  const exportEmployeesToExcel = () => {
    try {
      if (employees.length === 0) {
        alert('No hay empleados para exportar');
        return;
      }

      const wb = XLSX.utils.book_new();

      const titleRow1 = ['REPORTE DE EMPLEADOS REGISTRADOS'];
      const titleRow2 = ['Sistema de Control de Asistencias'];
      const titleRow3 = [`Generado: ${new Date().toLocaleDateString('es-MX')} ${getCurrentJaliscoTime()} p.m.`];
      const titleRow4 = [];
      
      const activos = employees.filter(e => e.activo).length;
      const inactivos = employees.filter(e => !e.activo).length;
      const porcentajeActivos = employees.length > 0 ? ((activos / employees.length) * 100).toFixed(1) : 0;
      
      const statsRow1 = [`Total empleados: ${employees.length}`];
      const statsRow2 = [`Empleados activos: ${activos}`];
      const statsRow3 = [`Empleados inactivos: ${inactivos}`];
      const statsRow4 = [`Porcentaje activos: ${porcentajeActivos}%`];
      const statsRow5 = [];
      
      const headers = [
        'Número Empleado',
        'Nombre Completo',
        'Área',
        'Departamento',
        'Estado'
      ];

      const rows = employees.map(e => ([
        e.numero_empleado,
        e.nombre_completo,
        e.area,
        e.departamento || '—',
        e.activo ? 'ACTIVO' : 'INACTIVO'
      ]));

      const sheetData = [
        titleRow1,
        titleRow2,
        titleRow3,
        titleRow4,
        statsRow1,
        statsRow2,
        statsRow3,
        statsRow4,
        statsRow5,
        headers,
        ...rows
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const subtitleStyle = {
        font: { bold: true, sz: 12, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const statsStyle = {
        font: { bold: true, sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2E5A8D' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const cellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const nombreCellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const estadoCellStyle = {
        font: { bold: true, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const range = XLSX.utils.decode_range(ws['!ref']);

      for (let R = 0; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;

          if (R === 0 || R === 1) {
            cell.s = titleStyle;
            if (R === 0) {
              if (!ws['!merges']) ws['!merges'] = [];
              ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
            }
            if (R === 1) {
              if (!ws['!merges']) ws['!merges'] = [];
              ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } });
            }
          }

          if (R === 2) {
            cell.s = subtitleStyle;
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } });
          }

          if (R >= 4 && R <= 7) {
            cell.s = statsStyle;
          }

          if (R === 10) {
            cell.s = headerStyle;
          }

          if (R > 10) {
            if (C === 1) {
              cell.s = nombreCellStyle;
            }
            else if (C === headers.length - 1) {
              const cellValue = ws[XLSX.utils.encode_cell({ r: R, c: C })]?.v;
              if (cellValue === 'ACTIVO') {
                cell.s = { 
                  ...estadoCellStyle,
                  font: { ...estadoCellStyle.font, color: { rgb: '228B22' } },
                  fill: { fgColor: { rgb: 'F0FFF0' } }
                };
              } else {
                cell.s = { 
                  ...estadoCellStyle,
                  font: { ...estadoCellStyle.font, color: { rgb: 'DC143C' } },
                  fill: { fgColor: { rgb: 'FFF0F0' } }
                };
              }
            }
            else {
              cell.s = cellStyle;
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 16 },
        { wch: 35 },
        { wch: 15 },
        { wch: 18 },
        { wch: 14 }
      ];

      ws['!freeze'] = { xSplit: 0, ySplit: 10, topLeftCell: 'A12', activePane: 'bottomRight' };

      XLSX.utils.book_append_sheet(wb, ws, 'Empleados');

      const fileName = `REPORTE_EMPLEADOS_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log('✅ Lista de empleados exportada con diseño de imagen');
    } catch (e) {
      console.error('❌ Error al exportar empleados:', e);
      alert('Error al exportar la lista de empleados. Por favor, intente nuevamente.');
    }
  };

  const exportEmployeesToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const MAX_ROWS = 12;
      const totalPages = Math.ceil(employees.length / MAX_ROWS);

      const drawHeader = (page) => {
        pdf.setDrawColor(229, 231, 235);
        pdf.line(10, 26, pageWidth - 10, 26);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(17, 24, 39);
        pdf.text('Reporte de Empleados', 15, 15);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(
          `Total empleados: ${employees.length} · Activos: ${employees.filter(e => e.activo).length}`,
          15,
          22
        );

        pdf.text(
          `Página ${page} de ${totalPages}`,
          pageWidth - 15,
          22,
          { align: 'right' }
        );

        const y = 30;
        const cardW = 45;
        const gap = 6;

        const activos = employees.filter(e => e.activo).length;
        const inactivos = employees.filter(e => !e.activo).length;

        const metrics = [
          { t: 'Total', v: employees.length },
          { t: 'Activos', v: activos },
          { t: 'Inactivos', v: inactivos },
          { t: '% Activos', v: `${((activos / employees.length) * 100).toFixed(1)}%` }
        ];

        metrics.forEach((m, i) => {
          const x = 15 + i * (cardW + gap);
          pdf.setDrawColor(229, 231, 235);
          pdf.roundedRect(x, y, cardW, 18, 3, 3);

          pdf.setFontSize(7);
          pdf.setTextColor(107, 114, 128);
          pdf.text(m.t, x + cardW / 2, y + 6, { align: 'center' });

          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(String(m.v), x + cardW / 2, y + 14, { align: 'center' });
        });
      };

      const colW = [20, 60, 40, 45, 20, 30];

      const drawTableHeader = (y) => {
        pdf.setFillColor(243, 244, 246);
        pdf.rect(10, y, pageWidth - 20, 9, 'F');

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);

        const headers = ['N°', 'Nombre Completo', 'Área', 'Departamento', 'Estado', 'Última Actualización'];
        let x = 12;
        headers.forEach((h, i) => {
          pdf.text(h, x + colW[i] / 2, y + 6, { align: 'center' });
          x += colW[i];
        });
      };

      const drawRow = (row, index, y) => {
        let x = 12;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(row.numero_empleado, x + colW[0] / 2, y + 6, { align: 'center' });
        x += colW[0];

        pdf.setFont('helvetica', 'normal');
        const nombre = row.nombre_completo.length > 25 ? row.nombre_completo.substring(0, 25) + '...' : row.nombre_completo;
        pdf.text(nombre, x + 2, y + 6);
        x += colW[1];

        pdf.text(row.area || '—', x + 2, y + 6);
        x += colW[2];

        pdf.text(row.departamento || '—', x + 2, y + 6);
        x += colW[3];

        pdf.setFont('helvetica', 'bold');
        if (row.activo) {
          pdf.setTextColor(16, 185, 129);
          pdf.text('ACTIVO', x + colW[4] / 2, y + 6, { align: 'center' });
        } else {
          pdf.setTextColor(239, 68, 68);
          pdf.text('INACTIVO', x + colW[4] / 2, y + 6, { align: 'center' });
        }
        x += colW[4];

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        const hoy = new Date().toLocaleDateString('es-MX');
        pdf.text(hoy, x + colW[5] / 2, y + 6, { align: 'center' });

        pdf.setDrawColor(229, 231, 235);
        pdf.line(10, y + 9, pageWidth - 10, y + 9);
      };

      let page = 1;
      for (let i = 0; i < employees.length; i += MAX_ROWS) {
        if (page > 1) pdf.addPage();
        drawHeader(page);

        let y = 55;
        drawTableHeader(y);
        y += 9;

        employees.slice(i, i + MAX_ROWS).forEach((row, index) => {
          drawRow(row, i + index, y);
          y += 10;
        });

        page++;
      }

      pdf.setPage(totalPages);
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        'Sistema de Control de Asistencias · Todos los derechos reservados',
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );

      pdf.save(`reporte_empleados_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF de empleados');
    }
  };

  // Exportar verificación de asistencia diaria con diseño similar
  const exportAttendanceCheckToExcel = async () => {
    try {
      if (attendanceCheckData.length === 0) {
        alert('No hay datos de verificación para exportar');
        return;
      }

      const wb = XLSX.utils.book_new();

      const titleRow1 = ['VERIFICACIÓN DIARIA DE ASISTENCIA'];
      const titleRow2 = [`Fecha: ${currentDate}`];
      const titleRow3 = [`Generado: ${new Date().toLocaleDateString('es-MX')} ${getCurrentJaliscoTime()} p.m.`];
      const titleRow4 = [];
      
      const asistieron = attendanceCheckData.filter(e => e.attendedToday).length;
      const antes9AM = attendanceCheckData.filter(e => e.before9AM).length;
      const sinRegistro = attendanceCheckData.filter(e => !e.attendedToday).length;
      const porcentaje = attendanceCheckData.length > 0 ? ((asistieron / attendanceCheckData.length) * 100).toFixed(1) : 0;
      
      const statsRow1 = [`Total empleados: ${attendanceCheckData.length}`];
      const statsRow2 = [`Asistieron hoy: ${asistieron}`];
      const statsRow3 = [`Antes de 9:00 AM: ${antes9AM}`];
      const statsRow4 = [`Sin registro: ${sinRegistro}`];
      const statsRow5 = [`Porcentaje de asistencia: ${porcentaje}%`];
      const statsRow6 = [];
      
      const headers = [
        'Número Empleado',
        'Nombre',
        'Área',
        'Departamento',
        'Asistió Hoy',
        'Antes 9:00 AM',
        'Tipo de Registro',
        'Última Hora',
        'Tipo de Falta'
      ];

      const rows = attendanceCheckData.map(e => {
        const tipoFalta = tiposFalta[e.id] || '';
        
        return [
          e.id,
          e.name,
          e.area,
          e.departamento || '',
          e.attendedToday ? 'SÍ' : 'NO',
          e.before9AM ? 'SÍ' : 'NO',
          e.attendanceType?.toUpperCase() || 'SIN REGISTRO',
          e.lastTime || '--:--',
          tipoFalta
        ];
      });

      const sheetData = [
        titleRow1,
        titleRow2,
        titleRow3,
        titleRow4,
        statsRow1,
        statsRow2,
        statsRow3,
        statsRow4,
        statsRow5,
        statsRow6,
        headers,
        ...rows
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const subtitleStyle = {
        font: { bold: true, sz: 12, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const statsStyle = {
        font: { bold: true, sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2E5A8D' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const cellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const nombreCellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const tipoFaltaCellStyle = {
        font: { sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
          left: { style: 'thin', color: { rgb: 'E0E0E0' } },
          right: { style: 'thin', color: { rgb: 'E0E0E0' } }
        }
      };

      const range = XLSX.utils.decode_range(ws['!ref']);

      for (let R = 0; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;

          if (R === 0 || R === 1) {
            cell.s = titleStyle;
            if (R === 0) {
              if (!ws['!merges']) ws['!merges'] = [];
              ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
            }
            if (R === 1) {
              if (!ws['!merges']) ws['!merges'] = [];
              ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } });
            }
          }

          if (R === 2) {
            cell.s = subtitleStyle;
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } });
          }

          if (R >= 4 && R <= 8) {
            cell.s = statsStyle;
          }

          if (R === 10) {
            cell.s = headerStyle;
          }

          if (R > 10) {
            if (C === 1) {
              cell.s = nombreCellStyle;
            }
            else if (C === headers.length - 1) {
              const cellValue = ws[XLSX.utils.encode_cell({ r: R, c: C })]?.v;
              const style = { ...tipoFaltaCellStyle };
              
              if (cellValue === 'Vacaciones') {
                style.fill = { fgColor: { rgb: 'FFEB9C' } };
                style.font = { ...style.font, color: { rgb: '9C5700' }, bold: true };
              } else if (cellValue === 'Falta') {
                style.fill = { fgColor: { rgb: 'FFC7CE' } };
                style.font = { ...style.font, color: { rgb: '9C0006' }, bold: true };
              } else if (cellValue === 'Incapacidad') {
                style.fill = { fgColor: { rgb: 'DDEBF7' } };
                style.font = { ...style.font, color: { rgb: '2F5496' }, bold: true };
              } else if (cellValue === 'Prestamo') {
                style.fill = { fgColor: { rgb: 'EADDFF' } };
                style.font = { ...style.font, color: { rgb: '5A3D8A' }, bold: true };
              }
              
              cell.s = style;
            }
            else {
              cell.s = cellStyle;
            }
          }
        }
      }

      ws['!cols'] = [
        { wch: 16 },
        { wch: 30 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 15 }
      ];

      ws['!freeze'] = { xSplit: 0, ySplit: 10, topLeftCell: 'A12', activePane: 'bottomRight' };

      const safeDate = currentDate.replace(/\//g, '-');
      XLSX.utils.book_append_sheet(wb, ws, `Verificacion ${safeDate}`);

      const fileName = `VERIFICACION_ASISTENCIA_${currentDate.replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log('✅ Verificación diaria exportada con diseño de imagen');
    } catch (e) {
      console.error('❌ Error al exportar verificación:', e);
      alert('Error al exportar la verificación. Por favor, intente nuevamente.');
    }
  };

  const exportAttendanceCheckToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');

      const checkDataFinal = attendanceCheckData.map(employee => {
        const tipoFalta = tiposFalta[employee.id] || '—';
        
        return {
          ...employee,
          tipoFalta: tipoFalta.trim() ? tipoFalta : '—'
        };
      });

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const MAX_ROWS = 12;
      const totalPages = Math.ceil(checkDataFinal.length / MAX_ROWS);

      const drawHeader = (page) => {
        pdf.setDrawColor(229, 231, 235);
        pdf.line(10, 26, pageWidth - 10, 26);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(17, 24, 39);
        pdf.text('Verificación de Asistencia Diaria', 15, 15);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(
          `Fecha: ${currentDate} · Hora de corte: 9:00 AM`,
          15,
          22
        );

        pdf.text(
          `Página ${page} de ${totalPages}`,
          pageWidth - 15,
          22,
          { align: 'right' }
        );

        const y = 30;
        const cardW = 40;
        const gap = 6;

        const asistieron = checkDataFinal.filter(e => e.attendedToday).length;
        const antes9AM = checkDataFinal.filter(e => e.before9AM).length;
        const sinRegistro = checkDataFinal.filter(e => !e.attendedToday).length;
        const porcentaje = checkDataFinal.length > 0 ? ((asistieron / checkDataFinal.length) * 100).toFixed(1) : 0;

        const metrics = [
          { t: 'Empleados', v: checkDataFinal.length },
          { t: 'Asistieron', v: asistieron },
          { t: 'Antes 9 AM', v: antes9AM },
          { t: '% Asistencia', v: `${porcentaje}%` },
          { t: 'Sin Registro', v: sinRegistro }
        ];

        metrics.forEach((m, i) => {
          const x = 10 + i * (cardW + gap);
          pdf.setDrawColor(229, 231, 235);
          pdf.roundedRect(x, y, cardW, 18, 3, 3);

          pdf.setFontSize(7);
          pdf.setTextColor(107, 114, 128);
          pdf.text(m.t, x + cardW / 2, y + 6, { align: 'center' });

          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(String(m.v), x + cardW / 2, y + 14, { align: 'center' });
        });
      };

      const colW = [22, 45, 28, 32, 18, 20, 22, 18, 20];

      const drawTableHeader = (y) => {
        pdf.setFillColor(243, 244, 246);
        pdf.rect(10, y, pageWidth - 20, 9, 'F');

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);

        const headers = ['N° Emp', 'Nombre', 'Área', 'Departamento', 'Asistió', 'Antes 9AM', 'Tipo', 'Hora', 'Tipo Falta'];
        let x = 12;
        headers.forEach((h, i) => {
          pdf.text(h, x + colW[i] / 2, y + 6, { align: 'center' });
          x += colW[i];
        });
      };

      const drawRow = (row, y) => {
        let x = 12;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(row.id || '—', x + colW[0] / 2, y + 6, { align: 'center' });
        x += colW[0];

        pdf.setFont('helvetica', 'normal');
        const nombre = row.name.length > 18 ? row.name.substring(0, 18) + '...' : row.name;
        pdf.text(nombre, x + 2, y + 6);
        x += colW[1];

        pdf.text(row.area || '—', x + 2, y + 6);
        x += colW[2];

        pdf.text(row.departamento || '—', x + 2, y + 6);
        x += colW[3];

        pdf.setFont('helvetica', 'bold');
        if (row.attendedToday) {
          pdf.setTextColor(16, 185, 129);
          pdf.text('SÍ', x + colW[4] / 2, y + 6, { align: 'center' });
        } else {
          pdf.setTextColor(239, 68, 68);
          pdf.text('NO', x + colW[4] / 2, y + 6, { align: 'center' });
        }
        x += colW[4];

        if (row.before9AM) {
          pdf.setTextColor(16, 185, 129);
          pdf.text('SÍ', x + colW[5] / 2, y + 6, { align: 'center' });
        } else {
          pdf.setTextColor(239, 68, 68);
          pdf.text('NO', x + colW[5] / 2, y + 6, { align: 'center' });
        }
        x += colW[5];

        pdf.setTextColor(75, 85, 99);
        pdf.setFont('helvetica', 'normal');
        const tipo = row.attendanceType || 'Sin registro';
        const tipoShort = tipo.length > 8 ? tipo.substring(0, 8) + '...' : tipo;
        pdf.text(tipoShort.toUpperCase(), x + colW[6] / 2, y + 6, { align: 'center' });
        x += colW[6];

        pdf.text(row.lastTime || '—', x + colW[7] / 2, y + 6, { align: 'center' });
        x += colW[7];

        const tipoFalta = row.tipoFalta || '—';
        const tipoFaltaShort = tipoFalta.length > 10 ? tipoFalta.substring(0, 10) + '...' : tipoFalta;
        pdf.text(tipoFaltaShort, x + colW[8] / 2, y + 6, { align: 'center' });

        pdf.setDrawColor(229, 231, 235);
        pdf.line(10, y + 9, pageWidth - 10, y + 9);
      };

      let page = 1;
      for (let i = 0; i < checkDataFinal.length; i += MAX_ROWS) {
        if (page > 1) pdf.addPage();
        drawHeader(page);

        let y = 55;
        drawTableHeader(y);
        y += 9;

        checkDataFinal.slice(i, i + MAX_ROWS).forEach((row) => {
          drawRow(row, y);
          y += 10;
        });

        page++;
      }

      pdf.setPage(totalPages);
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        'Generado por Sistema de Control de Asistencias · Jalisco UTC-6',
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );

      pdf.save(`verificacion_asistencia_${currentDate.replace(/\//g, '-')}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF de verificación');
    }
  };

  const exportAttendanceToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');

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

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const MAX_ROWS = 12;
      const totalPages = Math.ceil(filteredData.length / MAX_ROWS);

      const drawHeader = (page) => {
        pdf.setDrawColor(229, 231, 235);
        pdf.line(10, 26, pageWidth - 10, 26);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(17, 24, 39);
        pdf.text('Reporte de Asistencias', 15, 15);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        
        let subtitulo = `Total registros: ${filteredData.length}`;
        if (dateFilter) subtitulo += ` · Fecha: ${dateFilter}`;
        if (searchTerm) subtitulo += ` · Búsqueda: "${searchTerm.substring(0, 20)}${searchTerm.length > 20 ? '...' : ''}"`;
        
        pdf.text(subtitulo, 15, 22);

        pdf.text(
          `Página ${page} de ${totalPages}`,
          pageWidth - 15,
          22,
          { align: 'right' }
        );

        const y = 30;
        const cardW = 40;
        const gap = 6;

        const entradas = filteredData.filter(r => (r.tipo_registro || r.type) === 'entrada').length;
        const salidas = filteredData.filter(r => (r.tipo_registro || r.type) === 'salida').length;
        const empleadosUnicos = [...new Set(filteredData.map(r => r.numero_empleado || r.employeeId))].length;

        const metrics = [
          { t: 'Registros', v: filteredData.length },
          { t: 'Entradas', v: entradas },
          { t: 'Empleados', v: empleadosUnicos },
          { t: 'Fecha', v: dateFilter || 'Todas' }
        ];

        metrics.forEach((m, i) => {
          const x = 10 + i * (cardW + gap);
          pdf.setDrawColor(229, 231, 235);
          pdf.roundedRect(x, y, cardW, 18, 3, 3);

          pdf.setFontSize(7);
          pdf.setTextColor(107, 114, 128);
          pdf.text(m.t, x + cardW / 2, y + 6, { align: 'center' });

          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(String(m.v), x + cardW / 2, y + 14, { align: 'center' });
        });
      };

      const colW = [15, 25, 50, 35, 30, 20, 25, 20];

      const drawTableHeader = (y) => {
        pdf.setFillColor(243, 244, 246);
        pdf.rect(10, y, pageWidth - 20, 9, 'F');

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);

        const headers = ['N° Emp', 'Nombre', 'Área', 'Departamento', 'Fecha', 'Hora', 'Tipo'];
        let x = 12;
        headers.forEach((h, i) => {
          pdf.text(h, x + colW[i] / 2, y + 6, { align: 'center' });
          x += colW[i];
        });
      };

      const drawRow = (row, index, y) => {
        let x = 12;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(row.numero_empleado, x + colW[0] / 2, y + 6, { align: 'center' });
        x += colW[0];

        pdf.setFont('helvetica', 'normal');
        const nombre = (row.nombre_empleado || row.employeeName || 'SIN NOMBRE');
        const nombreShort = nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre;
        pdf.text(nombreShort, x + 2, y + 6);
        x += colW[2];

        pdf.text(row.area_empleado || row.department || '—', x + 2, y + 6);
        x += colW[3];

        pdf.text(row.departamento || '—', x + 2, y + 6);
        x += colW[4];

        const fecha = row.fecha || row.date || '';
        pdf.text(fecha, x + colW[5] / 2, y + 6, { align: 'center' });
        x += colW[5];

        const hora = row.hora || row.time || '';
        pdf.text(hora, x + colW[6] / 2, y + 6, { align: 'center' });
        x += colW[6];

        pdf.setFont('helvetica', 'bold');
        const tipo = row.tipo_registro || row.type || 'entrada';
        if (tipo === 'entrada') {
          pdf.setTextColor(16, 185, 129);
          pdf.text('ENTRADA', x + colW[7] / 2, y + 6, { align: 'center' });
        } else {
          pdf.setTextColor(59, 130, 246);
          pdf.text('SALIDA', x + colW[7] / 2, y + 6, { align: 'center' });
        }

        pdf.setDrawColor(229, 231, 235);
        pdf.line(10, y + 9, pageWidth - 10, y + 9);
      };

      let page = 1;
      for (let i = 0; i < filteredData.length; i += MAX_ROWS) {
        if (page > 1) pdf.addPage();
        drawHeader(page);

        let y = 55;
        drawTableHeader(y);
        y += 9;

        filteredData.slice(i, i + MAX_ROWS).forEach((row, index) => {
          drawRow(row, i + index, y);
          y += 10;
        });

        page++;
      }

      pdf.setPage(totalPages);
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        `Generado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · Zona: Jalisco (UTC-6)`,
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );

      let filename = 'reporte_asistencias';
      if (dateFilter) filename += `_${dateFilter.replace(/\//g, '-')}`;
      if (searchTerm) {
        const termShort = searchTerm.substring(0, 10).replace(/\s+/g, '_');
        filename += `_busqueda_${termShort}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}`;

      pdf.save(`${filename}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF de asistencias');
    }
  };

  // ============ FUNCIONES DE FILTRO ============
  
  const applyFilters = async (e) => {
    e.preventDefault();
    setCurrentAttendancePage(1);
    
    console.log('🔍 Aplicando filtros:', {
      fecha: dateFilter,
      busqueda: searchTerm
    });
    
    if (dateFilter) {
      const fechaExiste = availableDates.some(f => f.valor === dateFilter);
      
      if (!fechaExiste && availableDates.length > 0) {
        const sugerencia = availableDates[0];
        if (sugerencia && confirm(`La fecha "${dateFilter}" no tiene registros.\n\n¿Desea ver los registros de "${sugerencia.valor}" en su lugar?`)) {
          setDateFilter(sugerencia.valor);
        }
      }
    }
    
    await fetchDataFromDB();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setCurrentAttendancePage(1);
    fetchAvailableDates();
    fetchDataFromDB();
    console.log('🧹 Filtros limpiados');
  };

  // ============ FUNCIONES DE GESTIÓN DE EMPLEADOS ============
  
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

  // ============ FUNCIONES PARA CARDS DESPLEGABLES ============
  
  // Función para alternar el estado de una tabla
  const toggleTable = (tableName) => {
    setOpenTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  // ============ COMPONENTES ============
  
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
                Puesto
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
                  fetchTiposFalta();
                  
                  const weekNumber = getCurrentWeekNumber();
                  const weekRange = getWeekRangeByNumber(weekNumber);
                  setSelectedWeek(weekNumber);
                  setWeekRange(weekRange);
                  fetchWeeklyData(weekRange.start, weekRange.end);
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
                Volver al Registro
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de conexión */}
        <div className="mb-2">
          <div className="flex items-center justify-between">
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

        {/* ============ CARD: VERIFICACIÓN DE ASISTENCIA ============ */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300">
            {/* Encabezado de la card */}
            <div 
              className={`p-6 border-b border-gray-200 cursor-pointer transition-colors duration-200 ${
                openTables.verification ? 'bg-gradient-to-r from-red-50 to-red-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleTable('verification')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <ClockIcon className={`w-6 h-6 mr-3 ${openTables.verification ? 'text-red-600' : 'text-gray-600'}`} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Verificación de Asistencia Hoy ({currentDate})
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Estado de asistencia de empleados activos
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Contador de empleados sin asistencia */}
                  <div className="text-sm text-gray-500">
                    <span className="text-red-600 font-medium">
                      {attendanceCheckData.filter(e => !e.attendedToday).length}
                    </span> sin asistencia
                  </div>
                  
                  {/* Botón de despliegue */}
                  {openTables.verification ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Contenido de la card (se muestra solo si está abierta) */}
            {openTables.verification && (
              <div className="p-6">
                {/* Botones de exportación */}
                <div className="flex justify-between items-center mb-6">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{attendanceCheckData.length}</span> empleados activos
                    <span className="mx-2">•</span>
                    <span className="text-green-600 font-medium">
                      {attendanceCheckData.filter(e => e.attendedToday).length}
                    </span> asistieron hoy
                  </div>
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
                      
                      {/* Menú desplegable de exportación para verificación */}
                      <div id="export-check-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu">
                          <button
                            onClick={() => {
                              exportAttendanceCheckToExcel();
                              const menu = document.getElementById('export-check-menu');
                              if (menu) menu.classList.add('hidden');
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            <svg className="w-4 h-4 mr-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar Hoy (Excel)
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
                            Exportar PDF
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
                <div className="bg-gray-50 rounded-lg overflow-hidden">
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
                            Puesto
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
                            Tipo de Falta
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
                              {/* Columna de Tipo de Falta - SOLO SELECTOR */}
                              <td className="px-6 py-4">
                                <div className="flex flex-col space-y-2">
                                  {/* Selector para tipo de falta */}
                                  <div className="mb-2">
                                    <select
                                      value={tiposFalta[employee.id] || ''}
                                      onChange={async (e) => {
                                        const tipoFaltaValue = e.target.value;
                                        
                                        // Actualizar estado local inmediatamente
                                        setTiposFalta(prev => ({
                                          ...prev,
                                          [employee.id]: tipoFaltaValue
                                        }));
                                        
                                        // Si se selecciona una opción (no vacía), guardar automáticamente
                                        if (tipoFaltaValue) {
                                          await saveObservacion(
                                            employee.id,
                                            tipoFaltaValue,
                                            getCurrentJaliscoDate()
                                          );
                                        }
                                      }}
                                      className="w-full text-sm border text-gray-800 border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="">Seleccionar tipo de falta...</option>
                                      <option value="Vacaciones">Vacaciones</option>
                                      <option value="Falta">Falta</option>
                                      <option value="Incapacidad">Incapacidad</option>
                                      <option value="Prestamo">Préstamo</option>
                                    </select>
                                    
                                    {/* Mostrar estado de guardado */}
                                    {savingObservacion[employee.id] && (
                                      <div className="mt-1 text-xs text-blue-600 flex items-center">
                                        <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />
                                        Guardando...
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Información sobre qué se está guardando */}
                                  <div className="text-xs text-gray-500">
                                    {tiposFalta[employee.id] ? (
                                      <div className="flex items-center text-green-600">
                                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                                        <span>Guardado: {tiposFalta[employee.id]} para hoy</span>
                                      </div>
                                    ) : (
                                      "Selecciona una opción para guardar"
                                    )}
                                  </div>
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
                </div>

                {/* Sección: Empleados que no asistieron hoy */}
                <div className="mt-6">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Encabezado con botón de despliegue */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <ExclamationCircleIcon className="w-5 h-5 mr-2 text-red-600" />
                              Empleados que no asistieron hoy ({currentDate})
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Listado de empleados activos sin registro de asistencia
                            </p>
                          </div>
                          
                          {/* Contador y botón de despliegue */}
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-500">
                              <span className="text-red-600 font-medium">
                                {attendanceCheckData.filter(e => !e.attendedToday).length}
                              </span> empleados sin asistencia
                            </div>
                            
                            {/* Botón para desplegar/plegar */}
                            <button
                              onClick={() => setShowEmployeesWithoutAttendance(!showEmployeesWithoutAttendance)}
                              className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                              aria-label={showEmployeesWithoutAttendance ? "Ocultar lista" : "Mostrar lista"}
                            >
                              {showEmployeesWithoutAttendance ? (
                                <ChevronUpIcon className="w-5 h-5" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido (se muestra/oculta según el estado) */}
                    {showEmployeesWithoutAttendance && (
                      <div className="p-4">
                        {attendanceCheckLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Cargando datos...</p>
                          </div>
                        ) : (
                          <>
                            {/* Filtrar empleados que no asistieron hoy */}
                            {(() => {
                              const empleadosSinAsistencia = attendanceCheckData.filter(employee => !employee.attendedToday);
                              
                              if (empleadosSinAsistencia.length === 0) {
                                return (
                                  <div className="text-center py-8">
                                    <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                    <p className="text-gray-600">¡Todos los empleados asistieron hoy!</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      No hay empleados sin registro de asistencia
                                    </p>
                                  </div>
                                );
                              }

                              return (
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
                                            Puesto
                                          </th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo de Falta
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {empleadosSinAsistencia.map((employee) => (
                                          <tr key={employee.id} className="hover:bg-red-50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="text-sm font-medium text-gray-900">
                                                {employee.id}
                                              </div>
                                            </td>
                                            <td className="px-6 py-4">
                                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="text-sm text-gray-900">{employee.area}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="text-sm text-gray-900">{employee.departamento}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="text-sm font-medium text-gray-900">
                                                {tiposFalta[employee.id] || '—'}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Resumen (opcional) */}
                                  <div className="px-6 py-4 border-t border-gray-200 bg-red-50">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-700">
                                      <div className="mb-2 sm:mb-0">
                                        <span className="font-medium">{empleadosSinAsistencia.length}</span> empleados sin asistencia hoy
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Última actualización: {getCurrentJaliscoTime()}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ CARD: REPORTE SEMANAL ============ */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300">
            {/* Encabezado de la card */}
            <div 
              className={`p-6 border-b border-gray-200 cursor-pointer transition-colors duration-200 ${
                openTables.weekly ? 'bg-gradient-to-r from-indigo-50 to-indigo-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleTable('weekly')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CalendarDaysIcon className={`w-6 h-6 mr-3 ${openTables.weekly ? 'text-indigo-600' : 'text-gray-600'}`} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Reporte Semanal de Asistencias
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Semana {selectedWeek}: {weekRange.start} al {weekRange.end}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Estadísticas resumidas */}
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600 font-medium">{weekStats.porcentajeAsistencia}%</span> asistencia
                  </div>
                  
                  {/* Botón de despliegue */}
                  {openTables.weekly ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Contenido de la card */}
            {openTables.weekly && (
              <div className="p-6">
                {/* Selector de semanas y botones de exportación */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    {/* SELECTOR DE SEMANAS */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        Seleccionar semana:
                      </label>
                      <select
                        value={selectedWeek}
                        onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                        disabled={weeklyLoading}
                        className="px-3 py-2 border text-gray-800 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      >
                        {availableWeeks.map((week) => (
                          <option key={week.numero} value={week.numero}>
                            Semana {week.numero} ({week.inicio} al {week.fin}) • Jue-Mié
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3" ref={exportWeeklyMenuRef}>
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
                        Exportar
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Menú desplegable de exportación semanal */}
                      <div id="export-weekly-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu">
                          <button
                            onClick={() => {
                              exportWeeklyToExcel();
                              const menu = document.getElementById('export-weekly-menu');
                              if (menu) menu.classList.add('hidden');
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            <svg className="w-4 h-4 mr-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar Excel (con tipos de falta)
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
                    
                    <button
                      onClick={() => {
                        const weekRange = getWeekRangeByNumber(selectedWeek);
                        fetchWeeklyData(weekRange.start, weekRange.end);
                      }}
                      disabled={weeklyLoading}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      <ArrowPathIcon className={`w-4 h-4 mr-2 ${weeklyLoading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                  </div>
                </div>

                {/* Estadísticas de la semana */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
                        <UsersIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                        <p className="text-2xl font-bold text-gray-900">{weekStats.totalEmpleados}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Días Presentes</p>
                        <p className="text-2xl font-bold text-gray-900">{weekStats.totalPresentes}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-red-100 p-3 rounded-lg">
                        <XCircleIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Faltas Reales</p>
                        <p className="text-2xl font-bold text-gray-900">{weekStats.totalFaltas}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-lg">
                        <ChartBarIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">% Asistencia</p>
                        <p className="text-2xl font-bold text-gray-900">{weekStats.porcentajeAsistencia}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla Semanal */}
                <div className="bg-gray-50 rounded-lg overflow-hidden">
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
                            Puesto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jueves
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Viernes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lunes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Martes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Miercoles
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Faltas
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedWeeklyData.map((row, index) => {
                          // En el renderDayCell dentro del map de paginatedWeeklyData
                          const renderDayCell = (dayName) => {
                            const valor = row[dayName]; // 'X', 'R' o ''
                            const esFuturo = row.esFuturo?.[dayName];
                            const esInactivo = row.esInactivo?.[dayName];
                            const esFinDeSemana = row.esFinDeSemana?.[dayName];

                            // Obtener la fecha actual del día
                            const fechaDia = calcularFechaParaDiaSemana(selectedWeek, dayName);
                            
                            // Verificar si es fecha inactiva del sistema
                            const esFechaInactivaSistema = esFechaInactiva(fechaDia);
                            
                            // Día futuro
                            if (esFuturo) {
                              return (
                                <div className="flex justify-center">
                                  <div 
                                    className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center"
                                    title="Día futuro (no cuenta como falta)"
                                  >
                                    <ClockIcon className="w-4 h-4 text-gray-400" />
                                  </div>
                                </div>
                              );
                            }
                            
                            // Día inactivo del sistema (5 de enero o 2 de febrero 2026)
                            if (esInactivo || esFechaInactivaSistema) {
                              return (
                                <div className="flex justify-center">
                                  <div 
                                    className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center"
                                    title={esFechaInactivaSistema ? `Sistema no activo - ${fechaDia}` : "Sistema no activo (no cuenta como falta)"}
                                  >
                                    <span className="text-xs text-gray-500">-</span>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Fin de semana (sábado o domingo)
                            if (esFinDeSemana) {
                              return (
                                <div className="flex justify-center">
                                  <div 
                                    className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center"
                                    title="Fin de semana (no laboral)"
                                  >
                                    <span className="text-xs text-blue-500">FS</span>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Día laboral - mostrar asistencia real
                            if (valor === 'X') {
                              return (
                                <div 
                                  className="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center"
                                  title="Asistió (antes de 9:00 AM)"
                                >
                                  <CheckIcon className="w-4 h-4 text-green-600" />
                                </div>
                              );
                            } else if (valor === 'R') {
                              return (
                                <div 
                                  className="w-6 h-6 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center"
                                  title="Retardo (después de 9:00 AM)"
                                >
                                  <span className="text-xs text-yellow-700 font-bold">R</span>
                                </div>
                              );
                            } else {
                              return (
                                <div 
                                  className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center"
                                  title="Ausente (falta)"
                                >
                                  <XMarkIcon className="w-4 h-4 text-red-600" />
                                </div>
                              );
                            }
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
                              
                              {/* Jueves */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {renderDayCell('jueves')}
                              </td>
                              
                              {/* Viernes */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {renderDayCell('viernes')}
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
                              
                              {/* Faltas reales */}
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
                </div>
                
                {/* Resumen y leyenda */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
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
            )}
          </div>
        </div>

        {/* ============ CARD: GESTIÓN DE EMPLEADOS ============ */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300">
            {/* Encabezado de la card */}
            <div 
              className={`p-6 border-b border-gray-200 cursor-pointer transition-colors duration-200 ${
                openTables.employees ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleTable('employees')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <UserGroupIcon className={`w-6 h-6 mr-3 ${openTables.employees ? 'text-blue-600' : 'text-gray-600'}`} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Gestión de Empleados
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {employees.length} empleados registrados
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Contador de empleados */}
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{employees.filter(e => e.activo).length}</span> activos
                  </div>
                  
                  {/* Botón de despliegue */}
                  {openTables.employees ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Contenido de la card */}
            {openTables.employees && (
              <div className="p-6">
                {/* Botones de exportación y nuevo empleado */}
                <div className="flex justify-between items-center mb-6">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{employees.length}</span> empleados totales
                    <span className="mx-2">•</span>
                    <span className="text-green-600 font-medium">
                      {employees.filter(e => e.activo).length}
                    </span> activos
                  </div>
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
                      
                      {/* Menú desplegable de exportación para empleados */}
                      <div id="export-employees-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu">
                          <button
                            onClick={() => {
                              exportEmployeesToExcel();
                              const menu = document.getElementById('export-employees-menu');
                              if (menu) menu.classList.add('hidden');
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            <svg className="w-4 h-4 mr-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar Excel
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
                              Área/Puesto *
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
                              Puesto *
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
                <div className="bg-gray-50 rounded-lg overflow-hidden">
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
                            Puesto
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
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ CARD: REGISTROS DE ASISTENCIA ============ */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300">
            {/* Encabezado de la card */}
            <div 
              className={`p-6 border-b border-gray-200 cursor-pointer transition-colors duration-200 ${
                openTables.attendance ? 'bg-gradient-to-r from-green-50 to-green-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleTable('attendance')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <DocumentTextIcon className={`w-6 h-6 mr-3 ${openTables.attendance ? 'text-green-600' : 'text-gray-600'}`} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Registros de Asistencia
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Historial completo de registros
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Contador de registros */}
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{filteredData.length}</span> registros
                  </div>
                  
                  {/* Botón de despliegue */}
                  {openTables.attendance ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Contenido de la card */}
            {openTables.attendance && (
              <div className="p-6">
                {/* Filtros */}
                <div className="mb-6">
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
                      
                      {/* Selector de fechas */}
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
                      
                      <div>
                        <button
                          type="button"
                          onClick={clearFilters}
                          disabled={loading || refreshing}
                          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
                        >
                          Limpiar Filtros
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-3" ref={exportAttendanceMenuRef}>
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
                        
                        {/* Menú desplegable de exportación para registros */}
                        <div id="export-attendance-menu" className="hidden absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                          <div className="py-1" role="menu">
                            <button
                              onClick={() => {
                                exportAllToExcel();
                                const menu = document.getElementById('export-attendance-menu');
                                if (menu) menu.classList.add('hidden');
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              <svg className="w-4 h-4 mr-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Exportar Excel
                            </button>
                            <button
                              onClick={() => {
                                exportAttendanceToPDF();
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
                <div className="bg-gray-50 rounded-lg overflow-hidden">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
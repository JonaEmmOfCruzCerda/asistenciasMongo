'use client';

import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CloudIcon,
  UsersIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  UserPlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

import AdminTable from '@/components/AdminTable';

export default function AdminPage() {
  // Estados para asistencias
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalAttendance: 0,
    todayAttendance: 0,
    uniqueEmployeesToday: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [googleSheetsStatus, setGoogleSheetsStatus] = useState('conectando');
  
  // Estados para gestión de empleados
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Formulario de empleado
  const [employeeForm, setEmployeeForm] = useState({
    id: '',
    name: '',
    department: '',
    active: 'Sí',
    originalId: '',
    isEditing: false
  });
  const [formErrors, setFormErrors] = useState({});

  // Estado para la nueva tabla de verificación de asistencia
  const [attendanceCheckData, setAttendanceCheckData] = useState([]);
  const [attendanceCheckLoading, setAttendanceCheckLoading] = useState(false);
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);

  // Función para formatear fecha
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Función para verificar si un empleado registró antes de las 9:00 AM
  const checkAttendanceBefore9AM = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return false;
    
    const today = new Date().toDateString();
    const cutoffTime = new Date();
    cutoffTime.setHours(9, 0, 0, 0); // 9:00 AM
    
    for (const record of attendanceRecords) {
      const recordDate = new Date(record.timestamp);
      
      // Verificar si es hoy
      if (recordDate.toDateString() === today) {
        // Verificar si es antes de las 9:00 AM
        if (recordDate < cutoffTime) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Función para obtener el tipo de registro (entrada/salida) de hoy
  const getTodayAttendanceType = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 'Sin registro';
    
    const today = new Date().toDateString();
    const todayRecords = attendanceRecords.filter(record => 
      new Date(record.timestamp).toDateString() === today
    );
    
    if (todayRecords.length === 0) return 'Sin registro';
    
    // Obtener el último registro de hoy
    const latestRecord = todayRecords.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });
    
    return latestRecord.type || 'entrada';
  };

  // Función para obtener la hora del último registro de hoy
  const getTodayLastAttendanceTime = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return '';
    
    const today = new Date().toDateString();
    const todayRecords = attendanceRecords.filter(record => 
      new Date(record.timestamp).toDateString() === today
    );
    
    if (todayRecords.length === 0) return '';
    
    const latestRecord = todayRecords.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });
    
    return new Date(latestRecord.timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para cargar datos de verificación de asistencia
  const fetchAttendanceCheckData = async () => {
    setAttendanceCheckLoading(true);
    try {
      // Obtener todos los empleados activos
      const activeEmployees = employees.filter(emp => emp.active);
      
      // Obtener registros de asistencia de hoy
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/get-attendance?date=${today}`);
      
      if (response.ok) {
        const todayAttendance = await response.json();
        
        // Procesar datos para la tabla de verificación
        const checkData = activeEmployees.map(employee => {
          // Filtrar registros de hoy para este empleado
          const employeeTodayRecords = todayAttendance.filter(record => 
            record.employeeId === employee.id || record.employeeName === employee.name
          );
          
          const attendedToday = employeeTodayRecords.length > 0;
          const before9AM = checkAttendanceBefore9AM(employeeTodayRecords);
          const attendanceType = getTodayAttendanceType(employeeTodayRecords);
          const lastTime = getTodayLastAttendanceTime(employeeTodayRecords);
          
          return {
            id: employee.id,
            name: employee.name,
            department: employee.department,
            attendedToday,
            before9AM,
            attendanceType,
            lastTime,
            records: employeeTodayRecords
          };
        });
        
        // Ordenar por nombre
        checkData.sort((a, b) => a.name.localeCompare(b.name));
        
        setAttendanceCheckData(checkData);
      } else {
        // Si hay error, crear datos básicos solo con empleados
        const checkData = activeEmployees.map(employee => ({
          id: employee.id,
          name: employee.name,
          department: employee.department,
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
      // Crear datos básicos en caso de error
      const activeEmployees = employees.filter(emp => emp.active);
      const checkData = activeEmployees.map(employee => ({
        id: employee.id,
        name: employee.name,
        department: employee.department,
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

  // Obtener datos de Google Sheets
  const fetchDataFromSheets = async () => {
    setRefreshing(true);
    setGoogleSheetsStatus('conectando');
    
    try {
      // Obtener estadísticas desde la API
      const statsResponse = await fetch('/api/statistics');
      if (!statsResponse.ok) throw new Error('Error en estadísticas');
      const statsData = await statsResponse.json();
      setStats(statsData);
      
      // Obtener registros de asistencia con filtros
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateFilter) params.append('date', dateFilter);
      
      const attendanceResponse = await fetch(`/api/get-attendance?${params}`);
      if (!attendanceResponse.ok) throw new Error('Error en asistencias');
      const attendanceData = await attendanceResponse.json();
      
      // Procesar datos de Google Sheets
      const processedData = attendanceData.map(record => ({
        ...record,
        employeeId: record.employeeId || record.id || '',
        employeeName: record.employeeName || record.name || '',
        date: record.date || new Date(record.timestamp).toLocaleDateString('es-ES'),
        time: record.time || new Date(record.timestamp).toLocaleTimeString('es-ES'),
        timestamp: record.timestamp || new Date().toISOString()
      }));
      
      setAttendanceData(processedData);
      setLastUpdated(new Date());
      setGoogleSheetsStatus('conectado');
      
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      setGoogleSheetsStatus('error');
      
      // Mostrar datos de ejemplo si hay error
      setStats({
        totalEmployees: 0,
        activeEmployees: 0,
        totalAttendance: 0,
        todayAttendance: 0,
        uniqueEmployeesToday: 0
      });
      
      setAttendanceData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar empleados
  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error al cargar empleados:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchDataFromSheets();
    fetchEmployees();
    
    // Actualizar automáticamente cada 30 segundos
    const interval = setInterval(fetchDataFromSheets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Actualizar datos de verificación cuando cambian empleados o asistencias
  useEffect(() => {
    if (employees.length > 0 && !employeesLoading) {
      fetchAttendanceCheckData();
    }
  }, [employees, employeesLoading, attendanceData]);

  // Función para exportar a CSV
  const exportToCSV = () => {
    try {
      const headers = ['ID Empleado', 'Nombre', 'Departamento', 'Fecha', 'Hora', 'Tipo'];
      const csvContent = [
        headers.join(','),
        ...attendanceData.map(row => [
          row.employeeId,
          `"${row.employeeName}"`,
          `"${row.department || ''}"`,
          row.date,
          row.time,
          row.type || 'entrada'
        ].join(','))
      ].join('\n');

      // Agregar BOM para compatibilidad con Excel
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `asistencias_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Archivo CSV exportado exitosamente');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error al exportar el archivo CSV');
    }
  };

  // Exportar empleados a CSV
  const exportEmployeesToCSV = () => {
    try {
      const headers = ['ID', 'Nombre', 'Departamento', 'Activo'];
      const csvContent = [
        headers.join(','),
        ...employees.map(emp => [
          emp.id,
          `"${emp.name}"`,
          `"${emp.department}"`,
          emp.active ? 'Sí' : 'No'
        ].join(','))
      ].join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `empleados_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Empleados exportados exitosamente');
    } catch (error) {
      console.error('Error exportando empleados:', error);
      alert('Error al exportar empleados');
    }
  };

  // Exportar verificación de asistencia a CSV
  const exportAttendanceCheckToCSV = () => {
    try {
      const headers = ['ID', 'Nombre', 'Departamento', 'Asistió Hoy', 'Antes de 9:00 AM', 'Tipo', 'Última Hora', 'Fecha Verificación'];
      const csvContent = [
        headers.join(','),
        ...attendanceCheckData.map(row => [
          row.id,
          `"${row.name}"`,
          `"${row.department}"`,
          row.attendedToday ? 'Sí' : 'No',
          row.before9AM ? 'Sí' : 'No',
          row.attendanceType,
          row.lastTime,
          currentDate
        ].join(','))
      ].join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `verificacion_asistencia_${currentDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Verificación de asistencia exportada exitosamente');
    } catch (error) {
      console.error('Error exportando verificación:', error);
      alert('Error al exportar verificación de asistencia');
    }
  };

  // Función para aplicar filtros
  const applyFilters = (e) => {
    e.preventDefault();
    fetchDataFromSheets();
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    fetchDataFromSheets();
  };

  // Función para obtener el estado de Google Sheets
  const getSheetsStatus = () => {
    switch (googleSheetsStatus) {
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

  // Filtrar datos localmente
  const filteredData = attendanceData.filter(record => {
    const matchesSearch = 
      record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || record.date === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  // Funciones para gestión de empleados
  const handleEmployeeFormChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEmployeeForm = () => {
    const errors = {};
    
    // Solo validar ID si se está editando
    if (employeeForm.isEditing && !employeeForm.id.trim()) {
      errors.id = 'El ID es requerido';
    }
    
    if (!employeeForm.name.trim()) errors.name = 'El nombre es requerido';
    if (!employeeForm.department.trim()) errors.department = 'El departamento es requerido';
    
    // Verificar si el ID ya existe (solo cuando se está editando y cambió el ID)
    if (employeeForm.isEditing && employeeForm.originalId !== employeeForm.id) {
      if (employees.some(emp => emp.id === employeeForm.id && emp.id !== employeeForm.originalId)) {
        errors.id = 'Este ID ya está registrado por otro empleado';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (!validateEmployeeForm()) return;
    
    try {
      // Preparar datos para enviar
      const employeeData = {
        name: employeeForm.name.trim(),
        department: employeeForm.department.trim(),
        active: employeeForm.active === 'Sí',
        isEditing: employeeForm.isEditing,
      };
      
      // Solo enviar ID si estamos editando
      if (employeeForm.isEditing) {
        employeeData.id = employeeForm.id.trim();
        employeeData.originalId = employeeForm.originalId;
      }
      
      console.log('📤 Enviando datos del empleado:', employeeData);
      
      // Usar PUT para actualizaciones, POST para nuevos
      const method = employeeForm.isEditing ? 'PUT' : 'POST';
      const endpoint = '/api/employees';
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Mostrar mensaje con el ID generado si aplica
        let message = employeeForm.isEditing 
          ? 'Empleado actualizado exitosamente' 
          : 'Empleado agregado exitosamente';
        
        if (!employeeForm.isEditing && result.generatedId) {
          message = `Empleado agregado exitosamente con ID: ${result.generatedId}`;
        }
        
        alert(message);
        console.log('✅ Respuesta del servidor:', result);
        
        resetEmployeeForm();
        fetchEmployees(); // Recargar lista
        fetchDataFromSheets(); // Actualizar estadísticas
      } else {
        const error = await response.json();
        console.error('❌ Error del servidor:', error);
        alert(error.error || 'Error al guardar empleado');
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert('Error de conexión con el servidor');
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      department: employee.department,
      active: employee.active ? 'Sí' : 'No',
      originalId: employee.id,
      isEditing: true
    });
    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este empleado?')) return;
    
    try {
      const response = await fetch(`/api/employees?id=${employeeId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        alert('Empleado eliminado exitosamente');
        fetchEmployees();
        fetchDataFromSheets();
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
      id: '', // Vacío para nuevos empleados (el backend generará el ID)
      name: '',
      department: '',
      active: 'Sí',
      originalId: '',
      isEditing: false
    });
    setFormErrors({});
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  };

  const sheetsStatus = getSheetsStatus();

  // Función para verificar si debe resaltar la fila
  const shouldHighlightRow = (employee) => {
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(9, 0, 0, 0);
    
    // Solo resaltar si es después de las 9:00 AM y antes de las 18:00 PM
    if (now >= cutoffTime && now.getHours() < 18) {
      return !employee.attendedToday || !employee.before9AM;
    }
    return false;
  };

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
                  <span className="text-xl font-bold text-gray-800">Admin Panel</span>
                  <div className="flex items-center mt-1">
                    <CloudIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs text-gray-500">Google Sheets</span>
                    <div className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${sheetsStatus.bg} ${sheetsStatus.color}`}>
                      {sheetsStatus.text}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  fetchDataFromSheets();
                  fetchEmployees();
                  fetchAttendanceCheckData();
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
            {googleSheetsStatus === 'error' && (
              <div className="flex items-center text-sm text-red-600">
                <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                Error de conexión
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-green-600 font-medium">{stats.activeEmployees}</span> activos
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttendance}</p>
                <p className="text-xs text-gray-500 mt-1">En Google Sheets</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.todayAttendance}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
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
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueEmployeesToday}</p>
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
                  {stats.activeEmployees > 0 
                    ? `${Math.round((stats.uniqueEmployeesToday / stats.activeEmployees) * 100)}%`
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
            <div className="flex gap-3">
              <button
                onClick={exportAttendanceCheckToCSV}
                disabled={attendanceCheckData.length === 0}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Exportar Verificación
              </button>
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
                  Hora actual: {new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceCheckData.map((employee) => {
                        const highlight = shouldHighlightRow(employee);
                        
                        return (
                          <tr 
                            key={employee.id} 
                            className={highlight ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
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
                              <div className="text-sm text-gray-900">{employee.department}</div>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                  <span className="text-red-700">
                    {attendanceCheckData.filter(employee => shouldHighlightRow(employee)).length} 
                    empleados pendientes
                  </span>
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
            <div className="flex gap-3">
              <button
                onClick={exportEmployeesToCSV}
                disabled={employees.length === 0}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Exportar Empleados
              </button>
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
                        ID del Empleado {employeeForm.isEditing ? '*' : ''}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="id"
                          value={employeeForm.id}
                          onChange={handleEmployeeFormChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors.id ? 'border-red-500' : 'border-gray-300'
                          } ${employeeForm.isEditing ? 'bg-gray-100 text-gray-600' : 'bg-white'}`}
                          placeholder={employeeForm.isEditing ? employeeForm.id : "Generado automáticamente"}
                          disabled={employeeForm.isEditing}
                          readOnly={!employeeForm.isEditing} // Solo lectura para nuevos empleados
                        />
                        {!employeeForm.isEditing && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {formErrors.id && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.id}</p>
                      )}
                      {employeeForm.isEditing ? (
                        <p className="mt-1 text-xs text-gray-500">
                          Para cambiar el ID, debe crear un nuevo empleado
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">
                          El ID se generará automáticamente al guardar
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={employeeForm.name}
                        onChange={handleEmployeeFormChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Juan Pérez"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departamento *
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={employeeForm.department}
                        onChange={handleEmployeeFormChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.department ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Ventas, IT, RRHH"
                      />
                      {formErrors.department && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        name="active"
                        value={employeeForm.active}
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
                  <CloudIcon className="w-4 h-4 inline mr-1" />
                  Sincronizado con Google Sheets
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
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
                      {employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{employee.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              employee.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.active ? 'Activo' : 'Inactivo'}
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
                                onClick={() => handleDeleteEmployee(employee.id)}
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
                    placeholder="Buscar por ID, nombre o departamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                    disabled={loading}
                  />
                </div>
                
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="input-field pl-10"
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={loading || refreshing}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Buscando...' : 'Aplicar Filtros'}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={loading || refreshing}
                  className="px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  Limpiar Filtros
                </button>
                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={loading || attendanceData.length === 0}
                  className="flex items-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                  Exportar CSV
                </button>
              </div>
            </form>
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
                    Datos en tiempo real desde Google Sheets
                    <span className="ml-2 text-gray-500">
                      • {filteredData.length} registros encontrados
                    </span>
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                    <CloudIcon className="w-4 h-4 mr-1" />
                    Google Sheets
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                    <CloudIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-gray-600 mt-4">Conectando con Google Sheets...</p>
                  <p className="text-sm text-gray-500 mt-2">Obteniendo datos en tiempo real</p>
                </div>
              ) : googleSheetsStatus === 'error' ? (
                <div className="text-center py-12">
                  <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Error de conexión con Google Sheets
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No se pudieron cargar los datos desde Google Sheets.
                  </p>
                  <button
                    onClick={fetchDataFromSheets}
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
                <AdminTable 
                  attendanceData={filteredData} 
                  loading={false} 
                />
              )}
            </div>
            
            {/* Footer de la tabla */}
            {!loading && filteredData.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                  <div className="mb-2 sm:mb-0">
                    Mostrando <span className="font-medium">{filteredData.length}</span> registros
                    {searchTerm && (
                      <span className="ml-2">
                        para "<span className="font-medium">{searchTerm}</span>"
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <CloudIcon className="w-4 h-4 mr-1" />
                    <span>Sincronizado con Google Sheets</span>
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
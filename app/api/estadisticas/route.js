// /app/api/estadisticas/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Empleado from '@/app/models/Empleado';
import Asistencia from '@/app/models/Asistencia';

// Constante para offset de Jalisco (UTC-6)
const JALISCO_OFFSET = -6;

/**
 * Función para obtener fecha actual en formato Jalisco (DD/MM/YYYY)
 */
function getCurrentJaliscoDate() {
  const ahora = new Date();
  const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
  
  const dia = fechaJalisco.getUTCDate().toString().padStart(2, '0');
  const mes = (fechaJalisco.getUTCMonth() + 1).toString().padStart(2, '0');
  const año = fechaJalisco.getUTCFullYear();
  
  return `${dia}/${mes}/${año}`;
}

export async function GET() {
  try {
    await conectarDB();
    
    console.log('📊 Obteniendo estadísticas desde MongoDB...');
    
    // Usar la misma función que el resto del sistema
    const hoy = getCurrentJaliscoDate();
    console.log('🗓️ Fecha hoy (Jalisco):', hoy);
    
    // Ejecutar todas las consultas en paralelo
    const [
      totalEmpleados,
      empleadosActivos,
      totalRegistros,
      registrosHoy,
      registrosHoyDetalle,
      // Nueva consulta: obtener empleados activos para estadísticas
      empleadosActivosLista
    ] = await Promise.all([
      // 1. Total de empleados
      Empleado.countDocuments(),
      
      // 2. Empleados activos
      Empleado.countDocuments({ activo: true }),
      
      // 3. Total de registros de asistencia
      Asistencia.countDocuments(),
      
      // 4. Registros de hoy
      Asistencia.countDocuments({ fecha: hoy }),
      
      // 5. Detalle de registros de hoy
      Asistencia.find({ fecha: hoy }),
      
      // 6. Lista de empleados activos (para cálculo de porcentaje)
      Empleado.find({ activo: true })
    ]);

    // Calcular estadísticas
    console.log(`📝 ${registrosHoyDetalle.length} registros encontrados hoy`);
    
    // Empleados únicos hoy
    const empleadosUnicosSet = new Set();
    registrosHoyDetalle.forEach(registro => {
      if (registro.numero_empleado) {
        empleadosUnicosSet.add(registro.numero_empleado.toString());
      }
    });
    
    const empleadosUnicosHoy = empleadosUnicosSet.size;
    
    // Calcular empleados activos total
    const totalEmpleadosActivos = empleadosActivosLista.length;
    
    // Calcular porcentaje de asistencia
    let porcentajeAsistencia = 0;
    if (totalEmpleadosActivos > 0) {
      porcentajeAsistencia = Math.round((empleadosUnicosHoy / totalEmpleadosActivos) * 100);
    }
    
    // Registros por área
    const registrosPorArea = {};
    registrosHoyDetalle.forEach(registro => {
      const area = registro.area_empleado || 'Sin área';
      registrosPorArea[area] = (registrosPorArea[area] || 0) + 1;
    });

    // Estadísticas detalladas por tipo de registro
    const registrosEntradaHoy = registrosHoyDetalle.filter(r => r.tipo_registro === 'entrada').length;
    const registrosSalidaHoy = registrosHoyDetalle.filter(r => r.tipo_registro === 'salida').length;

    const estadisticas = {
      total_empleados: totalEmpleados,
      empleados_activos: totalEmpleadosActivos, // Usar el contador real
      total_asistencias: totalRegistros,
      asistencias_hoy: registrosHoy,
      registros_entrada_hoy: registrosEntradaHoy,
      registros_salida_hoy: registrosSalidaHoy,
      empleados_unicos_hoy: empleadosUnicosHoy,
      porcentaje_asistencia_hoy: porcentajeAsistencia,
      registros_por_area: registrosPorArea,
      fecha_consulta: hoy,
      hora_consulta: new Date().toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' })
    };

    console.log('✅ Estadísticas calculadas:', {
      total_empleados: estadisticas.total_empleados,
      empleados_activos: estadisticas.empleados_activos,
      asistencias_hoy: estadisticas.asistencias_hoy,
      empleados_unicos_hoy: estadisticas.empleados_unicos_hoy,
      porcentaje_asistencia: estadisticas.porcentaje_asistencia_hoy + '%',
      fecha: estadisticas.fecha_consulta
    });

    return NextResponse.json(estadisticas);

  } catch (error) {
    console.error('❌ Error en /api/estadisticas:', error);
    
    // Devolver estadísticas vacías pero con estructura correcta
    return NextResponse.json({
      total_empleados: 0,
      empleados_activos: 0,
      total_asistencias: 0,
      asistencias_hoy: 0,
      registros_entrada_hoy: 0,
      registros_salida_hoy: 0,
      empleados_unicos_hoy: 0,
      porcentaje_asistencia_hoy: 0,
      registros_por_area: {},
      fecha_consulta: getCurrentJaliscoDate(),
      error: error.message
    }, { status: 500 });
  }
}
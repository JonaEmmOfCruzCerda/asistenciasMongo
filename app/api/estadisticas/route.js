import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Empleado from '@/app/models/Empleado';
import Asistencia from '@/app/models/Asistencia';

export async function GET() {
  try {
    await conectarDB();
    
    console.log('📊 Obteniendo estadísticas desde MongoDB...');
    
    const hoy = new Date().toLocaleDateString('es-MX');
    
    // Ejecutar todas las consultas en paralelo para mejor rendimiento
    const [
      totalEmpleados,
      empleadosActivos,
      totalRegistros,
      registrosHoy,
      estadisticasDia
    ] = await Promise.all([
      // 1. Total de empleados
      Empleado.countDocuments(),
      
      // 2. Empleados activos
      Empleado.countDocuments({ activo: true }),
      
      // 3. Total de registros de asistencia
      Asistencia.countDocuments(),
      
      // 4. Registros de hoy
      Asistencia.countDocuments({ fecha: hoy }),
      
      // 5. Estadísticas del día
      Asistencia.obtenerEstadisticasDia(hoy)
    ]);

    const estadisticas = {
      total_empleados: totalEmpleados,
      empleados_activos: empleadosActivos,
      total_asistencias: totalRegistros,
      asistencias_hoy: registrosHoy,
      empleados_unicos_hoy: estadisticasDia.empleados_unicos,
      registros_por_area: estadisticasDia.registros_por_area
    };

    console.log('✅ Estadísticas calculadas:', estadisticas);

    return NextResponse.json(estadisticas);

  } catch (error) {
    console.error('❌ Error en /api/estadisticas:', error);
    
    return NextResponse.json({
      total_empleados: 0,
      empleados_activos: 0,
      total_asistencias: 0,
      asistencias_hoy: 0,
      empleados_unicos_hoy: 0,
      error: error.message
    }, { status: 500 });
  }
}
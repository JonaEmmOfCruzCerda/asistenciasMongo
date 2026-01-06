import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/googleSheets';

export async function GET() {
  try {
    console.log('📊 Obteniendo estadísticas...');
    
    // Obtener empleados
    const employees = await googleSheets.getEmployees();
    
    // Obtener registros de asistencia
    const attendance = await googleSheets.getAttendanceRecords();
    
    // Calcular fecha de hoy en formato español
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('es-ES');
    
    // Filtrar registros de hoy
    const todayAttendance = attendance.filter(record => record.date === todayFormatted);
    const uniqueEmployeesToday = [...new Set(todayAttendance.map(record => record.employeeId))];
    
    const stats = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(emp => emp.active).length,
      totalAttendance: attendance.length,
      todayAttendance: todayAttendance.length,
      uniqueEmployeesToday: uniqueEmployeesToday.length
    };
    
    console.log('✅ Estadísticas calculadas:', stats);
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('❌ Error en /api/statistics:', error.message);
    
    // En caso de error, devolver estadísticas de ejemplo
    return NextResponse.json({
      totalEmployees: 0,
      activeEmployees: 0,
      totalAttendance: 0,
      todayAttendance: 0,
      uniqueEmployeesToday: 0,
      error: error.message,
      note: 'Estadísticas de ejemplo por error en conexión'
    });
  }
}
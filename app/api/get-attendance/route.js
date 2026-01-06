import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    console.log('📋 Obteniendo registros de asistencia...');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    
    console.log('🔍 Parámetros:', { search, date });
    
    // Obtener registros con filtros
    const attendance = await googleSheets.getAttendanceRecords({ search, date });
    
    console.log(`✅ ${attendance.length} registros obtenidos`);
    
    // Asegurar que tenemos los campos correctos
    const processedData = attendance.map(record => ({
      employeeId: record.employeeId || '',
      employeeName: record.employeeName || '',
      date: record.date || '',
      time: record.time || '',
      type: record.type || 'entrada',
      timestamp: record.timestamp || new Date().toISOString(),
      // Agregar department si está disponible
      department: record.department || ''
    }));
    
    return NextResponse.json(processedData); // ¡CORREGIDO! era "attention"
    
  } catch (error) {
    console.error('❌ Error en /api/get-attendance:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Solo devolver array vacío en caso de error
    return NextResponse.json([]);
  }
}
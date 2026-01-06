import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/googleSheets';

export async function GET() {
  try {
    // Probar conexión
    const connection = await googleSheets.testConnection();
    
    // Obtener empleados
    const employees = await googleSheets.getEmployees();
    
    return NextResponse.json({
      success: true,
      connection,
      employeesCount: employees.length,
      employees: employees.slice(0, 5), // Mostrar solo primeros 5
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Error en prueba de Google Sheets',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
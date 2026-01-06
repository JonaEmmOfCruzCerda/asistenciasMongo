import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Empleado from '@/app/models/Empleado';

export async function GET(solicitud) {
  try {
    await conectarDB();
    const { searchParams } = new URL(solicitud.url);
    const numero_empleado = searchParams.get('employeeId'); // Mantener compatibilidad

    if (numero_empleado) {
      const empleado = await Empleado.findOne({ 
        numero_empleado,
        activo: true 
      });

      if (!empleado) {
        return NextResponse.json(
          { error: 'Empleado no encontrado o inactivo' },
          { status: 404 }
        );
      }

      // Devolver datos en formato compatible con el frontend existente
      return NextResponse.json({
        name: empleado.nombre_completo,
        department: empleado.area
      });
    }

    // Si no hay employeeId, devolver todos los empleados activos
    const empleados = await Empleado.find({ activo: true });
    
    return NextResponse.json(
      empleados.map(emp => ({
        employeeId: emp.numero_empleado, // Compatibilidad
        name: emp.nombre_completo,
        department: emp.area
      }))
    );

  } catch (error) {
    console.error('❌ Error en GET /api/registrar-asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
}

// El POST ahora está en /api/asistencias
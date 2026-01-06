// Agrega este endpoint adicional para actualizar asistencias cuando cambia el número
// Crea un nuevo archivo: /app/api/actualizar-asistencias/route.js

import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

export async function POST(solicitud) {
  try {
    await conectarDB();
    
    const datos = await solicitud.json();
    const { numero_original, numero_nuevo } = datos;

    if (!numero_original || !numero_nuevo) {
      return NextResponse.json(
        { error: 'Números original y nuevo son requeridos' },
        { status: 400 }
      );
    }

    console.log(`🔄 Actualizando asistencias de ${numero_original} a ${numero_nuevo}`);

    // Actualizar todas las asistencias del empleado
    const resultado = await Asistencia.updateMany(
      { numero_empleado: numero_original },
      { $set: { numero_empleado: numero_nuevo } }
    );

    console.log('✅ Asistencias actualizadas:', resultado);

    return NextResponse.json({
      exito: true,
      mensaje: `Asistencias actualizadas de ${numero_original} a ${numero_nuevo}`,
      modificados: resultado.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error actualizando asistencias:', error);
    return NextResponse.json(
      { error: 'Error actualizando asistencias: ' + error.message },
      { status: 500 }
    );
  }
}
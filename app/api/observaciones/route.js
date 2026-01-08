import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Observacion from '@/app/models/Observacion';

export async function GET() {
  try {
    await conectarDB();
    const observaciones = await Observacion.find().sort({ fecha: -1 });
    return NextResponse.json(observaciones);
  } catch (error) {
    console.error('Error al obtener observaciones:', error);
    return NextResponse.json({ error: 'Error al obtener observaciones' }, { status: 500 });
  }
}

export async function POST(solicitud) {
  try {
    await conectarDB();
    const datos = await solicitud.json();
    
    const observacion = await Observacion.findOneAndUpdate(
      { employeeId: datos.employeeId },
      {
        employeeId: datos.employeeId,
        text: datos.text,
        date: datos.date,
        adminId: datos.adminId
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json(observacion);
  } catch (error) {
    console.error('Error al guardar observación:', error);
    return NextResponse.json({ error: 'Error al guardar observación' }, { status: 500 });
  }
}
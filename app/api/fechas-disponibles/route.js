// app/api/fechas-disponibles/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

export async function GET() {
  try {
    await conectarDB();
    
    console.log('📅 Obteniendo fechas disponibles...');
    
    // Obtener fechas únicas ordenadas de más reciente a más antigua
    const fechas = await Asistencia.aggregate([
      {
        $group: {
          _id: "$fecha",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          fecha: "$_id",
          count: 1,
          _id: 0
        }
      },
      { $sort: { fecha: -1 } } // Más reciente primero
    ]);
    
    console.log(`📋 ${fechas.length} fechas encontradas`);
    
    // Formatear para mostrar mejor
    const fechasFormateadas = fechas.map(f => ({
      valor: f.fecha,
      texto: f.fecha,
      registros: f.count
    }));
    
    return NextResponse.json(fechasFormateadas);
    
  } catch (error) {
    console.error('❌ Error obteniendo fechas:', error);
    return NextResponse.json([], { status: 500 });
  }
}
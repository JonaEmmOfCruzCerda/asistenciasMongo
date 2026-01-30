// app/api/fecha-maxima-asistencia/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

export async function GET() {
  try {
    await conectarDB();
    
    // Obtener la fecha más reciente de asistencia
    const ultimaAsistencia = await Asistencia.findOne()
      .sort({ marca_tiempo: -1 })
      .select('fecha marca_tiempo');
    
    if (!ultimaAsistencia) {
      return NextResponse.json({ 
        ultimaFecha: null,
        mensaje: 'No hay registros de asistencia' 
      });
    }
    
    // También obtener la fecha mínima
    const primeraAsistencia = await Asistencia.findOne()
      .sort({ marca_tiempo: 1 })
      .select('fecha marca_tiempo');
    
    // Convertir fecha string DD/MM/YYYY a objeto Date
    const parsearFecha = (fechaStr) => {
      const [dia, mes, año] = fechaStr.split('/').map(Number);
      return new Date(año, mes - 1, dia);
    };
    
    return NextResponse.json({
      ultimaFecha: ultimaAsistencia.fecha,
      ultimaFechaObj: parsearFecha(ultimaAsistencia.fecha),
      ultimoTimestamp: ultimaAsistencia.marca_tiempo,
      primeraFecha: primeraAsistencia?.fecha || null,
      primeraFechaObj: primeraAsistencia ? parsearFecha(primeraAsistencia.fecha) : null,
      totalRegistros: await Asistencia.countDocuments()
    });
    
  } catch (error) {
    console.error('Error en fecha-maxima-asistencia:', error);
    return NextResponse.json({ 
      error: 'Error al obtener fechas',
      detalles: error.message 
    }, { status: 500 });
  }
}
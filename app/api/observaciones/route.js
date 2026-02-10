// app/api/observaciones/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Observacion from '@/app/models/Observacion';

// GET: Obtener observaciones con filtros opcionales
export async function GET(solicitud) {
  try {
    await conectarDB();
    
    const { searchParams } = new URL(solicitud.url);
    const employeeId = searchParams.get('employeeId');
    const fecha = searchParams.get('fecha');
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');
    const start = searchParams.get('start'); // Para compatibilidad
    const end = searchParams.get('end'); // Para compatibilidad
    
    const filtro = {};
    
    if (employeeId) {
      filtro.employeeId = employeeId;
    }
    
    // FILTRO POR FECHA ESPECÍFICA (para tabla diaria)
    if (fecha) {
      filtro.fecha = fecha;
    }
    
    // FILTRO POR RANGO DE FECHAS (para exportación semanal)
    // Usar fecha_inicio/fecha_fin o start/end
    const inicioParam = fecha_inicio || start;
    const finParam = fecha_fin || end;
    
    if (inicioParam && finParam) {
      // Convertir fechas de formato DD/MM/YYYY a YYYY-MM-DD para comparación
      const convertirFecha = (fechaStr) => {
        if (!fechaStr) return null;
        
        // Si ya está en formato DD/MM/YYYY
        if (fechaStr.includes('/')) {
          const [dia, mes, año] = fechaStr.split('/');
          return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        return fechaStr;
      };
      
      const fechaInicio = convertirFecha(inicioParam);
      const fechaFin = convertirFecha(finParam);
      
      if (fechaInicio && fechaFin) {
        // Buscar todas las observaciones y filtrar por rango
        const todasObservaciones = await Observacion.find({}).lean();
        
        const observacionesFiltradas = todasObservaciones.filter(obs => {
          if (!obs.fecha) return false;
          
          // Convertir fecha de observación a formato comparable
          const [diaObs, mesObs, añoObs] = obs.fecha.split('/');
          const fechaObsFormatted = `${añoObs}-${mesObs.padStart(2, '0')}-${diaObs.padStart(2, '0')}`;
          
          return fechaObsFormatted >= fechaInicio && fechaObsFormatted <= fechaFin;
        });
        
        return NextResponse.json(observacionesFiltradas);
      }
    }
    
    // Si no hay filtro de rango, devolver normalmente
    const observaciones = await Observacion.find(filtro).sort({ fecha: -1, createdAt: -1 });
    
    return NextResponse.json(observaciones);
    
  } catch (error) {
    console.error('Error al obtener observaciones:', error);
    return NextResponse.json({ error: 'Error al obtener observaciones' }, { status: 500 });
  }
}

// POST: Crear o actualizar observación
export async function POST(solicitud) {
  try {
    await conectarDB();
    const datos = await solicitud.json();
    
    console.log('📝 Datos recibidos para observación:', datos);
    
    if (!datos.employeeId || !datos.fecha) {
      return NextResponse.json(
        { error: 'employeeId y fecha son requeridos' },
        { status: 400 }
      );
    }
    
    // Usar un espacio en blanco si text está vacío
    const textoObservacion = (datos.text && datos.text.trim() !== '') ? datos.text : ' ';
    const tipoFalta = datos.tipoFalta || '';
    
    // Buscar si ya existe una observación para este empleado en esta fecha
    const observacionExistente = await Observacion.findOne({
      employeeId: datos.employeeId,
      fecha: datos.fecha
    });
    
    let observacion;
    
    if (observacionExistente) {
      // Actualizar observación existente
      observacionExistente.text = textoObservacion;
      observacionExistente.tipoFalta = tipoFalta;
      observacionExistente.adminId = datos.adminId || 'admin';
      observacionExistente.date = new Date();
      
      observacion = await observacionExistente.save();
      console.log('🔄 Observación actualizada para', datos.employeeId, 'fecha', datos.fecha);
    } else {
      // Crear nueva observación
      observacion = await Observacion.create({
        employeeId: datos.employeeId,
        text: textoObservacion,
        tipoFalta: tipoFalta,
        fecha: datos.fecha,
        date: new Date(),
        adminId: datos.adminId || 'admin'
      });
      console.log('✅ Nueva observación creada para', datos.employeeId, 'fecha', datos.fecha);
    }
    
    return NextResponse.json(observacion);
    
  } catch (error) {
    console.error('❌ Error al guardar observación:', error);
    return NextResponse.json({ 
      error: 'Error al guardar observación',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE: Eliminar observación
export async function DELETE(solicitud) {
  try {
    await conectarDB();
    
    const { searchParams } = new URL(solicitud.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }
    
    await Observacion.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Observación eliminada correctamente' 
    });
    
  } catch (error) {
    console.error('Error al eliminar observación:', error);
    return NextResponse.json({ error: 'Error al eliminar observación' }, { status: 500 });
  }
}
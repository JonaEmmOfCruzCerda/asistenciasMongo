// app/api/observaciones/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Observacion from '@/app/models/Observacion';

// GET: Obtener observaciones con filtros opcionales
export async function GET(solicitud) {
  try {
    await conectarDB();
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(solicitud.url);
    const employeeId = searchParams.get('employeeId');
    const fecha = searchParams.get('fecha');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    
    // Construir filtro de consulta
    const filtro = {};
    
    if (employeeId) {
      filtro.employeeId = employeeId;
    }
    
    if (fecha) {
      filtro.fecha = fecha;
    }
    
    if (fechaInicio && fechaFin) {
      filtro.fecha = {
        $gte: fechaInicio,
        $lte: fechaFin
      };
    }
    
    // Obtener observaciones ordenadas por fecha descendente
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
    
    // Validar datos requeridos
    if (!datos.employeeId || !datos.fecha) {
      return NextResponse.json(
        { error: 'employeeId y fecha son requeridos' },
        { status: 400 }
      );
    }
    
    // Buscar si ya existe una observación para este empleado en esta fecha
    const observacionExistente = await Observacion.findOne({
      employeeId: datos.employeeId,
      fecha: datos.fecha
    });
    
    let observacion;
    
    if (observacionExistente) {
      // Actualizar observación existente
      observacionExistente.text = datos.text || '';
      observacionExistente.tipoFalta = datos.tipoFalta || '';
      observacionExistente.adminId = datos.adminId || 'admin';
      observacionExistente.date = new Date();
      
      observacion = await observacionExistente.save();
    } else {
      // Crear nueva observación
      observacion = await Observacion.create({
        employeeId: datos.employeeId,
        text: datos.text || '',
        tipoFalta: datos.tipoFalta || '',
        fecha: datos.fecha,
        date: datos.date || new Date(),
        adminId: datos.adminId || 'admin'
      });
    }
    
    return NextResponse.json(observacion);
    
  } catch (error) {
    console.error('Error al guardar observación:', error);
    return NextResponse.json({ error: 'Error al guardar observación' }, { status: 500 });
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

// PUT: Actualizar observación específica
export async function PUT(solicitud) {
  try {
    await conectarDB();
    const datos = await solicitud.json();
    
    if (!datos.id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }
    
    const observacion = await Observacion.findByIdAndUpdate(
      datos.id,
      {
        text: datos.text || '',
        tipoFalta: datos.tipoFalta || '',
        adminId: datos.adminId || 'admin',
        date: new Date()
      },
      { new: true }
    );
    
    if (!observacion) {
      return NextResponse.json(
        { error: 'Observación no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(observacion);
    
  } catch (error) {
    console.error('Error al actualizar observación:', error);
    return NextResponse.json({ error: 'Error al actualizar observación' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';
import Empleado from '@/app/models/Empleado';

/**
 * GET → Obtener registros de asistencia
 */
export async function GET(solicitud) {
  try {
    await conectarDB();
    
    const { searchParams } = new URL(solicitud.url);
    const buscar = searchParams.get('buscar') || '';
    const fecha = searchParams.get('fecha') || '';
    const limite = parseInt(searchParams.get('limite') || '50');
    const numeroEmpleado = searchParams.get('numero_empleado');

    let consulta = {};

    // Filtrar por fecha si se proporciona
    if (fecha) {
      consulta.fecha = fecha;
    }

    // Filtrar por número de empleado si se proporciona
    if (numeroEmpleado) {
      consulta.numero_empleado = numeroEmpleado;
    }

    // Búsqueda por texto
    if (buscar) {
      consulta.$or = [
        { nombre_empleado: { $regex: buscar, $options: 'i' } },
        { area_empleado: { $regex: buscar, $options: 'i' } },
        { numero_empleado: { $regex: buscar, $options: 'i' } }
      ];
    }

    // Obtener registros ordenados por fecha más reciente
    const asistencias = await Asistencia.find(consulta)
      .sort({ marca_tiempo: -1 })
      .limit(limite);

    return NextResponse.json(asistencias);

  } catch (error) {
    console.error('❌ Error en GET /api/asistencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener registros de asistencia: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST → Registrar nueva asistencia (CORREGIDO PARA VERCEL)
 */
export async function POST(solicitud) {
  try {
    console.log('🔄 Iniciando conexión a MongoDB...');
    await conectarDB();
    console.log('✅ MongoDB conectado');
    
    const datos = await solicitud.json();
    const { numero_empleado } = datos;

    console.log('👤 Número de empleado recibido:', numero_empleado);

    if (!numero_empleado || numero_empleado.trim() === '') {
      console.error('❌ Número de empleado vacío');
      return NextResponse.json(
        { error: 'Número de empleado requerido' },
        { status: 400 }
      );
    }

    // Buscar empleado activo
    console.log(`🔍 Buscando empleado: ${numero_empleado}`);
    const empleado = await Empleado.findOne({ 
      numero_empleado: numero_empleado.trim(),
      activo: true 
    });

    if (!empleado) {
      console.error('❌ Empleado no encontrado o inactivo:', numero_empleado);
      return NextResponse.json(
        { 
          error: 'Empleado no encontrado o inactivo',
          numero_empleado: numero_empleado 
        },
        { status: 404 }
      );
    }

    console.log('✅ Empleado encontrado:', {
      nombre: empleado.nombre_completo,
      area: empleado.area,
      activo: empleado.activo
    });

    // Verificar si ya tiene asistencia hoy (antes de las 20 horas)
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0]; // Fecha en formato YYYY-MM-DD
    
    console.log('📅 Verificando registros de hoy:', hoy);
    
    // Buscar registros del empleado hoy
    const registroHoy = await Asistencia.findOne({
      numero_empleado: numero_empleado,
      marca_tiempo: {
        $gte: new Date(hoy + 'T00:00:00.000Z'),
        $lt: new Date(hoy + 'T23:59:59.999Z')
      }
    });

    if (registroHoy) {
      console.log('⚠️ Ya tiene registro hoy:', registroHoy.marca_tiempo);
      
      // Calcular horas transcurridas desde el último registro
      const ultimoRegistro = new Date(registroHoy.marca_tiempo);
      const horasTranscurridas = (ahora - ultimoRegistro) / (1000 * 60 * 60);
      
      console.log('⏰ Horas transcurridas:', horasTranscurridas.toFixed(2));
      
      if (horasTranscurridas < 20) {
        const horasRestantes = (20 - horasTranscurridas).toFixed(2);
        const proximoRegistro = new Date(ultimoRegistro.getTime() + (20 * 60 * 60 * 1000));
        
        console.log('⏳ Horas restantes para nuevo registro:', horasRestantes);
        
        return NextResponse.json(
          { 
            error: `Ya registraste asistencia hoy. Espera ${horasRestantes} horas más.`,
            proximo_registro: proximoRegistro.toISOString(),
            horas_restantes: horasRestantes
          },
          { status: 400 }
        );
      }
    }

    // Crear registro de asistencia CON HORA SEGURA PARA VERCEL
    // En Vercel, las fechas están en UTC
    const fechaUTC = ahora;
    
    // Convertir a formato de fecha Jalisco (DD/MM/YYYY)
    const dia = fechaUTC.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaUTC.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fechaUTC.getUTCFullYear();
    const fechaStr = `${dia}/${mes}/${año}`;
    
    // Convertir a hora Jalisco (UTC-6)
    const horaJalisco = new Date(fechaUTC.getTime() - (6 * 60 * 60 * 1000)); // Restar 6 horas para Jalisco
    const horaStr = horaJalisco.getUTCHours().toString().padStart(2, '0') + ':' +
                    horaJalisco.getUTCMinutes().toString().padStart(2, '0') + ':' +
                    horaJalisco.getUTCSeconds().toString().padStart(2, '0');

    console.log('🕐 Fecha y hora registradas:', {
      fecha: fechaStr,
      hora: horaStr,
      marca_tiempo_utc: fechaUTC,
      zona_horaria: 'Jalisco (UTC-6)'
    });

    // Crear el registro de asistencia
    const nuevaAsistencia = await Asistencia.create({
      numero_empleado: empleado.numero_empleado,
      nombre_empleado: empleado.nombre_completo,
      area_empleado: empleado.area,
      fecha: fechaStr,
      hora: horaStr,
      marca_tiempo: fechaUTC,
      tipo_registro: 'entrada'
    });

    console.log('✅ Asistencia registrada exitosamente:', {
      id: nuevaAsistencia._id,
      empleado: empleado.nombre_completo,
      hora: horaStr
    });

    return NextResponse.json({
      exito: true,
      mensaje: 'Asistencia registrada exitosamente',
      nombre_empleado: empleado.nombre_completo,
      area: empleado.area,
      fecha: fechaStr,
      hora: horaStr,
      marca_tiempo: nuevaAsistencia.marca_tiempo,
      id_registro: nuevaAsistencia._id
    });

  } catch (error) {
    console.error('❌ Error en POST /api/asistencias:', error);
    console.error('📋 Detalles del error:', {
      nombre: error.name,
      mensaje: error.message,
      stack: error.stack
    });
    
    // Si es error de duplicado de MongoDB
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe un registro similar en este momento' },
        { status: 409 }
      );
    }
    
    // Si es error de validación
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { 
          error: 'Error de validación',
          detalles: errores 
        },
        { status: 400 }
      );
    }
    
    // Error general
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al registrar asistencia',
        detalles: process.env.NODE_ENV === 'development' ? error.message : 'Contacte al administrador'
      },
      { status: 500 }
    );
  }
}

/**
 * Función para obtener estadísticas (si necesitas esta ruta)
 */
export async function GET_ESTADISTICAS() {
  try {
    await conectarDB();
    
    const hoy = new Date().toISOString().split('T')[0];
    
    const [
      total_empleados,
      empleados_activos,
      total_asistencias,
      asistencias_hoy
    ] = await Promise.all([
      Empleado.countDocuments(),
      Empleado.countDocuments({ activo: true }),
      Asistencia.countDocuments(),
      Asistencia.countDocuments({
        marca_tiempo: {
          $gte: new Date(hoy + 'T00:00:00.000Z'),
          $lt: new Date(hoy + 'T23:59:59.999Z')
        }
      })
    ]);

    // Empleados únicos hoy
    const empleadosUnicosHoy = await Asistencia.distinct('numero_empleado', {
      marca_tiempo: {
        $gte: new Date(hoy + 'T00:00:00.000Z'),
        $lt: new Date(hoy + 'T23:59:59.999Z')
      }
    });

    // Registros por área
    const registrosPorArea = await Asistencia.aggregate([
      {
        $group: {
          _id: '$area_empleado',
          total: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    return NextResponse.json({
      total_empleados,
      empleados_activos,
      total_asistencias,
      asistencias_hoy,
      empleados_unicos_hoy: empleadosUnicosHoy.length,
      registros_por_area: registrosPorArea.reduce((acc, curr) => {
        acc[curr._id || 'Sin área'] = curr.total;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('❌ Error en estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';
import Empleado from '@/app/models/Empleado';

// Constante para offset de Jalisco (UTC-6)
const JALISCO_OFFSET = -6;

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
      { error: 'Error al obtener registros de asistencia' },
      { status: 500 }
    );
  }
}

/**
 * Función para convertir fecha UTC a formato Jalisco (DD/MM/YYYY HH:MM:SS)
 * FUNCIONA TANTO EN LOCAL COMO EN VERCEL
 */
function formatDateToJalisco(date) {
  // Ajustar a hora de Jalisco (UTC-6)
  const jaliscoDate = new Date(date.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
  
  // Formato DD/MM/YYYY
  const day = jaliscoDate.getUTCDate().toString().padStart(2, '0');
  const month = (jaliscoDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = jaliscoDate.getUTCFullYear();
  const fechaStr = `${day}/${month}/${year}`;
  
  // Formato HH:MM:SS
  const hours = jaliscoDate.getUTCHours().toString().padStart(2, '0');
  const minutes = jaliscoDate.getUTCMinutes().toString().padStart(2, '0');
  const seconds = jaliscoDate.getUTCSeconds().toString().padStart(2, '0');
  const horaStr = `${hours}:${minutes}:${seconds}`;
  
  return { fecha: fechaStr, hora: horaStr };
}

/**
 * POST → Registrar nueva asistencia (CORREGIDO PARA VERCEL)
 */
export async function POST(solicitud) {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await conectarDB();
    console.log('✅ MongoDB conectado');
    
    // Parsear el cuerpo de la solicitud
    let datos;
    try {
      datos = await solicitud.json();
    } catch (parseError) {
      console.error('❌ Error al parsear JSON:', parseError);
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      );
    }
    
    const { numero_empleado } = datos;
    
    console.log('📥 Datos recibidos:', { numero_empleado });

    if (!numero_empleado || numero_empleado.trim() === '') {
      console.error('❌ Número de empleado vacío');
      return NextResponse.json(
        { error: 'Número de empleado requerido' },
        { status: 400 }
      );
    }

    console.log('👤 Buscando empleado:', numero_empleado);

    // Buscar empleado activo
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

    console.log('✅ Empleado encontrado:', empleado.nombre_completo);

    // Verificar si ya tiene asistencia hoy (menos de 20 horas)
    try {
      const ahora = new Date();
      console.log('📅 Verificando asistencia reciente...');
      
      // Método 1: Usar el método estático si existe
      if (typeof Asistencia.verificarAsistenciaReciente === 'function') {
        const verificacion = await Asistencia.verificarAsistenciaReciente(numero_empleado);
        
        if (verificacion.tieneAsistenciaReciente) {
          const horasTranscurridas = (ahora - verificacion.ultimaAsistencia.marca_tiempo) / (1000 * 60 * 60);
          const horasRestantes = (20 - horasTranscurridas).toFixed(2);
          
          console.log('⚠️ Tiene asistencia reciente:', {
            ultima: verificacion.ultimaAsistencia.marca_tiempo,
            horasTranscurridas,
            horasRestantes
          });
          
          return NextResponse.json(
            { 
              error: `Ya registraste asistencia recientemente. Espera ${horasRestantes} horas más.`,
              proximo_registro_permitido: verificacion.proximoRegistroPermitido,
              horas_restantes: horasRestantes
            },
            { status: 400 }
          );
        }
      } else {
        // Método 2: Verificación manual
        const ultimaAsistencia = await Asistencia.findOne({ 
          numero_empleado: numero_empleado 
        }).sort({ marca_tiempo: -1 });
        
        if (ultimaAsistencia) {
          const horasTranscurridas = (ahora - ultimaAsistencia.marca_tiempo) / (1000 * 60 * 60);
          
          if (horasTranscurridas < 20) {
            const horasRestantes = (20 - horasTranscurridas).toFixed(2);
            console.log('⚠️ Asistencia reciente encontrada:', {
              ultima: ultimaAsistencia.marca_tiempo,
              horasTranscurridas,
              horasRestantes
            });
            
            return NextResponse.json(
              { 
                error: `Ya registraste asistencia recientemente. Espera ${horasRestantes} horas más.`,
                horas_restantes: horasRestantes
              },
              { status: 400 }
            );
          }
        }
      }
    } catch (verificacionError) {
      console.warn('⚠️ Error en verificación, continuando...:', verificacionError.message);
      // Continuar con el registro si hay error en la verificación
    }

    // Crear registro de asistencia CON FORMATO SEGURO PARA VERCEL
    const ahora = new Date();
    console.log('🕐 Fecha UTC actual:', ahora.toISOString());
    
    // Usar función segura para Vercel
    const { fecha, hora } = formatDateToJalisco(ahora);
    
    console.log('📝 Datos a guardar (Jalisco):', {
      fecha,
      hora,
      timestamp_utc: ahora
    });

    // Crear el registro de asistencia
    const nuevaAsistencia = await Asistencia.create({
      numero_empleado: empleado.numero_empleado,
      nombre_empleado: empleado.nombre_completo,
      area_empleado: empleado.area,
      fecha: fecha,
      hora: hora,
      marca_tiempo: ahora,
      tipo_registro: 'entrada'
    });

    console.log('✅ Asistencia registrada exitosamente:', {
      id: nuevaAsistencia._id,
      empleado: empleado.nombre_completo,
      fecha,
      hora
    });

    return NextResponse.json({
      exito: true,
      mensaje: 'Asistencia registrada exitosamente',
      nombre_empleado: empleado.nombre_completo,
      area: empleado.area,
      fecha: fecha,
      hora: hora,
      marca_tiempo: nuevaAsistencia.marca_tiempo,
      id_registro: nuevaAsistencia._id
    });

  } catch (error) {
    console.error('❌ Error en POST /api/asistencias:', error);
    console.error('📋 Detalles del error:', {
      nombre: error.name,
      mensaje: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
          error: 'Error de validación de datos',
          detalles: errores 
        },
        { status: 400 }
      );
    }
    
    // Error de conexión a MongoDB
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseError') {
      return NextResponse.json(
        { 
          error: 'Error de conexión con la base de datos',
          detalles: process.env.NODE_ENV === 'development' ? error.message : 'Contacte al administrador'
        },
        { status: 503 }
      );
    }
    
    // Error general
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        detalles: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar la solicitud'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT → Actualizar asistencia (si necesitas)
 */
export async function PUT(solicitud) {
  try {
    await conectarDB();
    const datos = await solicitud.json();
    
    // Implementar lógica de actualización si es necesario
    return NextResponse.json({ mensaje: 'Método PUT no implementado' });
    
  } catch (error) {
    console.error('❌ Error en PUT /api/asistencias:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asistencia' },
      { status: 500 }
    );
  }
}

/**
 * DELETE → Eliminar asistencia (si necesitas)
 */
export async function DELETE(solicitud) {
  try {
    await conectarDB();
    const { searchParams } = new URL(solicitud.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      );
    }
    
    // Implementar lógica de eliminación si es necesario
    return NextResponse.json({ mensaje: 'Método DELETE no implementado' });
    
  } catch (error) {
    console.error('❌ Error en DELETE /api/asistencias:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asistencia' },
      { status: 500 }
    );
  }
}
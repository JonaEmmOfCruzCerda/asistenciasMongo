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
 * Función para verificar si es después de las 4:00 PM (hora Jalisco)
 */
function esDespuesDeLas4PM() {
  const ahora = new Date();
  const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
  const hora = fechaJalisco.getUTCHours();
  const minutos = fechaJalisco.getUTCMinutes();
  
  // Después de las 4:00 PM (16:00)
  return hora > 16 || (hora === 16 && minutos >= 0);
}

/**
 * Función para obtener la fecha de hoy en formato Jalisco
 */
function getCurrentJaliscoDate() {
  const ahora = new Date();
  const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
  
  const dia = fechaJalisco.getUTCDate().toString().padStart(2, '0');
  const mes = (fechaJalisco.getUTCMonth() + 1).toString().padStart(2, '0');
  const año = fechaJalisco.getUTCFullYear();
  
  return `${dia}/${mes}/${año}`;
}

/**
 * Función para calcular cuánto falta para las 4:00 PM
 */
function calcularTiempoHasta4PM() {
  const ahora = new Date();
  const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
  
  const horaActual = fechaJalisco.getUTCHours();
  const minutosActual = fechaJalisco.getUTCMinutes();
  
  // Calcular minutos totales actuales
  const minutosActualesTotales = horaActual * 60 + minutosActual;
  
  // Minutos totales de las 4:00 PM (16:00)
  const minutos4PM = 16 * 60;
  
  // Calcular minutos restantes
  const minutosRestantes = minutos4PM - minutosActualesTotales;
  
  if (minutosRestantes <= 0) {
    return { horas: 0, minutos: 0, totalMinutos: 0 };
  }
  
  const horasRestantes = Math.floor(minutosRestantes / 60);
  const minutosRestantesFinal = minutosRestantes % 60;
  
  return {
    horas: horasRestantes,
    minutos: minutosRestantesFinal,
    totalMinutos: minutosRestantes
  };
}

/**
 * POST → Registrar nueva asistencia (ADAPTADO PARA LIBERAR DESPUÉS DE 4 PM)
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

    const ahora = new Date();
    const esDespuesDe4PMActual = esDespuesDeLas4PM();
    const fechaHoy = getCurrentJaliscoDate();
    
    console.log('🕐 Información hora actual:', {
      fechaHoy,
      esDespuesDe4PM: esDespuesDe4PMActual,
      horaJalisco: formatDateToJalisco(ahora).hora
    });

    // Buscar registros de hoy del empleado
    const registrosHoy = await Asistencia.find({
      numero_empleado: numero_empleado,
      fecha: fechaHoy
    }).sort({ marca_tiempo: -1 });

    console.log('📊 Registros de hoy encontrados:', registrosHoy.length);

    // LÓGICA PRINCIPAL: VERIFICAR SEGÚN HORA ACTUAL
    
    if (!esDespuesDe4PMActual) {
      // ANTES DE LAS 4:00 PM
      
      // Verificar si ya tiene entrada registrada hoy
      const tieneEntradaHoy = registrosHoy.some(r => r.tipo_registro === 'entrada');
      
      if (tieneEntradaHoy) {
        console.log('⚠️ Empleado ya registró entrada hoy (antes de 4 PM)');
        
        // Calcular cuánto falta para las 4 PM
        const tiempoHasta4PM = calcularTiempoHasta4PM();
        
        let mensajeError = 'Ya registraste entrada hoy. ';
        
        if (tiempoHasta4PM.totalMinutos > 0) {
          if (tiempoHasta4PM.horas > 0) {
            mensajeError += `Puedes registrar nuevamente después de las 4:00 PM (en ${tiempoHasta4PM.horas}h ${tiempoHasta4PM.minutos}m)`;
          } else {
            mensajeError += `Puedes registrar nuevamente después de las 4:00 PM (en ${tiempoHasta4PM.minutos} minutos)`;
          }
        } else {
          mensajeError += 'Puedes registrar nuevamente después de las 4:00 PM';
        }
        
        return NextResponse.json(
          { 
            error: mensajeError,
            tiene_entrada_hoy: true,
            es_antes_de_4pm: true,
            tiempo_hasta_4pm: tiempoHasta4PM,
            puede_registrar_despues_4pm: true
          },
          { status: 400 }
        );
      }
      
      // Si no tiene entrada hoy, puede registrar
      console.log('✅ No tiene entrada hoy, puede registrar (antes de 4 PM)');
      
    } else {
      // DESPUÉS DE LAS 4:00 PM - SIEMPRE PUEDE REGISTRAR
      console.log('✅ Es después de las 4:00 PM, puede registrar libremente');
    }
    
    // Determinar tipo de registro
    let tipoRegistro = 'entrada';
    
    if (registrosHoy.length > 0) {
      // Si ya tiene registros hoy, alternar el tipo
      const ultimoRegistro = registrosHoy[0];
      
      if (esDespuesDe4PMActual) {
        // Después de 4 PM: alternar entre entrada/salida
        tipoRegistro = ultimoRegistro.tipo_registro === 'entrada' ? 'salida' : 'entrada';
      } else {
        // Antes de 4 PM: será entrada (ya verificamos que no tenga entrada)
        tipoRegistro = 'entrada';
      }
      
      console.log('🔄 Último registro hoy:', {
        tipo: ultimoRegistro.tipo_registro,
        hora: ultimoRegistro.hora,
        nuevo_tipo: tipoRegistro
      });
    }

    // Crear registro de asistencia
    const { fecha, hora } = formatDateToJalisco(ahora);
    
    console.log('📝 Datos a guardar:', {
      fecha,
      hora,
      tipo_registro: tipoRegistro,
      timestamp_utc: ahora.toISOString()
    });

    // Crear el registro de asistencia
    const nuevaAsistencia = await Asistencia.create({
      numero_empleado: empleado.numero_empleado,
      nombre_empleado: empleado.nombre_completo,
      area_empleado: empleado.area,
      fecha: fecha,
      hora: hora,
      marca_tiempo: ahora,
      tipo_registro: tipoRegistro
    });

    console.log('✅ Asistencia registrada exitosamente:', {
      id: nuevaAsistencia._id,
      empleado: empleado.nombre_completo,
      fecha,
      hora,
      tipo: tipoRegistro,
      es_despues_de_4pm: esDespuesDe4PMActual
    });

    return NextResponse.json({
      exito: true,
      mensaje: 'Asistencia registrada exitosamente',
      nombre_empleado: empleado.nombre_completo,
      area: empleado.area,
      fecha: fecha,
      hora: hora,
      tipo_registro: tipoRegistro,
      marca_tiempo: nuevaAsistencia.marca_tiempo,
      id_registro: nuevaAsistencia._id,
      es_despues_de_4pm: esDespuesDe4PMActual,
      registros_hoy: registrosHoy.length + 1
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
 * PUT → Actualizar asistencia
 */
export async function PUT(solicitud) {
  try {
    await conectarDB();
    const datos = await solicitud.json();
    
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
 * DELETE → Eliminar asistencia
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
    
    return NextResponse.json({ mensaje: 'Método DELETE no implementado' });
    
  } catch (error) {
    console.error('❌ Error en DELETE /api/asistencias:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asistencia' },
      { status: 500 }
    );
  }
}
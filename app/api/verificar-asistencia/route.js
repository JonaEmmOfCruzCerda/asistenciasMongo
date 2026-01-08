import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

// Constante para offset de Jalisco (UTC-6)
const JALISCO_OFFSET = -6;

/**
 * Función para obtener fecha actual en formato Jalisco (DD/MM/YYYY)
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
    return { horas: 0, minutos: 0, totalMinutos: 0, ya_paso_4pm: true };
  }
  
  const horasRestantes = Math.floor(minutosRestantes / 60);
  const minutosRestantesFinal = minutosRestantes % 60;
  
  return {
    horas: horasRestantes,
    minutos: minutosRestantesFinal,
    totalMinutos: minutosRestantes,
    ya_paso_4pm: false
  };
}

/**
 * Función para formatear hora de Jalisco
 */
function getCurrentJaliscoTime() {
  const ahora = new Date();
  const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
  
  const hora = fechaJalisco.getUTCHours().toString().padStart(2, '0');
  const minutos = fechaJalisco.getUTCMinutes().toString().padStart(2, '0');
  const segundos = fechaJalisco.getUTCSeconds().toString().padStart(2, '0');
  
  return `${hora}:${minutos}:${segundos}`;
}

export async function GET(solicitud) {
  const { searchParams } = new URL(solicitud.url);
  const numero_empleado = searchParams.get('numero_empleado');

  if (!numero_empleado) {
    return NextResponse.json(
      { error: 'Número de empleado requerido' },
      { status: 400 }
    );
  }

  try {
    await conectarDB();

    console.log('🔍 Verificando asistencia para empleado:', numero_empleado);
    
    const ahora = new Date();
    const fechaHoy = getCurrentJaliscoDate();
    const horaActualJalisco = getCurrentJaliscoTime();
    const esDespuesDe4PMActual = esDespuesDeLas4PM();
    const tiempoHasta4PM = calcularTiempoHasta4PM();
    
    console.log('📅 Información actual:', {
      fechaHoy,
      horaActualJalisco,
      esDespuesDe4PM: esDespuesDe4PMActual,
      tiempoHasta4PM
    });

    // Buscar registros de hoy del empleado
    const registrosHoy = await Asistencia.find({
      numero_empleado: numero_empleado,
      fecha: fechaHoy
    }).sort({ marca_tiempo: -1 });

    console.log('📊 Registros de hoy encontrados:', registrosHoy.length);

    // Determinar si puede registrar basado en la lógica de 4 PM
    let puede_registrar = true;
    let razon_bloqueo = null;
    let tiene_entrada_hoy = false;
    let tiene_registros_hoy = registrosHoy.length > 0;
    let ultimo_registro_hoy = null;
    let siguiente_tipo_registro = 'entrada';
    
    if (registrosHoy.length > 0) {
      ultimo_registro_hoy = registrosHoy[0];
      tiene_entrada_hoy = registrosHoy.some(r => r.tipo_registro === 'entrada');
      
      // Determinar siguiente tipo de registro
      if (ultimo_registro_hoy.tipo_registro === 'entrada') {
        siguiente_tipo_registro = 'salida';
      } else {
        siguiente_tipo_registro = 'entrada';
      }
    }

    // APLICAR LÓGICA DE 4 PM
    if (!esDespuesDe4PMActual) {
      // ANTES DE LAS 4:00 PM
      if (tiene_entrada_hoy) {
        // Ya registró entrada hoy → NO puede registrar hasta después de 4 PM
        puede_registrar = false;
        razon_bloqueo = 'Ya registraste entrada hoy. Espera hasta después de las 4:00 PM.';
      }
    } else {
      // DESPUÉS DE LAS 4:00 PM - SIEMPRE PUEDE REGISTRAR
      puede_registrar = true;
      razon_bloqueo = null;
    }

    // Preparar respuesta detallada
    const respuesta = {
      // Información básica
      numero_empleado: numero_empleado,
      fecha_hoy: fechaHoy,
      hora_actual_jalisco: horaActualJalisco,
      es_despues_de_4pm: esDespuesDe4PMActual,
      
      // Estado de registro
      puede_registrar: puede_registrar,
      razon_bloqueo: razon_bloqueo,
      siguiente_tipo_registro: siguiente_tipo_registro,
      
      // Información de registros
      tiene_registros_hoy: tiene_registros_hoy,
      tiene_entrada_hoy: tiene_entrada_hoy,
      total_registros_hoy: registrosHoy.length,
      
      // Información de tiempo
      tiempo_hasta_4pm: tiempoHasta4PM,
      mensaje_tiempo: !esDespuesDe4PMActual && tiempoHasta4PM.totalMinutos > 0 
        ? `Faltan ${tiempoHasta4PM.horas}h ${tiempoHasta4PM.minutos}m para las 4:00 PM`
        : esDespuesDe4PMActual 
          ? 'Es después de las 4:00 PM - Puedes registrar libremente'
          : 'Ya pasaron las 4:00 PM',
      
      // Detalles de registros
      ultimo_registro: ultimo_registro_hoy ? {
        tipo: ultimo_registro_hoy.tipo_registro,
        hora: ultimo_registro_hoy.hora,
        fecha: ultimo_registro_hoy.fecha,
        marca_tiempo: ultimo_registro_hoy.marca_tiempo
      } : null,
      
      // Historial de hoy (solo primeros 5 registros)
      registros_hoy: registrosHoy.slice(0, 5).map(r => ({
        tipo: r.tipo_registro,
        hora: r.hora,
        marca_tiempo: r.marca_tiempo
      }))
    };

    console.log('📋 Resultado de verificación:', {
      puede_registrar: respuesta.puede_registrar,
      tiene_entrada_hoy: respuesta.tiene_entrada_hoy,
      es_despues_de_4pm: respuesta.es_despues_de_4pm
    });

    return NextResponse.json(respuesta);

  } catch (error) {
    console.error('❌ Error verificando asistencia:', error);
    
    // En caso de error, permitir registro por defecto
    return NextResponse.json({ 
      error: 'Error verificando asistencia: ' + error.message,
      numero_empleado: numero_empleado,
      puede_registrar: true, // Por defecto permitir si hay error
      es_despues_de_4pm: esDespuesDeLas4PM(),
      tiene_registros_hoy: false,
      tiene_entrada_hoy: false,
      total_registros_hoy: 0,
      razon_bloqueo: null,
      siguiente_tipo_registro: 'entrada',
      fecha_hoy: getCurrentJaliscoDate(),
      hora_actual_jalisco: getCurrentJaliscoTime()
    }, { status: 500 });
  }
}
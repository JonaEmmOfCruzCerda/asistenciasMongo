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
    console.error('❌ Error en /api/asistencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener registros de asistencia' },
      { status: 500 }
    );
  }
}

/**
 * POST → Registrar nueva asistencia
 */
// En /app/api/asistencias/route.js - Modificar el POST:

// En la función POST del endpoint /api/asistencias:

export async function POST(solicitud) {
  try {
    await conectarDB();
    const { numero_empleado } = await solicitud.json();

    if (!numero_empleado) {
      return NextResponse.json(
        { error: 'Número de empleado requerido' },
        { status: 400 }
      );
    }

    console.log('👤 Registrando asistencia para empleado:', numero_empleado);

    // Buscar empleado
    const empleado = await Empleado.findOne({ 
      numero_empleado: numero_empleado,
      activo: true 
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado o inactivo' },
        { status: 404 }
      );
    }

    console.log('✅ Empleado encontrado:', empleado.nombre_completo);

    // Verificar si ya tiene asistencia reciente (menos de 20 horas)
    const verificacion = await Asistencia.verificarAsistenciaReciente(numero_empleado);
    
    if (verificacion.tieneAsistenciaReciente) {
      const horasTranscurridas = (Date.now() - verificacion.ultimaAsistencia.marca_tiempo) / (1000 * 60 * 60);
      const horasRestantes = (20 - horasTranscurridas).toFixed(2);
      
      return NextResponse.json(
        { 
          error: `Ya registraste asistencia recientemente. Espera ${horasRestantes} horas más.`,
          proximo_registro_permitido: verificacion.proximoRegistroPermitido,
          horas_restantes: horasRestantes
        },
        { status: 400 }
      );
    }

    // **SOLUCIÓN: Usar una fecha localizada segura**
    const ahora = new Date();
    
    // Obtener fecha y hora en formato de Jalisco (UTC-6)
    // En Vercel, usar toLocaleString con timeZone explícito puede fallar
    // Mejor usar cálculo manual para Jalisco (UTC-6 o UTC-5 dependiendo de horario de verano)
    const offsetJalisco = -6; // Jalisco generalmente es UTC-6
    const fechaUTC = ahora;
    const fechaJalisco = new Date(fechaUTC.getTime() + (offsetJalisco * 60 * 60 * 1000));
    
    // Formatear manualmente para evitar problemas de zona horaria en Vercel
    const fechaStr = fechaJalisco.toISOString().split('T')[0].split('-').reverse().join('/');
    
    const horaStr = fechaJalisco.getUTCHours().toString().padStart(2, '0') + ':' +
                   fechaJalisco.getUTCMinutes().toString().padStart(2, '0') + ':' +
                   fechaJalisco.getUTCSeconds().toString().padStart(2, '0');

    console.log('🕐 Fecha y hora registradas (Jalisco):', {
      fecha: fechaStr,
      hora: horaStr,
      zonaHoraria: `UTC${offsetJalisco}`
    });

    const nuevaAsistencia = await Asistencia.create({
      numero_empleado: empleado.numero_empleado,
      nombre_empleado: empleado.nombre_completo,
      area_empleado: empleado.area,
      fecha: fechaStr,
      hora: horaStr,
      marca_tiempo: fechaUTC, // Guardar en UTC
      tipo_registro: 'entrada'
    });

    console.log('✅ Asistencia registrada exitosamente:', nuevaAsistencia._id);

    return NextResponse.json({
      exito: true,
      mensaje: 'Asistencia registrada exitosamente',
      nombre_empleado: empleado.nombre_completo,
      area: empleado.area,
      fecha: fechaStr,
      hora: horaStr,
      marca_tiempo: nuevaAsistencia.marca_tiempo
    });

  } catch (error) {
    console.error('❌ Error en POST /api/asistencias:', error);
    
    // Si es error de duplicado
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe un registro similar' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al registrar asistencia',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
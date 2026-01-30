// app/api/asistencias-semana/route.js - VERSIÓN DEFINITIVA CON LÓGICA DE ASISTENCIA/RETARDO/FALTA
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';
import Empleado from '@/app/models/Empleado';

/* =========================
   UTILIDADES FECHA
========================= */

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function es5Enero2026(date) {
  return (
    date.getDate() === 5 &&
    date.getMonth() === 0 &&
    date.getFullYear() === 2026
  );
}

// 🟢 NUEVA FUNCIÓN: Verificar asistencia con lógica de 9:00 AM
async function verificarAsistenciaEmpleado(numero_empleado, fechaStr) {
  try {
    console.log(`🔍 Verificando asistencia para empleado ${numero_empleado} en fecha ${fechaStr}`);
    
    // Buscar registros del empleado para esta fecha específica
    const registrosFecha = await Asistencia.find({
      numero_empleado: numero_empleado,
      fecha: fechaStr
    }).sort({ marca_tiempo: 1 }); // Ordenar por tiempo ascendente
    
    if (registrosFecha.length === 0) {
      console.log(`   ❌ No hay registros para ${numero_empleado} en ${fechaStr}`);
      return {
        tieneAsistencia: false,
        tipoAsistencia: null,
        primeraHora: null,
        registros: []
      };
    }
    
    // Buscar el primer registro de ENTRADA del día
    const primeraEntrada = registrosFecha.find(r => r.tipo_registro === 'entrada');
    
    if (!primeraEntrada) {
      console.log(`   ⚠️ Hay registros pero no de entrada para ${numero_empleado} en ${fechaStr}`);
      return {
        tieneAsistencia: false,
        tipoAsistencia: 'falta',
        primeraHora: null,
        registros: registrosFecha
      };
    }
    
    // Extraer hora y minutos de la primera entrada
    const horaParts = primeraEntrada.hora.split(':');
    const hora = parseInt(horaParts[0]);
    const minutos = parseInt(horaParts[1]);
    
    console.log(`   📝 Primera entrada de ${numero_empleado}: ${primeraEntrada.hora}`);
    
    // Determinar si es antes o después de las 9:00 AM
    const esAntesDe9AM = hora < 9 || (hora === 9 && minutos === 0);
    
    if (esAntesDe9AM) {
      console.log(`   ✅ Asistencia normal (antes de 9:00 AM)`);
      return {
        tieneAsistencia: true,
        tipoAsistencia: 'asistencia',
        primeraHora: primeraEntrada.hora,
        registros: registrosFecha
      };
    } else {
      console.log(`   ⏰ Retardo (después de 9:00 AM): ${primeraEntrada.hora}`);
      return {
        tieneAsistencia: true,
        tipoAsistencia: 'retardo',
        primeraHora: primeraEntrada.hora,
        registros: registrosFecha
      };
    }
    
  } catch (error) {
    console.error(`❌ Error en verificarAsistenciaEmpleado para ${numero_empleado}:`, error);
    return {
      tieneAsistencia: false,
      tipoAsistencia: null,
      primeraHora: null,
      registros: []
    };
  }
}

// 🟢 CORREGIDO: Determinar si un día es futuro basado en la fecha actual
function esDiaFuturo(dateToCheck) {
  try {
    const hoy = new Date();
    // Normalizar ambas fechas a inicio del día para comparación
    const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaCheckNormalizada = new Date(
      dateToCheck.getFullYear(),
      dateToCheck.getMonth(),
      dateToCheck.getDate()
    );
    
    // Si la fecha a verificar es mayor que hoy, es futuro
    const esFuturo = fechaCheckNormalizada > hoyNormalizado;
    
    console.log(`📅 Verificando si es futuro:`, {
      fechaCheck: formatDate(dateToCheck),
      hoy: formatDate(hoy),
      fechaCheckISO: fechaCheckNormalizada.toISOString(),
      hoyISO: hoyNormalizado.toISOString(),
      esFuturo
    });
    
    return esFuturo;
    
  } catch (error) {
    console.error('Error en esDiaFuturo:', error);
    return false;
  }
}

function getWeekDates(startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const dates = [];

  const dayNames = {
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
  };

  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();

    if ([4, 5, 1, 2, 3].includes(day)) {
      const fechaSinHora = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate()
      );

      dates.push({
        date: fechaSinHora,
        dateStr: formatDate(fechaSinHora),
        dayName: dayNames[day],
        esFinDeSemana: [0, 6].includes(day),
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/* =========================
   GET - VERSIÓN DEFINITIVA CON LÓGICA COMPLETA
========================= */

export async function GET(req) {
  try {
    await conectarDB();

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    console.log('🌍 SOLICITANDO DATOS SEMANALES:');
    console.log('Rango:', start, 'al', end);
    console.log('Hoy:', formatDate(new Date()));

    // Obtener empleados activos
    const empleados = await Empleado.find({ activo: true }).sort({
      nombre_completo: 1,
    });

    // Obtener asistencias en el rango
    const asistencias = await Asistencia.find({
      fecha: { $gte: start, $lte: end },
    });

    console.log(`📊 Datos obtenidos: ${empleados.length} empleados, ${asistencias.length} asistencias`);

    // Obtener días de la semana
    const weekDates = getWeekDates(start, end);
    
    console.log('📅 DÍAS DE LA SEMANA EN EL RANGO:');
    weekDates.forEach((wd, idx) => {
      console.log(`  ${idx + 1}. ${wd.dayName} ${wd.dateStr} (fin semana: ${wd.esFinDeSemana})`);
    });

    // Procesar datos para cada empleado
    const data = [];
    
    for (const emp of empleados) {
      const dias = {};

      // Inicializar días de la semana
      for (const wd of weekDates) {
        // Verificar si es futuro basado en la fecha actual
        const esFuturo = esDiaFuturo(wd.date);
        const esInactivo = es5Enero2026(wd.date);
        const esFinDeSemana = wd.esFinDeSemana;
        
        // Valor inicial vacío - se llenará según la verificación
        dias[wd.dayName] = {
          valor: '', // 'X' para asistencia, 'R' para retardo, '' para falta
          fecha: wd.dateStr,
          esFuturo: esFuturo,
          esInactivo: esInactivo,
          esFinDeSemana: esFinDeSemana,
          primeraHora: null, // Hora del primer registro
          tipoRegistro: null // 'asistencia', 'retardo', o null
        };
      }

      // Para cada día, verificar la asistencia del empleado
      for (const [diaNombre, diaInfo] of Object.entries(dias)) {
        // Solo verificar si no es futuro, inactivo o fin de semana
        if (!diaInfo.esFuturo && !diaInfo.esInactivo && !diaInfo.esFinDeSemana) {
          const fechaDia = diaInfo.fecha;
          
          // Verificar asistencia del empleado en esta fecha
          const verificacion = await verificarAsistenciaEmpleado(emp.numero_empleado, fechaDia);
          
          if (verificacion.tieneAsistencia) {
            if (verificacion.tipoAsistencia === 'asistencia') {
              diaInfo.valor = 'X'; // Asistencia normal
              diaInfo.tipoRegistro = 'asistencia';
            } else if (verificacion.tipoAsistencia === 'retardo') {
              diaInfo.valor = 'R'; // Retardo
              diaInfo.tipoRegistro = 'retardo';
            }
            diaInfo.primeraHora = verificacion.primeraHora;
          } else {
            // Si no tiene asistencia y no es futuro/inactivo/fin de semana, es falta
            diaInfo.valor = ''; // Faltó
            diaInfo.tipoRegistro = 'falta';
          }
        } else {
          // Para días futuros, inactivos o fin de semana
          diaInfo.valor = '';
          diaInfo.tipoRegistro = null;
        }
      }

      // Calcular faltas reales (solo días laborales sin asistencia)
      let faltas = 0;
      let retardos = 0;
      
      for (const diaInfo of Object.values(dias)) {
        const esFaltaReal = (
          diaInfo.valor === '' &&
          !diaInfo.esFuturo &&
          !diaInfo.esInactivo &&
          !diaInfo.esFinDeSemana
        );
        
        if (esFaltaReal) {
          faltas++;
        }
        
        // Contar retardos
        if (diaInfo.valor === 'R') {
          retardos++;
        }
      }

      // Preparar datos para el frontend
      const fechas = {};
      const esFuturo = {};
      const esInactivo = {};
      const esFinDeSemana = {};
      const valores = {};
      const primerasHoras = {};
      const tiposRegistro = {};

      for (const [dia, info] of Object.entries(dias)) {
        valores[dia] = info.valor;
        fechas[dia] = info.fecha;
        esFuturo[dia] = info.esFuturo;
        esInactivo[dia] = info.esInactivo;
        esFinDeSemana[dia] = info.esFinDeSemana;
        primerasHoras[dia] = info.primeraHora;
        tiposRegistro[dia] = info.tipoRegistro;
      }

      data.push({
        nombre: emp.nombre_completo,
        area: emp.area,
        departamento: emp.departamento || '',
        numero_empleado: emp.numero_empleado,
        ...valores,
        faltas,
        retardos,
        fechas,
        esFuturo,
        esInactivo,
        esFinDeSemana,
        primerasHoras,
        tiposRegistro
      });
    }

    // Calcular estadísticas
    let totalFaltas = 0;
    let totalPresentes = 0;
    let totalRetardos = 0;
    let totalDiasLaborales = 0;
    
    for (const emp of data) {
      for (const dia of ['jueves', 'viernes', 'lunes', 'martes', 'miercoles']) {
        const esFuturo = emp.esFuturo?.[dia];
        const esInactivo = emp.esInactivo?.[dia];
        const esFinDeSemana = emp.esFinDeSemana?.[dia];
        
        if (!esFuturo && !esInactivo && !esFinDeSemana) {
          totalDiasLaborales++;
          
          if (emp[dia] === 'X') {
            totalPresentes++;
          } else if (emp[dia] === 'R') {
            totalRetardos++;
            totalPresentes++; // Los retardos cuentan como presentes
          }
        }
      }
      totalFaltas += emp.faltas;
    }
    
    const porcentajeAsistencia = totalDiasLaborales > 0 
      ? ((totalPresentes / totalDiasLaborales) * 100).toFixed(1)
      : 0;

    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`Total empleados: ${data.length}`);
    console.log(`Total asistencias en rango: ${asistencias.length}`);
    console.log(`Total días laborales: ${totalDiasLaborales}`);
    console.log(`Total días presentes: ${totalPresentes}`);
    console.log(`Total retardos: ${totalRetardos}`);
    console.log(`Total faltas reales: ${totalFaltas}`);
    console.log(`Porcentaje asistencia: ${porcentajeAsistencia}%`);
    
    // Mostrar ejemplo de cómo se procesó un empleado
    if (data.length > 0) {
      const primerEmpleado = data[0];
      console.log(`\n🔍 EJEMPLO: ${primerEmpleado.nombre} (${primerEmpleado.numero_empleado})`);
      console.log(`  Jueves ${primerEmpleado.fechas?.jueves}: ${primerEmpleado.jueves} (${primerEmpleado.tiposRegistro?.jueves || 'falta'})`);
      console.log(`  Hora primera entrada: ${primerEmpleado.primerasHoras?.jueves || 'N/A'}`);
    }

    return NextResponse.json(data);
    
  } catch (e) {
    console.error('❌ Error en /api/asistencias-semana:', e);
    console.error('Stack trace:', e.stack);
    return NextResponse.json(
      { error: 'Error del servidor', detalles: e.message },
      { status: 500 }
    );
  }
}
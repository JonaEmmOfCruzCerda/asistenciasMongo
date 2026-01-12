import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';
import Empleado from '@/app/models/Empleado';

/* =========================
   UTILIDADES FECHA - CORREGIDAS PARA JALISCO (UTC-6)
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
    date.getMonth() === 0 && // Enero es 0
    date.getFullYear() === 2026
  );
}

// 🟢 NUEVO: Obtener fecha actual en Jalisco (UTC-6) SIN horas
// 🟢 CORREGIDA: Obtener fecha actual en Jalisco (UTC-6) 
function getTodayJalisco() {
  const ahora = new Date();
  
  // Obtener componentes UTC actuales
  const utcHours = ahora.getUTCHours();
  const utcDate = ahora.getUTCDate();
  const utcMonth = ahora.getUTCMonth();
  const utcYear = ahora.getUTCFullYear();
  
  // Aplicar offset de Jalisco (-6 horas)
  let jaliscoHours = utcHours - 6;
  let jaliscoDate = utcDate;
  let jaliscoMonth = utcMonth;
  let jaliscoYear = utcYear;
  
  // Ajustar si las horas son negativas (día anterior)
  if (jaliscoHours < 0) {
    jaliscoHours += 24;
    jaliscoDate -= 1;
    
    // Ajustar si el día es 0 (mes anterior)
    if (jaliscoDate === 0) {
      const lastDayOfPrevMonth = new Date(utcYear, utcMonth, 0).getDate();
      jaliscoDate = lastDayOfPrevMonth;
      jaliscoMonth -= 1;
      
      // Ajustar si el mes es -1 (año anterior)
      if (jaliscoMonth === -1) {
        jaliscoMonth = 11;
        jaliscoYear -= 1;
      }
    }
  }
  
  // Crear fecha sin horas
  return new Date(jaliscoYear, jaliscoMonth, jaliscoDate);
}

// OPCIÓN MÁS SIMPLE (si la anterior es compleja):
function getTodayJaliscoSimple() {
  const ahora = new Date();
  
  // Convertir a string en formato Jalisco
  const options = {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(ahora);
    
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    return new Date(`${year}-${month}-${day}T00:00:00`);
  } catch (error) {
    console.warn('⚠️ Error usando Intl, usando cálculo manual');
    
    // Fallback: cálculo manual con offset fijo
    const offsetJalisco = -6;
    const jaliscoTime = new Date(ahora.getTime() + (offsetJalisco * 60 * 60 * 1000));
    
    // Usar componentes UTC del tiempo ajustado
    return new Date(
      Date.UTC(
        jaliscoTime.getUTCFullYear(),
        jaliscoTime.getUTCMonth(),
        jaliscoTime.getUTCDate()
      )
    );
  }
}

// 🟢 NUEVO: Comparar si una fecha es futura EN JALISCO
function isFutureDate(dateToCheck) {
  const hoyJalisco = getTodayJalisco();
  
  // Asegurarse de que dateToCheck esté en la misma zona para comparar
  const checkDate = new Date(
    Date.UTC(
      dateToCheck.getFullYear(),
      dateToCheck.getMonth(),
      dateToCheck.getDate()
    )
  );
  
  const esFuturo = checkDate > hoyJalisco;
  
  // Debug logging
  console.log('📅 COMPARANDO FECHAS:', {
    hoyJalisco: formatDate(hoyJalisco),
    fechaAComparar: formatDate(dateToCheck),
    checkDateUTC: checkDate.toISOString(),
    hoyJaliscoUTC: hoyJalisco.toISOString(),
    esFuturo
  });
  
  return esFuturo;
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

    if ([4, 5, 1, 2, 3].includes(day)) { // Lunes (1) a Viernes (5)
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
   GET - CORREGIDO PARA JALISCO
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

    // 🟢 CAMBIO: Usar fecha de Jalisco, no UTC
    const hoy = getTodayJalisco();
    const hoyFormateado = formatDate(hoy);
    
    // Información de debug mejorada
    console.log('🌍 DEBUG - INFORMACIÓN DE FECHAS Y ZONA HORARIA:');
    console.log('Hora servidor (UTC):', new Date().toISOString());
    console.log('Hoy en Jalisco (objeto):', hoy);
    console.log('Hoy en Jalisco (formateado):', hoyFormateado);
    console.log('Rango solicitado:', start, 'al', end);
    console.log('Zona horaria servidor:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Obtener empleados activos ordenados por nombre
    const empleados = await Empleado.find({ activo: true }).sort({
      nombre_completo: 1,
    });

    // Obtener asistencias del rango de fechas
    const asistencias = await Asistencia.find({
      fecha: { $gte: start, $lte: end },
    });

    // Obtener días de la semana (jueves a miércoles)
    const weekDates = getWeekDates(start, end);
    
    console.log('📅 DÍAS DE LA SEMANA ENCONTRADOS:');
    weekDates.forEach((wd, index) => {
      const esFuturo = isFutureDate(wd.date);
      const esInactivo = es5Enero2026(wd.date);
      const fechaComparacion = formatDate(wd.date);
      console.log(`  ${index + 1}. ${wd.dayName} ${fechaComparacion}:`, {
        fecha: wd.date.toISOString(),
        esFuturo,
        esInactivo,
        esFinDeSemana: wd.esFinDeSemana
      });
    });

    // Procesar datos para cada empleado
    const data = empleados.map((emp) => {
      const dias = {};

      // Inicializar todos los días de la semana (jueves a miércoles)
      weekDates.forEach((wd) => {
        const fechaDia = wd.date;
        const esFuturo = isFutureDate(fechaDia);
        const esInactivo = es5Enero2026(fechaDia);
        const esFinDeSemana = wd.esFinDeSemana;
        
        dias[wd.dayName] = {
          valor: '', // 'X' si asistió, '' si no
          fecha: wd.dateStr,
          esFuturo: esFuturo,
          esInactivo: esInactivo,
          esFinDeSemana: esFinDeSemana,
        };
      });

      // Marcar días con asistencia
      asistencias
        .filter((a) => a.numero_empleado === emp.numero_empleado)
        .forEach((a) => {
          const fechaAsistencia = parseDate(a.fecha);
          Object.values(dias).forEach((diaInfo) => {
            const fechaDia = parseDate(diaInfo.fecha);
            // Comparar fechas sin horas
            if (
              fechaDia.getDate() === fechaAsistencia.getDate() &&
              fechaDia.getMonth() === fechaAsistencia.getMonth() &&
              fechaDia.getFullYear() === fechaAsistencia.getFullYear()
            ) {
              diaInfo.valor = 'X';
            }
          });
        });

      // 🔥 CALCULAR FALTAS REALES (NO incluye días futuros, 5/01/2026, ni fines de semana)
      let faltas = 0;
      let detallesFaltas = [];
      
      Object.values(dias).forEach((diaInfo) => {
        const esFaltaReal = (
          diaInfo.valor === '' && // No asistió
          !diaInfo.esFuturo &&    // No es día futuro
          !diaInfo.esInactivo &&  // No es 5/01/2026
          !diaInfo.esFinDeSemana  // No es sábado o domingo
        );
        
        if (esFaltaReal) {
          faltas++;
          detallesFaltas.push(diaInfo.fecha);
        }
      });

      // Preparar datos para el frontend
      const fechas = {};
      const esFuturo = {};
      const esInactivo = {};
      const esFinDeSemana = {};
      const valores = {};

      Object.entries(dias).forEach(([dia, info]) => {
        valores[dia] = info.valor;
        fechas[dia] = info.fecha;
        esFuturo[dia] = info.esFuturo;
        esInactivo[dia] = info.esInactivo;
        esFinDeSemana[dia] = info.esFinDeSemana;
      });

      // Debug para el primer empleado
      if (emp.numero_empleado === empleados[0]?.numero_empleado) {
        console.log('👤 DEBUG Primer empleado:', {
          nombre: emp.nombre_completo,
          esFuturo,
          fechas
        });
      }

      return {
        nombre: emp.nombre_completo,
        area: emp.area,
        departamento: emp.departamento || '',
        ...valores, // jueves, viernes, lunes, etc. con 'X' o ''
        faltas,     // Faltas reales ya calculadas
        fechas,
        esFuturo,
        esInactivo,
        esFinDeSemana,
      };
    });

    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`Total empleados procesados: ${data.length}`);
    console.log(`Total asistencias en rango: ${asistencias.length}`);
    console.log(`Rango de fechas: ${start} al ${end}`);
    console.log(`Fecha actual en Jalisco: ${hoyFormateado}`);
    console.log(`Hora servidor (UTC): ${new Date().toISOString()}`);

    // Calcular estadísticas generales
    const totalFaltas = data.reduce((sum, emp) => sum + emp.faltas, 0);
    console.log(`Total faltas reales (sin futuros ni 5/01): ${totalFaltas}`);

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
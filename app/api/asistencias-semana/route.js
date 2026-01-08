import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';
import Empleado from '@/app/models/Empleado';

/* =========================
   UTILIDADES FECHA - CORREGIDAS
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

// Función para obtener fecha actual SIN horas
function getTodayWithoutTime() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Función para comparar si una fecha es futura
function isFutureDate(dateToCheck) {
  const today = getTodayWithoutTime();
  const checkDate = new Date(
    dateToCheck.getFullYear(),
    dateToCheck.getMonth(),
    dateToCheck.getDate()
  );
  return checkDate > today;
}

function getWeekDates(startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const dates = [];

  const dayNames = {
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
  };

  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) { // Lunes (1) a Viernes (5)
      const fechaSinHora = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate()
      );

      dates.push({
        date: fechaSinHora,
        dateStr: formatDate(fechaSinHora),
        dayName: dayNames[day],
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/* =========================
   GET - CORREGIDO
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

    // Fecha actual SIN hora para comparación correcta
    const hoy = getTodayWithoutTime();
    const hoyFormateado = formatDate(hoy);
    
    console.log('📅 DEBUG - INFORMACIÓN DE FECHAS:');
    console.log('Hoy (objeto):', hoy);
    console.log('Hoy (formateado):', hoyFormateado);
    console.log('Rango solicitado:', start, 'al', end);

    // Obtener empleados activos ordenados por nombre
    const empleados = await Empleado.find({ activo: true }).sort({
      nombre_completo: 1,
    });

    // Obtener asistencias del rango de fechas
    const asistencias = await Asistencia.find({
      fecha: { $gte: start, $lte: end },
    });

    // Obtener días de la semana (Lunes a Viernes)
    const weekDates = getWeekDates(start, end);
    
    console.log('📅 DÍAS DE LA SEMANA ENCONTRADOS:');
    weekDates.forEach((wd, index) => {
      const esFuturo = isFutureDate(wd.date);
      const esInactivo = es5Enero2026(wd.date);
      console.log(`  ${index + 1}. ${wd.dayName} ${wd.dateStr}: futuro=${esFuturo}, inactivo=${esInactivo}`);
    });

    // Procesar datos para cada empleado
    const data = empleados.map((emp) => {
      const dias = {};

      // Inicializar todos los días de la semana
      weekDates.forEach((wd) => {
        const fechaDia = wd.date;
        const esFuturo = isFutureDate(fechaDia);
        const esInactivo = es5Enero2026(fechaDia);
        
        dias[wd.dayName] = {
          valor: '', // 'X' si asistió, '' si no
          fecha: wd.dateStr,
          esFuturo: esFuturo,
          esInactivo: esInactivo,
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

      // 🔥 CALCULAR FALTAS REALES (NO incluye días futuros ni 5/01/2026)
      let faltas = 0;
      let detallesFaltas = [];
      
      Object.values(dias).forEach((diaInfo) => {
        const esFaltaReal = (
          diaInfo.valor === '' && // No asistió
          !diaInfo.esFuturo &&    // No es día futuro
          !diaInfo.esInactivo     // No es 5/01/2026
        );
        
        if (esFaltaReal) {
          faltas++;
          detallesFaltas.push(diaInfo.fecha);
        }
      });

      // DEBUG para cada empleado (solo primeros 2 para no saturar)
      if (emp.numero_empleado === empleados[0]?.numero_empleado || emp.numero_empleado === empleados[1]?.numero_empleado) {
        console.log(`\n🔍 DEBUG - Empleado: ${emp.nombre_completo}`);
        console.log(`   Número: ${emp.numero_empleado}`);
        Object.entries(dias).forEach(([dia, info]) => {
          console.log(`   ${dia}: fecha=${info.fecha}, asistió=${info.valor === 'X' ? 'Sí' : 'No'}, futuro=${info.esFuturo}, inactivo=${info.esInactivo}`);
        });
        console.log(`   Faltas calculadas: ${faltas}`);
        if (detallesFaltas.length > 0) {
          console.log(`   Días de falta: ${detallesFaltas.join(', ')}`);
        }
      }

      // Preparar datos para el frontend
      const fechas = {};
      const esFuturo = {};
      const esInactivo = {};
      const valores = {};

      Object.entries(dias).forEach(([dia, info]) => {
        valores[dia] = info.valor;
        fechas[dia] = info.fecha;
        esFuturo[dia] = info.esFuturo;
        esInactivo[dia] = info.esInactivo;
      });

      return {
        nombre: emp.nombre_completo,
        area: emp.area,
        departamento: emp.departamento || '',
        ...valores, // lunes, martes, etc. con 'X' o ''
        faltas,     // Faltas reales ya calculadas
        fechas,
        esFuturo,
        esInactivo,
      };
    });

    console.log(`\n📊 RESUMEN:`);
    console.log(`Total empleados procesados: ${data.length}`);
    console.log(`Total asistencias en rango: ${asistencias.length}`);
    console.log(`Rango de fechas: ${start} al ${end}`);
    console.log(`Fecha actual para comparación: ${hoyFormateado}`);

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

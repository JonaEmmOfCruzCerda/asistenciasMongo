// app/api/semanas-disponibles/route.js - VERSIÓN MEJORADA
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

// Función auxiliar para convertir fecha DD/MM/YYYY a objeto Date
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

// Calcular semanas basadas en fechas de asistencia
function calcularSemanasDesdeFechas(fechasUnicas) {
  const semanas = [];
  
  if (fechasUnicas.length === 0) {
    return generarSemanasPorDefecto();
  }
  
  // Convertir fechas a objetos Date y ordenar
  const fechasObjs = fechasUnicas.map(f => parseDate(f)).sort((a, b) => a - b);
  
  // Fecha de inicio: primer jueves (1 de enero 2026)
  const fechaBase = new Date(2026, 0, 1); // 1 enero 2026 (jueves)
  
  // Encontrar primera fecha con asistencia
  const primeraFecha = fechasObjs[0];
  
  // Calcular en qué semana cae la primera fecha
  const diffTiempo = Math.abs(primeraFecha - fechaBase);
  const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
  const primeraSemana = Math.floor(diffDias / 7) + 1;
  
  // Encontrar última fecha con asistencia
  const ultimaFecha = fechasObjs[fechasObjs.length - 1];
  
  // Calcular en qué semana cae la última fecha
  const diffTiempoUltima = Math.abs(ultimaFecha - fechaBase);
  const diffDiasUltima = Math.ceil(diffTiempoUltima / (1000 * 60 * 60 * 24));
  const ultimaSemana = Math.floor(diffDiasUltima / 7) + 1;
  
  // Generar semanas desde la primera hasta la última
  for (let semanaNum = primeraSemana; semanaNum <= ultimaSemana; semanaNum++) {
    const inicioSemana = new Date(fechaBase);
    inicioSemana.setDate(fechaBase.getDate() + ((semanaNum - 1) * 7));
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    
    const inicioStr = formatDate(inicioSemana);
    const finStr = formatDate(finSemana);
    
    // Contar registros en esta semana
    const registrosEnSemana = fechasUnicas.filter(fechaStr => {
      const fecha = parseDate(fechaStr);
      return fecha >= inicioSemana && fecha <= finSemana;
    }).length;
    
    semanas.push({
      numero: semanaNum,
      inicio: inicioStr,
      fin: finStr,
      registros: registrosEnSemana,
      // Información adicional
      tieneRegistros: registrosEnSemana > 0,
      año: inicioSemana.getFullYear(),
      mes: inicioSemana.getMonth() + 1
    });
  }
  
  // También incluir la semana actual si no está en la lista
  const hoy = new Date();
  const diffTiempoHoy = Math.abs(hoy - fechaBase);
  const diffDiasHoy = Math.ceil(diffTiempoHoy / (1000 * 60 * 60 * 24));
  const semanaActual = Math.floor(diffDiasHoy / 7) + 1;
  
  if (!semanas.some(s => s.numero === semanaActual)) {
    const inicioActual = new Date(fechaBase);
    inicioActual.setDate(fechaBase.getDate() + ((semanaActual - 1) * 7));
    
    const finActual = new Date(inicioActual);
    finActual.setDate(inicioActual.getDate() + 6);
    
    semanas.push({
      numero: semanaActual,
      inicio: formatDate(inicioActual),
      fin: formatDate(finActual),
      registros: 0,
      tieneRegistros: false,
      esSemanaActual: true
    });
    
    // Ordenar por número de semana
    semanas.sort((a, b) => a.numero - b.numero);
  }
  
  return semanas;
}

export async function GET() {
  try {
    await conectarDB();
    
    // Obtener todas las fechas únicas de asistencia
    const asistencias = await Asistencia.find({})
      .select('fecha')
      .lean();
    
    // Extraer fechas únicas
    const fechasUnicas = [...new Set(asistencias.map(a => a.fecha))]
      .filter(fecha => fecha && fecha.includes('/')) // Validar formato
      .sort();
    
    console.log(`📅 Fechas únicas encontradas: ${fechasUnicas.length}`);
    if (fechasUnicas.length > 0) {
      console.log(`Primera fecha: ${fechasUnicas[0]}`);
      console.log(`Última fecha: ${fechasUnicas[fechasUnicas.length - 1]}`);
    }
    
    // Calcular semanas basadas en fechas de asistencia
    const semanas = calcularSemanasDesdeFechas(fechasUnicas);
    
    console.log(`📊 Semanas generadas: ${semanas.length}`);
    
    return NextResponse.json(semanas);
    
  } catch (error) {
    console.error('Error en semanas-disponibles:', error);
    // En caso de error, devolver semanas por defecto
    return NextResponse.json(generarSemanasPorDefecto());
  }
}

// Función para generar semanas por defecto
function generarSemanasPorDefecto() {
  const semanas = [];
  const fechaBase = new Date(2026, 0, 1);
  const totalSemanas = 8;
  
  for (let semanaNum = 1; semanaNum <= totalSemanas; semanaNum++) {
    const inicioSemana = new Date(fechaBase);
    inicioSemana.setDate(fechaBase.getDate() + ((semanaNum - 1) * 7));
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    
    const inicioStr = formatDate(inicioSemana);
    const finStr = formatDate(finSemana);
    
    semanas.push({
      numero: semanaNum,
      inicio: inicioStr,
      fin: finStr,
      registros: 0,
      tieneRegistros: false,
      año: inicioSemana.getFullYear(),
      mes: inicioSemana.getMonth() + 1,
      esPorDefecto: true
    });
  }
  
  return semanas;
}
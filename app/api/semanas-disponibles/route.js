// app/api/semanas-disponibles/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

export async function GET() {
  let client;
  
  try {
    client = await conectarDB.connect(URI_MONGODB);
    const db = client.db(DB_NAME);
    
    // Obtener todas las fechas únicas de asistencia
    const asistencias = await db.collection('asistencias')
      .find({})
      .project({ fecha: 1, _id: 0 })
      .toArray();
    
    // Extraer fechas únicas
    const fechasUnicas = [...new Set(asistencias.map(a => a.fecha))]
      .filter(Boolean)
      .sort();
    
    // Si no hay fechas, devolver semanas por defecto
    if (fechasUnicas.length === 0) {
      return NextResponse.json(generarSemanasPorDefecto());
    }
    
    // Convertir fechas string a objetos Date
    const fechas = fechasUnicas.map(f => {
      const [dia, mes, año] = f.split('/').map(Number);
      return new Date(año, mes - 1, dia);
    });
    
    const fechaMinima = new Date(Math.min(...fechas));
    const fechaMaxima = new Date(Math.max(...fechas));
    
    // Calcular semanas
    const semanas = [];
    const fechaInicio = new Date(2026, 0, 5); // 5 de enero 2026 (Lunes)
    
    // Calcular número de semanas entre fecha inicio y fecha máxima
    const diffTime = Math.abs(fechaMaxima - fechaInicio);
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    // Generar semanas desde la 1 hasta la última con datos
    for (let semanaNum = 1; semanaNum <= diffWeeks; semanaNum++) {
      const inicioSemana = new Date(fechaInicio);
      inicioSemana.setDate(fechaInicio.getDate() + ((semanaNum - 1) * 7));
      
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 4); // Lunes a Viernes
      
      // Formatear fechas
      const formatDate = (date) => {
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        const año = date.getFullYear();
        return `${dia}/${mes}/${año}`;
      };
      
      const inicioStr = formatDate(inicioSemana);
      const finStr = formatDate(finSemana);
      
      // Contar registros en esta semana
      const registrosEnSemana = asistencias.filter(a => {
        const fechaRegistro = a.fecha;
        return fechaRegistro >= inicioStr && fechaRegistro <= finStr;
      }).length;
      
      // Solo incluir semanas con registros
      if (registrosEnSemana > 0) {
        semanas.push({
          numero: semanaNum,
          inicio: inicioStr,
          fin: finStr,
          registros: registrosEnSemana
        });
      }
    }
    
    // Si no hay semanas con datos, devolver semanas por defecto
    if (semanas.length === 0) {
      return NextResponse.json(generarSemanasPorDefecto());
    }
    
    return NextResponse.json(semanas);
    
  } catch (error) {
    console.error('Error en API semanas-disponibles:', error);
    // En caso de error, devolver semanas por defecto
    return NextResponse.json(generarSemanasPorDefecto());
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Función para generar semanas por defecto (si no hay datos)
function generarSemanasPorDefecto() {
  const semanas = [];
  const fechaInicio = new Date(2026, 0, 5); // 5 de enero 2026
  
  // Generar 4 semanas por defecto
  for (let semanaNum = 1; semanaNum <= 4; semanaNum++) {
    const inicioSemana = new Date(fechaInicio);
    inicioSemana.setDate(fechaInicio.getDate() + ((semanaNum - 1) * 7));
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 4);
    
    const formatDate = (date) => {
      const dia = date.getDate().toString().padStart(2, '0');
      const mes = (date.getMonth() + 1).toString().padStart(2, '0');
      const año = date.getFullYear();
      return `${dia}/${mes}/${año}`;
    };
    
    semanas.push({
      numero: semanaNum,
      inicio: formatDate(inicioSemana),
      fin: formatDate(finSemana),
      registros: 0
    });
  }
  
  return semanas;
}
import Festivo from '@/models/Festivo';
import connectToDatabase from '@/lib/mongodb';

/**
 * Verifica si una fecha es festiva o no laboral
 * @param {string} fecha - Fecha en formato DD/MM/YYYY
 * @param {string} area - Área/departamento del empleado (opcional)
 * @returns {Promise<Object|null>} Objeto con información del festivo o null
 */
export async function esFechaFestiva(fecha, area = null) {
  try {
    await connectToDatabase();
    
    const festivo = await Festivo.findOne({ fecha });
    
    if (!festivo) {
      return null;
    }
    
    // Si el festivo aplica solo para ciertas áreas
    if (festivo.aplica_para && festivo.aplica_para.length > 0) {
      if (area && !festivo.aplica_para.includes(area)) {
        return null; // No aplica para esta área
      }
    }
    
    return festivo;
  } catch (error) {
    console.error('Error verificando festivo:', error);
    return null;
  }
}

/**
 * Obtiene todos los festivos de un año específico
 * @param {number} año - Año a consultar
 * @returns {Promise<Array>} Lista de festivos
 */
export async function obtenerFestivosPorAño(año) {
  try {
    await connectToDatabase();
    
    const festivos = await Festivo.find({
      fecha: { $regex: `\\d{2}/\\d{2}/${año}$` }
    }).sort({ fecha: 1 });
    
    return festivos;
  } catch (error) {
    console.error('Error obteniendo festivos por año:', error);
    return [];
  }
}
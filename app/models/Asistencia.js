import mongoose from 'mongoose';

const asistenciaSchema = new mongoose.Schema({
  numero_empleado: {
    type: String,
    required: [true, 'El número de empleado es requerido'],
    trim: true
  },
  nombre_empleado: {
    type: String,
    required: [true, 'El nombre del empleado es requerido'],
    trim: true
  },
  area_empleado: {
    type: String,
    required: [true, 'El área del empleado es requerido'],
    trim: true
  },
  fecha: {
    type: String,
    required: true
  },
  hora: {
    type: String,
    required: true
  },
  marca_tiempo: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  tipo_registro: {
    type: String,
    enum: ['entrada', 'salida'],
    default: 'entrada'
  }
}, {
  timestamps: true
});

// Índices
asistenciaSchema.index({ numero_empleado: 1, marca_tiempo: -1 });
asistenciaSchema.index({ fecha: 1, hora: 1 });
asistenciaSchema.index({ numero_empleado: 1, fecha: 1, tipo_registro: 1 });

// Método estático para verificar registros de hoy (NUEVA VERSIÓN)
asistenciaSchema.statics.verificarRegistrosHoy = async function(numeroEmpleado) {
  try {
    const ahora = new Date();
    
    // Constante para offset de Jalisco (UTC-6)
    const JALISCO_OFFSET = -6;
    
    // Obtener fecha de hoy en formato DD/MM/YYYY (Jalisco)
    const fechaJalisco = new Date(ahora.getTime() + (JALISCO_OFFSET * 60 * 60 * 1000));
    
    const dia = fechaJalisco.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaJalisco.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fechaJalisco.getUTCFullYear();
    const fechaHoy = `${dia}/${mes}/${año}`;
    
    console.log('📅 Verificando registros de hoy:', { fechaHoy, numeroEmpleado });
    
    const registrosHoy = await this.find({
      numero_empleado: numeroEmpleado,
      fecha: fechaHoy
    }).sort({ marca_tiempo: -1 });
    
    // Verificar si es después de las 4:00 PM
    const hora = fechaJalisco.getUTCHours();
    const minutos = fechaJalisco.getUTCMinutes();
    const esDespuesDe4PM = hora > 16 || (hora === 16 && minutos >= 0);
    
    return {
      fecha: fechaHoy,
      registros: registrosHoy,
      total: registrosHoy.length,
      tieneEntrada: registrosHoy.some(r => r.tipo_registro === 'entrada'),
      tieneSalida: registrosHoy.some(r => r.tipo_registro === 'salida'),
      ultimoRegistro: registrosHoy.length > 0 ? registrosHoy[0] : null,
      esDespuesDe4PM: esDespuesDe4PM,
      puedeRegistrar: esDespuesDe4PM || !registrosHoy.some(r => r.tipo_registro === 'entrada')
    };
  } catch (error) {
    console.error('❌ Error en verificarRegistrosHoy:', error);
    throw error;
  }
};

// Método para obtener estadísticas del día
asistenciaSchema.statics.obtenerEstadisticasDia = async function(fecha) {
  try {
    console.log('📊 Obteniendo estadísticas para fecha:', fecha);
    
    const registrosHoy = await this.find({ fecha: fecha });
    
    console.log(`📝 Encontrados ${registrosHoy.length} registros para ${fecha}`);
    
    // Empleados únicos del día
    const empleadosUnicos = [...new Set(registrosHoy.map(r => r.numero_empleado))];
    
    // Registros por área
    const registrosPorArea = {};
    registrosHoy.forEach(registro => {
      const area = registro.area_empleado || 'Sin área';
      registrosPorArea[area] = (registrosPorArea[area] || 0) + 1;
    });
    
    return {
      empleados_unicos: empleadosUnicos.length,
      registros_por_area: registrosPorArea
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEstadisticasDia:', error);
    return {
      empleados_unicos: 0,
      registros_por_area: {}
    };
  }
};

// ELIMINA o COMENTA esta función antigua de 20 horas:
// asistenciaSchema.statics.verificarAsistenciaReciente = async function(numeroEmpleado) {
//   // Esta función ya no se usa - sistema cambió a lógica de 4 PM
//   throw new Error('Esta función está obsoleta. Usar verificarRegistrosHoy en su lugar.');
// };

export default mongoose.models.Asistencia || mongoose.model('Asistencia', asistenciaSchema);
import mongoose from 'mongoose';

// Esquema de Asistencia
const EsquemaAsistencia = new mongoose.Schema({
  numero_empleado: {
    type: String,
    required: [true, 'El número de empleado es requerido'],
    index: true,
    ref: 'Empleado'
  },
  
  nombre_empleado: {
    type: String,
    required: [true, 'El nombre del empleado es requerido']
  },
  
  area_empleado: {
    type: String,
    required: [true, 'El área del empleado es requerida']
  },
  
  tipo_registro: {
    type: String,
    enum: ['entrada', 'salida'],
    default: 'entrada'
  },
  
  fecha: {
    type: String, // Formato: "DD/MM/YYYY"
    required: [true, 'La fecha es requerida'],
    index: true
  },
  
  hora: {
    type: String, // Formato: "HH:MM:SS"
    required: [true, 'La hora es requerida']
  },
  
  marca_tiempo: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  notas: {
    type: String,
    default: ''
  },
  
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { 
    createdAt: 'fecha_creacion' 
  }
});

// Índices compuestos para búsquedas eficientes
EsquemaAsistencia.index({ numero_empleado: 1, marca_tiempo: -1 });
EsquemaAsistencia.index({ fecha: 1, tipo_registro: 1 });
EsquemaAsistencia.index({ numero_empleado: 1, fecha: 1 });
EsquemaAsistencia.index({ area_empleado: 1, fecha: 1 });

/**
 * Método para verificar asistencia reciente
 */
EsquemaAsistencia.statics.verificarAsistenciaReciente = async function(numeroEmpleado, horasLimite = 20) {
  try {
    const fechaLimite = new Date(Date.now() - (horasLimite * 60 * 60 * 1000));
    
    const ultimaAsistencia = await this.findOne({
      numero_empleado: numeroEmpleado,
      marca_tiempo: { $gte: fechaLimite }
    }).sort({ marca_tiempo: -1 });

    const tieneAsistenciaReciente = !!ultimaAsistencia;
    const proximoRegistroPermitido = ultimaAsistencia 
      ? new Date(ultimaAsistencia.marca_tiempo.getTime() + (horasLimite * 60 * 60 * 1000))
      : null;

    return {
      tieneAsistenciaReciente,
      ultimaAsistencia: ultimaAsistencia || null,
      proximoRegistroPermitido
    };
  } catch (error) {
    console.error('Error verificando asistencia reciente:', error);
    throw error;
  }
};

/**
 * Método para obtener estadísticas diarias
 */
EsquemaAsistencia.statics.obtenerEstadisticasDia = async function(fecha) {
  try {
    const registros = await this.find({ fecha });
    
    const empleadosRegistrados = [...new Set(registros.map(r => r.numero_empleado))];
    const registrosPorArea = {};
    
    registros.forEach(registro => {
      if (!registrosPorArea[registro.area_empleado]) {
        registrosPorArea[registro.area_empleado] = 0;
      }
      registrosPorArea[registro.area_empleado]++;
    });

    return {
      total_registros: registros.length,
      empleados_unicos: empleadosRegistrados.length,
      registros_por_area: registrosPorArea,
      primer_registro: registros.length > 0 
        ? registros.reduce((min, r) => r.marca_tiempo < min.marca_tiempo ? r : min)
        : null,
      ultimo_registro: registros.length > 0 
        ? registros.reduce((max, r) => r.marca_tiempo > max.marca_tiempo ? r : max)
        : null
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
};

// Verificar si el modelo ya existe
const Asistencia = mongoose.models.Asistencia || mongoose.model('Asistencia', EsquemaAsistencia);

export default Asistencia;
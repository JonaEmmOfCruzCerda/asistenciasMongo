// app/models/Asistencia.js
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

// Método estático para verificar asistencia reciente (CORREGIDO)
asistenciaSchema.statics.verificarAsistenciaReciente = async function(numeroEmpleado) {
  try {
    console.log('🔍 Verificando asistencia reciente para:', numeroEmpleado);
    
    const ultimaAsistencia = await this.findOne({ 
      numero_empleado: numeroEmpleado 
    }).sort({ marca_tiempo: -1 });
    
    console.log('📊 Última asistencia encontrada:', ultimaAsistencia);
    
    if (!ultimaAsistencia) {
      return {
        tieneAsistenciaReciente: false,
        ultimaAsistencia: null,
        proximoRegistroPermitido: null
      };
    }
    
    const ahora = new Date();
    const horasTranscurridas = (ahora - ultimaAsistencia.marca_tiempo) / (1000 * 60 * 60);
    const tieneAsistenciaReciente = horasTranscurridas < 20;
    
    return {
      tieneAsistenciaReciente,
      ultimaAsistencia,
      proximoRegistroPermitido: tieneAsistenciaReciente 
        ? new Date(ultimaAsistencia.marca_tiempo.getTime() + (20 * 60 * 60 * 1000))
        : null
    };
  } catch (error) {
    console.error('❌ Error en verificarAsistenciaReciente:', error);
    throw error;
  }
};

export default mongoose.models.Asistencia || mongoose.model('Asistencia', asistenciaSchema);
// models/Observacion.js
import mongoose from 'mongoose';

const observacionSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    default: ' ', // Un espacio en blanco en lugar de string vacío
    validate: {
      validator: function(v) {
        // Permitir cualquier valor, incluso vacío
        return true;
      },
      message: 'El texto es válido'
    }
  },
  tipoFalta: {
    type: String,
    enum: ['Vacaciones', 'Falta', 'Incapacidad', 'Prestamo'],
    default: ''
  },
  fecha: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  adminId: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  // Desactivar validación estricta
  strict: 'throw'
});

// Eliminar cualquier validación required del campo text
observacionSchema.path('text').required(false);

observacionSchema.index({ employeeId: 1, date: -1 });

export default mongoose.models.Observacion || mongoose.model('Observacion', observacionSchema);


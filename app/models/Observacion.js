import mongoose from 'mongoose';

const observacionSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  text: {
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
  timestamps: true
});

observacionSchema.index({ employeeId: 1, date: -1 });

export default mongoose.models.Observacion || mongoose.model('Observacion', observacionSchema);
// app/models/Empleado.js
import mongoose from 'mongoose';

// Esquema de Empleado
// En /app/models/Empleado.js, agregar el campo departamento:
const EsquemaEmpleado = new mongoose.Schema({
  numero_empleado: {
    type: String,
    required: [true, 'El número de empleado es requerido'],
    unique: true,
    trim: true,
    index: true
  },
  
  nombre_completo: {
    type: String,
    required: [true, 'El nombre completo es requerido'],
    trim: true
  },
  
  area: {
    type: String,
    required: [true, 'El área/departamento es requerido'],
    trim: true
  },
  
  departamento: {
    type: String,
    required: [true, 'El departamento es requerido'],
    trim: true
  },
  
  activo: {
    type: Boolean,
    default: true,
    index: true
  },
  
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  
  fecha_actualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { 
    createdAt: 'fecha_creacion', 
    updatedAt: 'fecha_actualizacion' 
  }
});

// Índices para búsquedas eficientes
EsquemaEmpleado.index({ numero_empleado: 1, activo: 1 });
EsquemaEmpleado.index({ area: 1, activo: 1 });
EsquemaEmpleado.index({ nombre_completo: 1 });

// Método para obtener el siguiente número de empleado (empezando desde 0)
EsquemaEmpleado.statics.obtenerSiguienteNumero = async function() {
  try {
    const ultimoEmpleado = await this.findOne().sort({ numero_empleado: -1 });
    
    if (!ultimoEmpleado || !ultimoEmpleado.numero_empleado) {
      return '1'; // Primer empleado
    }
    
    const ultimoNumero = parseInt(ultimoEmpleado.numero_empleado);
    if (isNaN(ultimoNumero)) {
      // Si el último no es número, buscar el máximo numérico
      const empleadosConNumeros = await this.find({
        numero_empleado: { $regex: /^\d+$/ }
      });
      
      if (empleadosConNumeros.length === 0) {
        return '0';
      }
      
      const maxNumero = Math.max(...empleadosConNumeros.map(emp => parseInt(emp.numero_empleado)));
      return (maxNumero + 1).toString();
    }
    
    return (ultimoNumero + 1).toString();
  } catch (error) {
    console.error('Error obteniendo siguiente número:', error);
    return '0';
  }
};

// Verificar si el modelo ya existe antes de crearlo
const Empleado = mongoose.models.Empleado || mongoose.model('Empleado', EsquemaEmpleado);

export default Empleado;
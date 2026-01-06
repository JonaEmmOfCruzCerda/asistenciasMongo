import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function inicializarBaseDatos() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.URI_MONGODB);
    
    console.log('✅ Conexión exitosa');
    
    // Limpiar colecciones existentes
    const colecciones = await mongoose.connection.db.listCollections().toArray();
    
    for (const coleccion of colecciones) {
      if (['empleados', 'asistencias'].includes(coleccion.name)) {
        await mongoose.connection.db.collection(coleccion.name).drop();
        console.log(`🗑️  Colección ${coleccion.name} eliminada`);
      }
    }
    
    // Crear esquemas
    const EsquemaEmpleado = new mongoose.Schema({
      numero_empleado: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      nombre_completo: {
        type: String,
        required: true,
        trim: true
      },
      area: {
        type: String,
        required: true,
        trim: true
      },
      activo: {
        type: Boolean,
        default: true
      }
    }, {
      timestamps: true
    });
    
    const EsquemaAsistencia = new mongoose.Schema({
      numero_empleado: {
        type: String,
        required: true,
        index: true
      },
      nombre_empleado: {
        type: String,
        required: true
      },
      area_empleado: {
        type: String,
        required: true
      },
      tipo_registro: {
        type: String,
        enum: ['entrada', 'salida'],
        default: 'entrada'
      },
      fecha: {
        type: String,
        required: true,
        index: true
      },
      hora: {
        type: String,
        required: true
      },
      marca_tiempo: {
        type: Date,
        required: true,
        default: Date.now
      }
    }, {
      timestamps: true
    });
    
    // Crear modelos
    const Empleado = mongoose.model('Empleado', EsquemaEmpleado);
    const Asistencia = mongoose.model('Asistencia', EsquemaAsistencia);
    
    // Crear empleados de ejemplo
    const empleadosEjemplo = [
      {
        numero_empleado: '1001',
        nombre_completo: 'Juan Pérez Martínez',
        area: 'Ventas',
        activo: true
      },
      {
        numero_empleado: '1002',
        nombre_completo: 'María González López',
        area: 'Recursos Humanos',
        activo: true
      },
      {
        numero_empleado: '1003',
        nombre_completo: 'Carlos Rodríguez Sánchez',
        area: 'Tecnología',
        activo: true
      },
      {
        numero_empleado: '1004',
        nombre_completo: 'Ana Martínez Fernández',
        area: 'Contabilidad',
        activo: true
      },
      {
        numero_empleado: '1005',
        nombre_completo: 'Pedro Gómez Ruiz',
        area: 'Operaciones',
        activo: true
      }
    ];
    
    await Empleado.insertMany(empleadosEjemplo);
    
    console.log('✅ Empleados de ejemplo creados:');
    empleadosEjemplo.forEach(emp => {
      console.log(`   ${emp.numero_empleado} - ${emp.nombre_completo} (${emp.area})`);
    });
    
    console.log('\n🎉 Base de datos inicializada correctamente');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inicializarBaseDatos();
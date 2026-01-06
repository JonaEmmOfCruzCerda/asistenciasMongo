// app/api/empleados/route.js
import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Empleado from '@/app/models/Empleado';

/**
 * GET → Obtener todos los empleados
 */
export async function GET(solicitud) {
  try {
    await conectarDB();
    
    const { searchParams } = new URL(solicitud.url);
    const activo = searchParams.get('activo');
    const buscar = searchParams.get('buscar');
    
    let consulta = {};
    
    // Filtrar por estado activo
    if (activo !== null) {
      consulta.activo = activo === 'true';
    }
    
    // Búsqueda general
    if (buscar) {
      consulta.$or = [
        { nombre_completo: { $regex: buscar, $options: 'i' } },
        { numero_empleado: { $regex: buscar, $options: 'i' } },
        { area: { $regex: buscar, $options: 'i' } }
      ];
    }

    const empleados = await Empleado.find(consulta).sort({ numero_empleado: 1 }); // Ordenar por número ascendente
    
    return NextResponse.json(empleados);
    
  } catch (error) {
    console.error('❌ Error en GET /api/empleados:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
}
// En /app/api/empleados/route.js, MODIFICA la lógica:

export async function POST(solicitud) {
  try {
    await conectarDB();
    
    const datos = await solicitud.json();
    console.log('📥 Datos recibidos para nuevo empleado:', datos);
    
    const { nombre_completo, area, activo = true } = datos;

    // Validar datos
    if (!nombre_completo || !area) {
      return NextResponse.json(
        { 
          error: 'Datos incompletos',
          campos_requeridos: ['nombre_completo', 'area'],
          datos_recibidos: { nombre_completo, area }
        },
        { status: 400 }
      );
    }

    // LÓGICA: Buscar el primer hueco disponible empezando desde 1
    const empleados = await Empleado.find({
      numero_empleado: { $regex: /^\d+$/ } // Solo números
    }).sort({ numero_empleado: 1 });
    
    let siguienteNumero = '1'; // Empezar desde 1
    
    // Si ya hay empleados, buscar huecos empezando desde 1
    if (empleados.length > 0) {
      // Convertir números a enteros y ordenar
      const numeros = empleados.map(emp => parseInt(emp.numero_empleado));
      numeros.sort((a, b) => a - b);
      
      console.log('📊 Números existentes:', numeros);
      
      // Buscar el primer hueco empezando desde 1
      let huecoEncontrado = false;
      for (let i = 1; i <= numeros.length + 1; i++) {
        if (!numeros.includes(i)) {
          siguienteNumero = i.toString();
          huecoEncontrado = true;
          console.log('🎯 Hueco encontrado en:', i);
          break;
        }
      }
      
      // Si no hay huecos, usar el siguiente consecutivo
      if (!huecoEncontrado) {
        const maxNumero = Math.max(...numeros);
        siguienteNumero = (maxNumero + 1).toString();
        console.log('📈 Usando siguiente consecutivo:', siguienteNumero);
      }
    }
    
    console.log('🔢 Número generado automáticamente:', siguienteNumero);
    console.log('📝 Datos a guardar:', {
      numero_empleado: siguienteNumero,
      nombre_completo: nombre_completo.trim(),
      area: area.trim(),
      activo: activo === 'Sí' || activo === true || activo === 'true'
    });

    // Crear el nuevo empleado
    const nuevoEmpleado = await Empleado.create({
      numero_empleado: siguienteNumero,
      nombre_completo: nombre_completo.trim(),
      area: area.trim(),
      activo: activo === 'Sí' || activo === true || activo === 'true'
    });

    console.log('✅ Empleado creado exitosamente:', nuevoEmpleado._id);

    return NextResponse.json({
      exito: true,
      mensaje: 'Empleado creado exitosamente',
      empleado: nuevoEmpleado,
      numero_generado: siguienteNumero
    });
    
  } catch (error) {
    console.error('❌ Error en POST /api/empleados:', error);
    console.error('📋 Detalles del error:', {
      nombre: error.name,
      mensaje: error.message,
      errores: error.errors,
      codigo: error.code
    });
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe un empleado con este número' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al crear empleado',
        detalles: error.message
      },
      { status: 500 }
    );
  }
}
/**
 * PUT → Actualizar empleado
 */
export async function PUT(solicitud) {
  try {
    await conectarDB();
    
    const datos = await solicitud.json();
    const { id, nombre_completo, area, activo, id_original } = datos;

    if (!id || !nombre_completo || !area) {
      return NextResponse.json(
        { error: 'ID, nombre y área son obligatorios' },
        { status: 400 }
      );
    }

    // Buscar por el ID original o el nuevo
    const idBusqueda = id_original || id;
    
    const datosActualizar = {
      nombre_completo: nombre_completo.trim(),
      area: area.trim(),
      activo: activo === 'Sí' || activo === true || activo === 'true',
      fecha_actualizacion: new Date()
    };

    const empleadoActualizado = await Empleado.findOneAndUpdate(
      { numero_empleado: idBusqueda },
      datosActualizar,
      { 
        new: true,
        runValidators: true
      }
    );

    if (!empleadoActualizado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Empleado actualizado exitosamente',
      empleado: empleadoActualizado
    });
    
  } catch (error) {
    console.error('❌ Error en PUT /api/empleados:', error);
    return NextResponse.json(
      { error: 'Error al actualizar empleado: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE → Eliminar empleado
 */
export async function DELETE(solicitud) {
  try {
    await conectarDB();
    
    const { searchParams } = new URL(solicitud.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Número de empleado requerido' },
        { status: 400 }
      );
    }

    const empleadoEliminado = await Empleado.findOneAndDelete({ 
      numero_empleado: id 
    });

    if (!empleadoEliminado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Empleado eliminado exitosamente',
      empleado: {
        numero_empleado: empleadoEliminado.numero_empleado,
        nombre_completo: empleadoEliminado.nombre_completo
      }
    });
    
  } catch (error) {
    console.error('❌ Error en DELETE /api/empleados:', error);
    return NextResponse.json(
      { error: 'Error al eliminar empleado: ' + error.message },
      { status: 500 }
    );
  }
}
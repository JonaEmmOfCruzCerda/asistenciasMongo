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
    
    // Aceptar numero_empleado si viene del frontend
    const { numero_empleado, nombre_completo, area, activo = true } = datos;

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

    let siguienteNumero;
    
    // Si el frontend envió un número, usarlo (después de validar)
    if (numero_empleado && numero_empleado.trim() !== '') {
      const numeroIngresado = numero_empleado.trim();
      
      // Validar que sea un número válido
      if (!/^\d+$/.test(numeroIngresado)) {
        return NextResponse.json(
          { error: 'El número de empleado debe contener solo dígitos' },
          { status: 400 }
        );
      }
      
      // Verificar que no exista ya
      const existe = await Empleado.findOne({ numero_empleado: numeroIngresado });
      if (existe) {
        return NextResponse.json(
          { error: `El número ${numeroIngresado} ya está registrado` },
          { status: 409 }
        );
      }
      
      siguienteNumero = numeroIngresado;
      console.log('🔢 Usando número ingresado manualmente:', siguienteNumero);
    } else {
      // Si no envió número, generar automáticamente
      // LÓGICA: Buscar el primer hueco disponible empezando desde 1
      const empleados = await Empleado.find({
        numero_empleado: { $regex: /^\d+$/ } // Solo números
      }).sort({ numero_empleado: 1 });
      
      siguienteNumero = '1'; // Empezar desde 1
      
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
    }
    
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
// En /app/api/empleados/route.js - Modificar el PUT:

// En /app/api/empleados/route.js - Modificar el PUT:

export async function PUT(solicitud) {
  try {
    await conectarDB();
    
    const datos = await solicitud.json();
    console.log('📥 Datos recibidos para actualizar empleado:', datos);
    
    const { id, nombre_completo, area, activo, id_original } = datos;

    if (!id || !nombre_completo || !area) {
      return NextResponse.json(
        { error: 'ID, nombre y área son obligatorios' },
        { status: 400 }
      );
    }

    // Buscar por el ID original
    const idBusqueda = id_original || id;
    
    console.log(`🔍 Buscando empleado con número original: ${idBusqueda}`);
    console.log(`🎯 Nuevo número solicitado: ${id}`);
    
    // Verificar si el nuevo número ya existe (si es diferente al original)
    if (id !== id_original) {
      const numeroExistente = await Empleado.findOne({ numero_empleado: id });
      if (numeroExistente) {
        return NextResponse.json(
          { error: `El número ${id} ya está registrado por otro empleado` },
          { status: 409 }
        );
      }
    }

    const datosActualizar = {
      numero_empleado: id, // Actualizar el número si cambió
      nombre_completo: nombre_completo.trim(),
      area: area.trim(),
      activo: activo === 'Sí' || activo === true || activo === 'true',
      fecha_actualizacion: new Date()
    };

    console.log('📝 Datos a actualizar:', datosActualizar);

    // Primero verificar si existe el empleado original
    const empleadoExistente = await Empleado.findOne({ numero_empleado: idBusqueda });
    
    if (!empleadoExistente) {
      console.error('❌ Empleado no encontrado con número:', idBusqueda);
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Si cambió el número, primero eliminar el viejo y crear nuevo
    let empleadoActualizado;
    
    if (id !== id_original) {
      console.log('🔄 Cambiando número de empleado...');
      
      // Eliminar el registro viejo
      await Empleado.deleteOne({ numero_empleado: idBusqueda });
      
      // Crear nuevo registro con el nuevo número
      empleadoActualizado = await Empleado.create({
        numero_empleado: id,
        nombre_completo: nombre_completo.trim(),
        area: area.trim(),
        activo: activo === 'Sí' || activo === true || activo === 'true',
        fecha_creacion: empleadoExistente.fecha_creacion, // Mantener fecha original
        fecha_actualizacion: new Date()
      });
      
      console.log('✅ Empleado recreado con nuevo número');
    } else {
      // Si no cambió el número, solo actualizar
      empleadoActualizado = await Empleado.findOneAndUpdate(
        { numero_empleado: idBusqueda },
        datosActualizar,
        { 
          new: true,
          runValidators: true
        }
      );
    }

    if (!empleadoActualizado) {
      console.error('❌ Error al actualizar empleado');
      return NextResponse.json(
        { error: 'Error al actualizar empleado' },
        { status: 500 }
      );
    }

    console.log('✅ Empleado actualizado exitosamente:', empleadoActualizado);

    return NextResponse.json({
      exito: true,
      mensaje: 'Empleado actualizado exitosamente',
      empleado: empleadoActualizado,
      numero_original: id_original,
      numero_nuevo: id,
      cambio_numero: id !== id_original
    });
    
  } catch (error) {
    console.error('❌ Error en PUT /api/empleados:', error);
    console.error('📋 Detalles del error:', error.message);
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
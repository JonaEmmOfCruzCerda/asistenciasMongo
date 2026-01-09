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
    const departamento = searchParams.get('departamento');
    const area = searchParams.get('area');
    
    let consulta = {};
    
    // Filtrar por estado activo
    if (activo !== null) {
      consulta.activo = activo === 'true';
    }
    
    // Filtrar por departamento
    if (departamento) {
      consulta.departamento = { $regex: departamento, $options: 'i' };
    }
    
    // Filtrar por área
    if (area) {
      consulta.area = { $regex: area, $options: 'i' };
    }
    
    // Búsqueda general
    if (buscar) {
      consulta.$or = [
        { nombre_completo: { $regex: buscar, $options: 'i' } },
        { numero_empleado: { $regex: buscar, $options: 'i' } },
        { area: { $regex: buscar, $options: 'i' } },
        { departamento: { $regex: buscar, $options: 'i' } }
      ];
    }

    const empleados = await Empleado.find(consulta)
      .sort({ 
        departamento: 1,
        numero_empleado: 1 
      });
    
    console.log(`✅ ${empleados.length} empleados encontrados`);
    
    return NextResponse.json(empleados);
    
  } catch (error) {
    console.error('❌ Error en GET /api/empleados:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados', detalles: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST → Crear nuevo empleado
 */
export async function POST(solicitud) {
  try {
    await conectarDB();
    
    const datos = await solicitud.json();
    console.log('📥 Datos recibidos para nuevo empleado:', datos);
    
    // Extraer todos los campos incluyendo departamento
    const { 
      numero_empleado, 
      nombre_completo, 
      area, 
      departamento, 
      activo = true 
    } = datos;

    // Validar datos completos incluyendo departamento
    if (!nombre_completo || !area || !departamento) {
      return NextResponse.json(
        { 
          error: 'Datos incompletos',
          campos_requeridos: ['nombre_completo', 'area', 'departamento'],
          datos_recibidos: { 
            nombre_completo: !!nombre_completo,
            area: !!area,
            departamento: !!departamento
          }
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
      
      if (parseInt(numeroIngresado) <= 0) {
        return NextResponse.json(
          { error: 'El número de empleado debe ser mayor a 0' },
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
      // Buscar el primer hueco disponible empezando desde 1
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
    
    // Preparar datos del empleado
    const datosEmpleado = {
      numero_empleado: siguienteNumero,
      nombre_completo: nombre_completo.trim(),
      area: area.trim(),
      departamento: departamento.trim(), // Incluir departamento
      activo: activo === 'Sí' || activo === true || activo === 'true' || activo === '1'
    };

    console.log('📝 Datos a guardar:', datosEmpleado);

    // Crear el nuevo empleado
    const nuevoEmpleado = await Empleado.create(datosEmpleado);

    console.log('✅ Empleado creado exitosamente:', {
      id: nuevoEmpleado._id,
      numero: nuevoEmpleado.numero_empleado,
      nombre: nuevoEmpleado.nombre_completo,
      area: nuevoEmpleado.area,
      departamento: nuevoEmpleado.departamento
    });

    return NextResponse.json({
      exito: true,
      mensaje: 'Empleado creado exitosamente',
      empleado: nuevoEmpleado,
      numero_generado: siguienteNumero
    }, { status: 201 });
    
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
    console.log('📥 Datos recibidos para actualizar empleado:', datos);
    
    // Extraer todos los campos incluyendo departamento
    const { 
      id, 
      nombre_completo, 
      area, 
      departamento, 
      activo, 
      id_original 
    } = datos;

    // Validar datos completos incluyendo departamento
    if (!id || !nombre_completo || !area || !departamento) {
      return NextResponse.json(
        { 
          error: 'Datos incompletos. ID, nombre, área y departamento son obligatorios',
          datos_recibidos: {
            id: !!id,
            nombre_completo: !!nombre_completo,
            area: !!area,
            departamento: !!departamento
          }
        },
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

    // Preparar datos para actualización incluyendo departamento
    const datosActualizar = {
      numero_empleado: id, // Actualizar el número si cambió
      nombre_completo: nombre_completo.trim(),
      area: area.trim(),
      departamento: departamento.trim(), // Incluir departamento
      activo: activo === 'Sí' || activo === true || activo === 'true' || activo === '1',
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
      
      // Crear nuevo registro con el nuevo número y todos los campos
      empleadoActualizado = await Empleado.create({
        numero_empleado: id,
        nombre_completo: nombre_completo.trim(),
        area: area.trim(),
        departamento: departamento.trim(), // Incluir departamento
        activo: activo === 'Sí' || activo === true || activo === 'true' || activo === '1',
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
          new: true, // Retornar el documento actualizado
          runValidators: true // Ejecutar validaciones del esquema
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

    console.log('✅ Empleado actualizado exitosamente:', {
      numero_original: id_original,
      numero_nuevo: empleadoActualizado.numero_empleado,
      nombre: empleadoActualizado.nombre_completo,
      area: empleadoActualizado.area,
      departamento: empleadoActualizado.departamento,
      activo: empleadoActualizado.activo
    });

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
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'El número de empleado ya está en uso' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al actualizar empleado',
        detalles: error.message
      },
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

    console.log('🗑️ Empleado eliminado:', {
      numero: empleadoEliminado.numero_empleado,
      nombre: empleadoEliminado.nombre_completo
    });

    return NextResponse.json({
      exito: true,
      mensaje: 'Empleado eliminado exitosamente',
      empleado: {
        numero_empleado: empleadoEliminado.numero_empleado,
        nombre_completo: empleadoEliminado.nombre_completo,
        area: empleadoEliminado.area,
        departamento: empleadoEliminado.departamento
      }
    });
    
  } catch (error) {
    console.error('❌ Error en DELETE /api/empleados:', error);
    return NextResponse.json(
      { 
        error: 'Error al eliminar empleado',
        detalles: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH → Actualización parcial de empleado
 */
export async function PATCH(solicitud) {
  try {
    await conectarDB();
    
    const datos = await solicitud.json();
    const { id } = datos;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de empleado requerido' },
        { status: 400 }
      );
    }

    // Eliminar campos que no se deben actualizar directamente
    delete datos.id;
    delete datos._id;
    delete datos.__v;
    delete datos.fecha_creacion;
    
    // Agregar fecha de actualización
    datos.fecha_actualizacion = new Date();

    const empleadoActualizado = await Empleado.findOneAndUpdate(
      { numero_empleado: id },
      datos,
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
      mensaje: 'Empleado actualizado parcialmente',
      empleado: empleadoActualizado
    });
    
  } catch (error) {
    console.error('❌ Error en PATCH /api/empleados:', error);
    return NextResponse.json(
      { error: 'Error al actualizar empleado: ' + error.message },
      { status: 500 }
    );
  }
}
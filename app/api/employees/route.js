import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/googleSheets';

// Función para obtener el próximo ID disponible
async function getNextEmployeeId() {
  try {
    const employees = await googleSheets.getEmployees();
    
    if (employees.length === 0) {
      return '1'; // Primer empleado
    }
    
    // Convertir IDs a números y encontrar el máximo
    const numericIds = employees
      .map(emp => {
        const idNum = parseInt(emp.id);
        return isNaN(idNum) ? 0 : idNum;
      })
      .filter(id => id > 0);
    
    if (numericIds.length === 0) {
      return '1';
    }
    
    const maxId = Math.max(...numericIds);
    return (maxId + 1).toString();
    
  } catch (error) {
    console.error('Error calculando próximo ID:', error);
    return '1';
  }
}

// Función para actualizar un empleado existente
async function updateExistingEmployee(originalId, employeeData, sheets, spreadsheetId) {
  // Obtener todas las filas para encontrar la correcta
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Empleados!A:D',
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    throw new Error('No se encontraron empleados');
  }
  
  // Buscar la fila del empleado a actualizar
  const startRow = rows[0][0] === 'ID' ? 1 : 0;
  let rowToUpdate = -1;
  
  for (let i = startRow; i < rows.length; i++) {
    if (rows[i][0] === originalId) {
      rowToUpdate = i + 1; // +1 porque Sheets usa index 1-based
      break;
    }
  }
  
  if (rowToUpdate === -1) {
    throw new Error('Empleado no encontrado para actualizar');
  }
  
  // Preparar datos actualizados
  const values = [[
    employeeData.id,
    employeeData.name,
    employeeData.department,
    employeeData.active ? 'Sí' : 'No'
  ]];
  
  // Actualizar la fila existente
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Empleados!A${rowToUpdate}:D${rowToUpdate}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
  
  return { updatedRow: rowToUpdate };
}

export async function GET() {
  try {
    console.log('👥 Obteniendo lista de empleados...');
    
    const employees = await googleSheets.getEmployees();
    
    return NextResponse.json(employees);
    
  } catch (error) {
    console.error('❌ Error en GET /api/employees:', error.message);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const employeeData = await request.json();
    
    console.log('📝 Procesando empleado:', {
      ...employeeData,
      isEditing: employeeData.isEditing || false
    });
    
    const sheets = googleSheets.sheets;
    const spreadsheetId = googleSheets.spreadsheetId;
    
    // Si es edición, actualizar empleado existente
    if (employeeData.isEditing && employeeData.originalId) {
      const result = await updateExistingEmployee(
        employeeData.originalId,
        employeeData,
        sheets,
        spreadsheetId
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Empleado actualizado exitosamente',
        updatedRow: result.updatedRow
      });
    }
    
    // Si es nuevo empleado, generar ID automático si no se proporcionó
    let finalEmployeeData = { ...employeeData };
    
    if (!finalEmployeeData.id) {
      const nextId = await getNextEmployeeId();
      finalEmployeeData.id = nextId;
      console.log('🆔 ID generado automáticamente:', nextId);
    }
    
    const values = [[
      finalEmployeeData.id,
      finalEmployeeData.name,
      finalEmployeeData.department,
      finalEmployeeData.active ? 'Sí' : 'No'
    ]];
    
    // Agregar nuevo empleado al final
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Empleados!A:D',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Empleado agregado exitosamente',
      generatedId: !employeeData.id ? finalEmployeeData.id : null
    });
    
  } catch (error) {
    console.error('❌ Error en POST /api/employees:', error.message);
    return NextResponse.json(
      { error: 'Error al guardar empleado', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const employeeData = await request.json();
    
    if (!employeeData.originalId) {
      return NextResponse.json(
        { error: 'Se requiere originalId para actualizar' },
        { status: 400 }
      );
    }
    
    console.log('✏️ Actualizando empleado:', employeeData.originalId);
    
    const sheets = googleSheets.sheets;
    const spreadsheetId = googleSheets.spreadsheetId;
    
    const result = await updateExistingEmployee(
      employeeData.originalId,
      employeeData,
      sheets,
      spreadsheetId
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Empleado actualizado exitosamente',
      updatedRow: result.updatedRow
    });
    
  } catch (error) {
    console.error('❌ Error en PUT /api/employees:', error.message);
    return NextResponse.json(
      { error: 'Error al actualizar empleado', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'ID de empleado requerido' },
        { status: 400 }
      );
    }
    
    console.log('🗑️ Eliminando empleado:', employeeId);
    
    const sheets = googleSheets.sheets;
    const spreadsheetId = googleSheets.spreadsheetId;
    
    // Obtener todas las filas para encontrar la correcta
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Empleados!A:D',
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron empleados' },
        { status: 404 }
      );
    }
    
    // Buscar la fila del empleado
    const startRow = rows[0][0] === 'ID' ? 1 : 0;
    let rowToDelete = -1;
    
    for (let i = startRow; i < rows.length; i++) {
      if (rows[i][0] === employeeId) {
        rowToDelete = i + 1; // +1 porque Sheets usa index 1-based
        break;
      }
    }
    
    if (rowToDelete === -1) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }
    
    // Eliminar la fila
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0,
              dimension: 'ROWS',
              startIndex: rowToDelete - 1,
              endIndex: rowToDelete
            }
          }
        }]
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Empleado eliminado exitosamente' 
    });
    
  } catch (error) {
    console.error('❌ Error en DELETE /api/employees:', error.message);
    return NextResponse.json(
      { error: 'Error al eliminar empleado', details: error.message },
      { status: 500 }
    );
  }
}
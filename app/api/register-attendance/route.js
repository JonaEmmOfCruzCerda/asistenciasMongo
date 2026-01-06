// app/api/register-attendance/route.js
import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/googleSheets';
import { google } from 'googleapis';

// Función auxiliar mejorada para verificar asistencia reciente (SOLO A:F)
async function checkRecentAttendance(employeeId) {
  try {
    console.log(`🔍 Verificando asistencia reciente para empleado: ${employeeId}`);
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'control-asistencias-service@asistencias-483423.iam.gserviceaccount.com',
        private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n') || `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDORyV5yk3Gp8r0
+Hej4PQ7h9/tXmFDRxTWDJ3xKg+4VoLiD3nKQ2IPmEKmHexoacU+2GA5tcIgryrG
m8yuyACEAL/WbMDcIAlvhadzuegm4y9GPxPr2IFWW5ifxk+jZAjdahGGJN8UanHd
knfu6+TAt5m10ch5e7NMOz5+Ny7MOFPWNZabxFX1SnyNpLnHC/Gd7BeWYx530Xqz
6bTFivJVC7rl+4LfsUmqtvW4oS0YZ/L40nhPlANF6X9G7qrLUej6IfKfNTN1K0Wt
iM91cmZvSebDvTk3AwsyvLxUEUvXZA1K3njIrOSqRsLkPCJS8QL/9AD3CzPx8Nk3
4D05BRKjAgMBAAECggEAGPgZvDVV1s8mzSJqcQbg6XfYDkaXZWpsRkC+uZuKzZiD
PVP8PRSNATBAGRWUMUtkWegdNb8foY8ykVn4m8uP7GqezhjZ+4tROROnomWFiXeE
mG84PRs3BLoPrn910mRgglS9jExYSINeByEcrWoWhZFz5MNhDfuAR6EAPoz1eDi9
VyLB/B2HtdAsc1lzXk8biBG/VsolnMxDDVu7NCWjKdJvYjqVPele1+6tOQ3arHVd
nHRj5tWOT/I71HDj1q7McKBv90rq3+HlsgCSp68gKOXrdP+gZCWMyp2a4n8CmQLH
sFAsmzWZCCXie34NeTizUqTuLzsJXsztJ7HWLH14GQKBgQD+yz7xEBbadJ64xOkD
n9KQhXF1AoOdVmgn81t3qgjypMeszRl1mt3royg0wDIVxtvTJnqnddlZYpDIqUFs
s9TN+HIfhulQnbrkL5und0BC1FbNFmAPQP9GCrvml9oZDf+/QHLpf6jUCf4/3V3u
OZ5rclhqPENb9F2DvKLtsRLKdwKBgQDPQRwbybd96WyJ8F1D/SDb6RjoVB+lDJGi
Nrx/Aduq9tqW1k9/VAmW2QHTFS8sJ7EKC4ag48Ac0YxJ1+a9N9XP/yx3Kmdf/fof
unTto9igXIELtPHaSwQ5UujwUpkzPN/5ZI4wNGN69v8DGGfemywsPk/CWpNq25Xa
OKJJ34oYNQKBgQD3kAl29hgOaDNz+bch018nFtFXTHsPG86Vyql7ypVpFVwBdUKg
dzna4yuEnZ3MdOxP69pO7X2ikNd2cKXl9ZD2E8jnAxGdR7Q4VF2byI2CoYg5Ot1Y
1OFzb6iEc9TwdR6h9//vCh/C7nbAHNlQR2G6ql5n0mfsZ7GY92cjJeLJHwKBgGfA
iHnAuYLm39cN5SKsDU8JmdZ0hoLxj9ZM4IAURguIGFV6Y8GyKDrD2A37hOnt1Mra
ikLwwLOskzZERtZipT7C11ewep+rXROVHAP7Ce79X/ykUI6fDzZDMylbsCXeS6Fl
nWi0UTi1fWPnS9g8hhh/+R2qijHsS1A7GcMxjMghAoGBAN2N3wpsBkHvyy71LFX7
z4SYZmXzLdYB1u8ZqsoU1Kvir25PmO8kvSBWkZUQJTGOmykLilpFeHHtQSCMwePV
YKSsk2+LqmJyeWkATs7MKBH0lW6Fcd/8LpZKIqIK2TXJJqsWdAhdtdy7Pj2YHeHi
NBhakCsDpOQkeTlOtvR+tS1r
-----END PRIVATE KEY-----`,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '1pfmIlsbexkI26mTtvh92uFsKTcpmCPik3-reqHZXlz0';

    console.log(`📊 Verificando en spreadsheet: ${spreadsheetId}`);
    console.log(`📝 Buscando registros del empleado: ${employeeId}`);

    // Leer TODOS los registros - SOLO A:F
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Asistencias!A:F', // IMPORTANTE: Solo A:F
    });

    const rows = response.data.values || [];
    
    console.log(`📈 Total de filas en Asistencias: ${rows.length}`);
    
    if (rows.length <= 1) { // Solo encabezados o vacío
      console.log('📭 No hay registros de asistencia');
      return {
        hasRecentAttendance: false,
        lastAttendance: null,
        nextAllowedTime: null,
        hoursRemaining: 0
      };
    }

    // Buscar registros específicos del empleado
    const employeeRegistrations = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Verificar si la fila tiene datos y si el ID coincide
      if (row && row.length > 0 && row[0] && row[0].toString().trim() === employeeId.toString().trim()) {
        try {
          const dateStr = row[2]; // Columna C: Fecha
          const timeStr = row[3]; // Columna D: Hora
          
          if (dateStr && timeStr) {
            // Crear fecha combinando fecha y hora
            const timestamp = new Date(`${dateStr} ${timeStr}`);
            
            if (!isNaN(timestamp.getTime())) {
              employeeRegistrations.push({
                timestamp,
                date: dateStr,
                time: timeStr
              });
              console.log(`📅 Encontrado registro: ${dateStr} ${timeStr}`);
            } else {
              console.warn(`⚠️ Timestamp inválido en fila ${i}: ${dateStr} ${timeStr}`);
            }
          } else {
            console.warn(`⚠️ Fila ${i} no tiene fecha/hora completa:`, row);
          }
        } catch (err) {
          console.warn(`⚠️ Error procesando fila ${i}:`, err.message);
          console.warn(`📄 Contenido de la fila:`, row);
        }
      }
    }

    console.log(`📊 Registros encontrados para ${employeeId}: ${employeeRegistrations.length}`);

    if (employeeRegistrations.length === 0) {
      console.log(`✅ Empleado ${employeeId} no tiene registros previos`);
      return {
        hasRecentAttendance: false,
        lastAttendance: null,
        nextAllowedTime: null,
        hoursRemaining: 0
      };
    }

    // Ordenar por timestamp descendente
    employeeRegistrations.sort((a, b) => b.timestamp - a.timestamp);
    const lastAttendance = employeeRegistrations[0];

    console.log(`⏰ Último registro encontrado: ${lastAttendance.date} ${lastAttendance.time}`);
    console.log(`📅 Timestamp del último registro: ${lastAttendance.timestamp}`);

    // Calcular si ha pasado menos de 20 horas
    const now = new Date();
    const timeDiff = now.getTime() - lastAttendance.timestamp.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const HOURS_LIMIT = 20;

    console.log(`⏱️ Diferencia calculada: ${hoursDiff.toFixed(2)} horas`);
    console.log(`⚖️ Límite: ${HOURS_LIMIT} horas`);

    if (hoursDiff < HOURS_LIMIT) {
      const nextAllowed = new Date(lastAttendance.timestamp.getTime() + (HOURS_LIMIT * 60 * 60 * 1000));
      const hoursRemaining = (HOURS_LIMIT - hoursDiff).toFixed(2);
      
      console.log(`⛔ DEBE ESPERAR: ${hoursRemaining} horas más`);
      console.log(`⏳ Puede registrar nuevamente: ${nextAllowed.toLocaleString('es-ES')}`);
      
      return {
        hasRecentAttendance: true,
        lastAttendance: lastAttendance.timestamp.toISOString(),
        nextAllowedTime: nextAllowed.toISOString(),
        hoursRemaining: hoursRemaining
      };
    }

    console.log(`✅ PUEDE REGISTRAR: Pasaron ${hoursDiff.toFixed(2)} horas (más de ${HOURS_LIMIT} horas)`);

    return {
      hasRecentAttendance: false,
      lastAttendance: lastAttendance.timestamp.toISOString(),
      nextAllowedTime: null,
      hoursRemaining: 0
    };

  } catch (error) {
    console.error('❌ Error en checkRecentAttendance:', error.message);
    console.error('Stack:', error.stack);
    
    // Si hay error, permitir el registro por seguridad PERO loguear el error
    return {
      hasRecentAttendance: false,
      lastAttendance: null,
      nextAllowedTime: null,
      hoursRemaining: 0,
      error: error.message,
      allowRegistration: true // Bandera para permitir registro en caso de error
    };
  }
}

export async function POST(request) {
  try {
    const { employeeId } = await request.json();
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'Número de empleado requerido' },
        { status: 400 }
      );
    }
    
    console.log('👤 ============ INICIO REGISTRO ============');
    console.log('👤 Buscando empleado:', employeeId);
    
    // Primero verificar si ya tiene asistencia reciente
    console.log('🔍 Verificando si ya registró asistencia recientemente...');
    const attendanceCheck = await checkRecentAttendance(employeeId);
    
    if (attendanceCheck.hasRecentAttendance) {
      console.log(`⛔ ====== REGISTRO BLOQUEADO ======`);
      console.log(`⛔ Empleado ${employeeId} ya registró hace menos de 20 horas`);
      console.log(`⛔ Último registro: ${attendanceCheck.lastAttendance}`);
      console.log(`⛔ Horas restantes: ${attendanceCheck.hoursRemaining}`);
      
      return NextResponse.json(
        { 
          error: `Ya registraste asistencia recientemente. Espera ${attendanceCheck.hoursRemaining} horas más.`,
          nextAllowedTime: attendanceCheck.nextAllowedTime,
          hoursRemaining: attendanceCheck.hoursRemaining
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Puede registrar, no tiene asistencia reciente');
    
    // Buscar empleado
    const employee = await googleSheets.getEmployeeById(employeeId);
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }
    
    console.log('✅ Empleado encontrado:', employee.name);
    
    // Registrar asistencia
    const result = await googleSheets.registerAttendance(employee);
    
    console.log('✅ ============ REGISTRO EXITOSO ============');
    
    return NextResponse.json({
      success: true,
      message: 'Asistencia registrada exitosamente',
      employeeName: employee.name,
      department: employee.department,
      date: result.date,
      time: result.time,
      timestamp: result.timestamp
    });
    
  } catch (error) {
    console.error('❌ Error en /api/register-attendance:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Error al registrar asistencia',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET para verificar empleado
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
    if (employeeId) {
      const employee = await googleSheets.getEmployeeById(employeeId);
      
      if (!employee) {
        return NextResponse.json(
          { error: 'Empleado no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(employee);
    }
    
    // Si no hay employeeId, devolver todos los empleados
    const employees = await googleSheets.getEmployees();
    return NextResponse.json(employees);
    
  } catch (error) {
    console.error('❌ Error en GET /api/register-attendance:', error.message);
    
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
}
// app/api/check-attendance/route.js
import { google } from 'googleapis';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return new Response(JSON.stringify({ 
      error: 'Employee ID is required' 
    }), { status: 400 });
  }

  try {
    // Usar las mismas credenciales que en lib/googleSheets.js
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1pfmIlsbexkI26mTtvh92uFsKTcpmCPik3-reqHZXlz0';
    const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'control-asistencias-service@asistencias-483423.iam.gserviceaccount.com';
    const PRIVATE_KEY = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n') || `-----BEGIN PRIVATE KEY-----
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
-----END PRIVATE KEY-----`;

    console.log('🔍 Verificando asistencia para empleado ID:', employeeId);
    console.log('📊 Sheet ID:', SHEET_ID);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: SERVICE_EMAIL,
        private_key: PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = SHEET_ID;

    console.log('🔍 Verificando asistencia para empleado ID:', employeeId);

    // Leer los registros del empleado
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Asistencias!A:F',
    });

    const rows = response.data.values || [];
    
    if (!rows || rows.length <= 1) {
      console.log('📭 No hay registros de asistencia');
      return new Response(JSON.stringify({ 
        hasRecentAttendance: false,
        lastAttendance: null,
        nextAllowedTime: null,
        hoursRemaining: 0
      }), { status: 200 });
    }

    console.log(`📝 Total de filas en Asistencias: ${rows.length}`);

    // Buscar registros del empleado
    const employeeRegistrations = [];
    const startRow = rows[0][0] === 'ID' ? 1 : 0;
    
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length >= 1 && row[0] === employeeId) {
        try {
          const dateStr = row[2]; // Columna C: Fecha (ej: "05/01/2026")
          const timeStr = row[3]; // Columna D: Hora (ej: "19:18:19")
          const timestampStr = row[5]; // Columna F: Timestamp ISO (ej: "2026-01-06T01:18:19.899Z")
          
          let timestamp;
          
          // PRIMERO usar el timestamp ISO si existe (es más confiable)
          if (timestampStr) {
            timestamp = new Date(timestampStr);
            console.log(`✅ Usando timestamp ISO: ${timestampStr}`);
          }
          
          // Si no hay timestamp ISO o es inválido, usar fecha y hora
          if (!timestamp || isNaN(timestamp.getTime())) {
            if (dateStr && timeStr) {
              // Parsear formato dd/mm/yyyy hh:mm:ss
              const dateParts = dateStr.split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                // Formato: YYYY-MM-DDThh:mm:ss
                const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`;
                timestamp = new Date(isoString);
                console.log(`🔄 Parseado desde fecha/hora: ${isoString}`);
              }
            }
          }
          
          if (timestamp && !isNaN(timestamp.getTime())) {
            employeeRegistrations.push({
              timestamp,
              date: dateStr,
              time: timeStr,
              timestampISO: timestamp.toISOString()
            });
            console.log(`📅 Registro válido encontrado: ${timestamp.toLocaleString('es-ES')}`);
          } else {
            console.warn(`⚠️ No se pudo parsear fecha/hora en fila ${i}:`, { 
              dateStr, 
              timeStr, 
              timestampStr,
              row: row.join(' | ') 
            });
          }
        } catch (err) {
          console.warn(`⚠️ Error procesando fila ${i}:`, err.message);
          console.warn(`📄 Contenido de la fila:`, row.join(' | '));
        }
      }
    }

    console.log(`📊 Registros encontrados para empleado ${employeeId}: ${employeeRegistrations.length}`);

    if (employeeRegistrations.length === 0) {
      console.log(`✅ Empleado ${employeeId} no tiene registros previos`);
      return new Response(JSON.stringify({ 
        hasRecentAttendance: false,
        lastAttendance: null,
        nextAllowedTime: null,
        hoursRemaining: 0
      }), { status: 200 });
    }

    // Ordenar por timestamp descendente (más reciente primero)
    employeeRegistrations.sort((a, b) => b.timestamp - a.timestamp);
    const lastAttendance = employeeRegistrations[0];

    console.log(`⏰ Último registro encontrado: ${lastAttendance.timestamp.toLocaleString('es-ES')}`);
    console.log(`📅 Timestamp ISO: ${lastAttendance.timestamp.toISOString()}`);

    // Calcular si ha pasado menos de 20 horas
    const now = new Date();
    const timeDiff = now.getTime() - lastAttendance.timestamp.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const HOURS_LIMIT = 20;

    console.log(`⏱️ Diferencia en horas: ${hoursDiff.toFixed(2)} / Límite: ${HOURS_LIMIT}`);
    console.log(`🕒 Ahora: ${now.toLocaleString('es-ES')}`);
    console.log(`🕒 Último registro: ${lastAttendance.timestamp.toLocaleString('es-ES')}`);

    if (hoursDiff < HOURS_LIMIT) {
      const nextAllowed = new Date(lastAttendance.timestamp.getTime() + (HOURS_LIMIT * 60 * 60 * 1000));
      const hoursRemaining = (HOURS_LIMIT - hoursDiff).toFixed(2);
      
      console.log(`⛔ EMPLEADO BLOQUEADO - Debe esperar ${hoursRemaining} horas más`);
      console.log(`⏳ Próximo registro permitido: ${nextAllowed.toLocaleString('es-ES')}`);
      
      return new Response(JSON.stringify({
        hasRecentAttendance: true,
        lastAttendance: lastAttendance.timestamp.toISOString(),
        nextAllowedTime: nextAllowed.toISOString(),
        hoursRemaining: hoursRemaining,
        details: {
          lastRegistration: lastAttendance.timestamp.toLocaleString('es-ES'),
          nextRegistration: nextAllowed.toLocaleString('es-ES'),
          hoursPassed: hoursDiff.toFixed(2),
          hoursNeeded: hoursRemaining
        }
      }), { status: 200 });
    }

    console.log(`✅ EMPLEADO PUEDE REGISTRAR - Pasaron ${hoursDiff.toFixed(2)} horas (más de ${HOURS_LIMIT} horas)`);

    return new Response(JSON.stringify({
      hasRecentAttendance: false,
      lastAttendance: lastAttendance.timestamp.toISOString(),
      nextAllowedTime: null,
      hoursRemaining: 0,
      details: {
        lastRegistration: lastAttendance.timestamp.toLocaleString('es-ES'),
        hoursPassed: hoursDiff.toFixed(2)
      }
    }), { status: 200 });

  } catch (error) {
    console.error('❌ Error checking attendance:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Error checking attendance: ' + error.message,
      hasRecentAttendance: false,
      lastAttendance: null,
      nextAllowedTime: null,
      hoursRemaining: 0
    }), { status: 500 });
  }
}
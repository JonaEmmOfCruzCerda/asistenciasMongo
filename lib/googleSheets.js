import { google } from 'googleapis';

class GoogleSheetsService {
  constructor() {
    try {
      console.log('🔧 Inicializando Google Sheets Service...');
      
      // Valores de configuración
      const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1pfmIlsbexkI26mTtvh92uFsKTcpmCPik3-reqHZXlz0';
      const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'control-asistencias-service@asistencias-483423.iam.gserviceaccount.com';
      const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
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

      console.log('📄 Sheet ID:', SHEET_ID);
      console.log('📧 Service Email:', SERVICE_EMAIL);

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: SERVICE_EMAIL,
          private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.spreadsheetId = SHEET_ID;
      
      console.log('✅ Google Sheets Service inicializado');
    } catch (error) {
      console.error('❌ Error en constructor:', error.message);
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('🔍 Probando conexión con Google Sheets...');
      
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'properties.title, sheets.properties',
      });
      
      console.log('✅ Conexión exitosa!');
      console.log('📄 Título:', response.data.properties.title);
      console.log('📋 Hojas disponibles:', response.data.sheets?.map(s => s.properties.title));
      
      return {
        success: true,
        title: response.data.properties.title,
        sheets: response.data.sheets?.map(sheet => sheet.properties.title) || [],
        message: 'Conectado a Google Sheets'
      };
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Error al conectar con Google Sheets'
      };
    }
  }

  // En la clase GoogleSheetsService, agrega:
async getAllEmployeesRaw() {
  try {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Empleados!A:D',
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return { headers: [], data: [] };
    }
    
    // Separar encabezados y datos
    const headers = rows[0];
    const data = rows.slice(1);
    
    return { headers, data };
  } catch (error) {
    console.error('Error al obtener empleados raw:', error.message);
    return { headers: [], data: [] };
  }
}

// Y actualiza getEmployees para mejor manejo:
async getEmployees() {
  try {
    console.log('👥 Obteniendo empleados de Google Sheets...');
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Empleados!A:D',
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log('⚠️ No hay datos en la hoja Empleados');
      return [];
    }
    
    // Saltar encabezado si existe
    const startRow = rows[0][0] === 'ID' ? 1 : 0;
    
    const employees = rows.slice(startRow).map((row, index) => {
      const id = row[0]?.toString().trim() || '';
      const name = row[1]?.toString().trim() || '';
      const department = row[2]?.toString().trim() || '';
      const active = (row[3]?.toString().trim().toLowerCase() || 'sí') === 'sí';
      
      return { id, name, department, active };
    }).filter(emp => emp.id); // Incluir todos, no solo activos

    console.log(`✅ ${employees.length} empleados encontrados`);
    return employees;
  } catch (error) {
    console.error('❌ Error al obtener empleados:', error.message);
    return [];
  }
}

  async getEmployeeById(employeeId) {
    try {
      console.log(`🔎 Buscando empleado con ID: "${employeeId}"`);
      
      const employees = await this.getEmployees();
      
      // Buscar empleado (convertir ambos a string para comparar)
      const employee = employees.find(emp => 
        emp.id.toString().trim() === employeeId.toString().trim()
      );
      
      if (!employee) {
        console.log(`⚠️ Empleado con ID "${employeeId}" no encontrado`);
        console.log(`📋 Empleados disponibles:`, employees.map(e => e.id));
        return null;
      }
      
      console.log(`✅ Empleado encontrado: ${employee.name} (${employee.department})`);
      return employee;
    } catch (error) {
      console.error('❌ Error al buscar empleado:', error.message);
      return null;
    }
  }

  // En el método registerAttendance, asegúrate que sean solo 6 columnas
async registerAttendance(employee) {
  try {
    const now = new Date();
    
    // Formatear fecha y hora correctamente para Google Sheets
    const date = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const time = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const timestamp = now.toISOString();

    const values = [[
      employee.id,
      employee.name,
      date,
      time,
      'Entrada',
      timestamp
    ]];

    console.log('📝 Registrando asistencia en Google Sheets...');
    console.log('📋 Datos a registrar:', values[0]);

    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Asistencias!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values } // Solo enviar values, no data
    });

    console.log('✅ Asistencia registrada exitosamente!');
    console.log('📊 Actualizado:', response.data.updates);
    
    return {
      success: true,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      date,
      time,
      timestamp,
      updatedCells: response.data.updates?.updatedCells || 0
    };
  } catch (error) {
    console.error('❌ Error al registrar asistencia:', error.message);
    throw new Error(`No se pudo registrar la asistencia: ${error.message}`);
  }
}

// También actualiza getAttendanceRecords para 6 columnas:
async getAttendanceRecords(options = {}) {
  try {
    console.log('📊 Obteniendo registros de asistencia...');
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Asistencias!A:F', // SOLO A:F
    });

    const rows = response.data.values || [];
    console.log(`📈 ${rows.length} filas obtenidas de Asistencias`);
    
    if (rows.length === 0) {
      console.log('⚠️ No hay registros en la hoja Asistencias');
      return [];
    }
    
    // Saltar encabezado si existe
    const startRow = rows[0][0] === 'ID' ? 1 : 0;
    console.log('📝 Encabezados Asistencias:', rows[0]);
    
    let records = rows.slice(startRow).map(row => ({
      employeeId: row[0]?.toString().trim() || '',
      employeeName: row[1]?.toString().trim() || '',
      date: row[2]?.toString().trim() || '',
      time: row[3]?.toString().trim() || '',
      type: row[4]?.toString().trim() || 'Entrada',
      timestamp: row[5]?.toString().trim() || new Date().toISOString()
      // NOTA: No hay departamento aquí
    }));

    console.log(`📋 ${records.length} registros procesados:`);
    records.slice(0, 3).forEach(record => {
      console.log(`   - ${record.employeeId}: ${record.employeeName} - ${record.date} ${record.time}`);
    });
    if (records.length > 3) console.log(`   ... y ${records.length - 3} más`);

    // Aplicar filtros si existen
    if (options.date) {
      records = records.filter(record => record.date === options.date);
    }
    
    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      records = records.filter(record =>
        record.employeeId.toLowerCase().includes(searchTerm) ||
        record.employeeName.toLowerCase().includes(searchTerm) ||
        record.type.toLowerCase().includes(searchTerm)
      );
    }

    // Ordenar por fecha más reciente primero
    records.sort((a, b) => {
      const dateA = new Date(a.timestamp || `${a.date} ${a.time}`);
      const dateB = new Date(b.timestamp || `${b.date} ${b.time}`);
      return dateB - dateA;
    });

    return records;
  } catch (error) {
    console.error('❌ Error al obtener asistencias:', error.message);
    console.error('Stack:', error.stack);
    return [];
  }
}

  async getAttendanceRecords(options = {}) {
    try {
      console.log('📊 Obteniendo registros de asistencia...');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistencias!A:F', // Incluir encabezados
      });

      const rows = response.data.values || [];
      console.log(`📈 ${rows.length} filas obtenidas de Asistencias`);
      
      if (rows.length === 0) {
        console.log('⚠️ No hay registros en la hoja Asistencias');
        return [];
      }
      
      // Saltar encabezado si existe
      const startRow = rows[0][0] === 'ID' ? 1 : 0;
      console.log('📝 Encabezados Asistencias:', rows[0]);
      
      let records = rows.slice(startRow).map(row => ({
        employeeId: row[0]?.toString().trim() || '',
        employeeName: row[1]?.toString().trim() || '',
        date: row[2]?.toString().trim() || '',
        time: row[3]?.toString().trim() || '',
        type: row[4]?.toString().trim() || 'Entrada',
        timestamp: row[5]?.toString().trim() || new Date().toISOString()
      }));

      console.log(`📋 ${records.length} registros procesados:`);
      records.slice(0, 3).forEach(record => {
        console.log(`   - ${record.employeeId}: ${record.employeeName} - ${record.date} ${record.time}`);
      });
      if (records.length > 3) console.log(`   ... y ${records.length - 3} más`);

      // Aplicar filtros si existen
      if (options.date) {
        records = records.filter(record => record.date === options.date);
      }
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        records = records.filter(record =>
          record.employeeId.toLowerCase().includes(searchTerm) ||
          record.employeeName.toLowerCase().includes(searchTerm) ||
          record.type.toLowerCase().includes(searchTerm)
        );
      }

      // Ordenar por fecha más reciente primero
      records.sort((a, b) => {
        const dateA = new Date(a.timestamp || `${a.date} ${a.time}`);
        const dateB = new Date(b.timestamp || `${b.date} ${b.time}`);
        return dateB - dateA;
      });

      return records;
    } catch (error) {
      console.error('❌ Error al obtener asistencias:', error.message);
      console.error('Stack:', error.stack);
      return [];
    }
  }

  async getStatistics() {
    try {
      console.log('📈 Calculando estadísticas...');
      
      const [employees, attendance] = await Promise.all([
        this.getEmployees(),
        this.getAttendanceRecords()
      ]);

      const today = new Date().toLocaleDateString('es-ES');
      const todayAttendance = attendance.filter(record => record.date === today);
      const uniqueEmployeesToday = [...new Set(todayAttendance.map(record => record.employeeId))];

      const stats = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => e.active).length,
        totalAttendance: attendance.length,
        todayAttendance: todayAttendance.length,
        uniqueEmployeesToday: uniqueEmployeesToday.length
      };

      console.log('📊 Estadísticas calculadas:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error.message);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalAttendance: 0,
        todayAttendance: 0,
        uniqueEmployeesToday: 0
      };
    }
  }
}

// Crear y exportar una única instancia
export const googleSheets = new GoogleSheetsService();
import { google } from 'googleapis';

class GoogleSheetsService {
  constructor() {
    // NO inicializar aquí, solo declarar propiedades
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = null;
    this.initialized = false;
  }

  // Método para inicializar solo cuando sea necesario
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔧 Inicializando Google Sheets Service...');
      
      // 1. Obtener variables de entorno
      const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
      const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const PRIVATE_KEY_RAW = process.env.GOOGLE_PRIVATE_KEY;
      
      if (!SHEET_ID || !SERVICE_EMAIL || !PRIVATE_KEY_RAW) {
        throw new Error('❌ Variables de entorno faltantes');
      }
      
      console.log('📄 Sheet ID:', SHEET_ID);
      console.log('📧 Service Email:', SERVICE_EMAIL);
      console.log('🔑 Private Key length:', PRIVATE_KEY_RAW.length);
      
      // 2. Formatear clave privada (manejar Vercel y local)
      const formattedKey = this.formatPrivateKey(PRIVATE_KEY_RAW);
      
      // 3. Crear autenticación
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: SERVICE_EMAIL,
          private_key: formattedKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      // 4. Crear cliente de Sheets
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.spreadsheetId = SHEET_ID;
      this.initialized = true;
      
      console.log('✅ Google Sheets Service inicializado');
    } catch (error) {
      console.error('❌ Error en inicialización:', error.message);
      throw error;
    }
  }

  // Función para formatear clave (CRÍTICO para Vercel)
  formatPrivateKey(rawKey) {
    if (!rawKey) return '';
    
    let key = rawKey;
    
    // 1. Remover comillas si existen
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.substring(1, key.length - 1);
    }
    
    // 2. Remover espacios
    key = key.trim();
    
    // 3. Detectar si ya tiene \n escapados (formato Vercel)
    if (key.includes('\\n')) {
      // Convertir \n a saltos reales
      key = key.replace(/\\n/g, '\n');
      console.log('✅ Clave con \\n escapados convertida');
    } else if (key.includes('\n')) {
      // Ya tiene saltos reales (puede ser de local o Vercel mal configurado)
      console.log('⚠️ Clave con saltos reales - asegúrate que en Vercel use \\n');
    }
    
    // 4. Verificar formato
    if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Formato de clave inválido: falta BEGIN PRIVATE KEY');
    }
    
    // 5. Asegurar que termina con salto de línea
    if (!key.endsWith('\n')) {
      key += '\n';
    }
    
    return key;
  }

  async testConnection() {
    await this.initialize();
    
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

  async getEmployees() {
    await this.initialize();
    
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
      }).filter(emp => emp.id);

      console.log(`✅ ${employees.length} empleados encontrados`);
      return employees;
    } catch (error) {
      console.error('❌ Error al obtener empleados:', error.message);
      return [];
    }
  }

  async registerAttendance(employee) {
    await this.initialize();
    
    try {
      const now = new Date();
      
      // Formatear fecha y hora
      const date = now.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const time = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const values = [[
        employee.id,
        employee.name,
        employee.department || '',
        date,
        time,
        'entrada'
      ]];

      console.log('📝 Registrando asistencia...');
      console.log('📋 Datos:', values[0]);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistencias!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values }
      });

      console.log('✅ Asistencia registrada!');
      
      return {
        success: true,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        date,
        time,
        updatedCells: response.data.updates?.updatedCells || 0
      };
    } catch (error) {
      console.error('❌ Error al registrar asistencia:', error.message);
      throw new Error(`No se pudo registrar: ${error.message}`);
    }
  }

  async getAttendanceRecords(options = {}) {
    await this.initialize();
    
    try {
      console.log('📊 Obteniendo registros...');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistencias!A:F',
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        return [];
      }
      
      // Saltar encabezado
      const startRow = rows[0][0] === 'ID' ? 1 : 0;
      
      let records = rows.slice(startRow).map(row => ({
        employeeId: row[0]?.toString().trim() || '',
        employeeName: row[1]?.toString().trim() || '',
        department: row[2]?.toString().trim() || '',
        date: row[3]?.toString().trim() || '',
        time: row[4]?.toString().trim() || '',
        type: row[5]?.toString().trim() || 'entrada'
      }));

      // Aplicar filtros
      if (options.date) {
        records = records.filter(record => record.date === options.date);
      }
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        records = records.filter(record =>
          record.employeeId.toLowerCase().includes(searchTerm) ||
          record.employeeName.toLowerCase().includes(searchTerm) ||
          record.department.toLowerCase().includes(searchTerm)
        );
      }

      return records;
    } catch (error) {
      console.error('❌ Error al obtener asistencias:', error.message);
      return [];
    }
  }
}

// Exportar instancia (NO inicializar aquí)
export const googleSheets = new GoogleSheetsService();
require('dotenv').config({ path: '.env.local' });
const { googleSheets } = require('../../lib/googleSheets.js');

async function test() {
  try {
    console.log('🔍 Probando conexión con Google Sheets...');
    console.log('📄 ID de hoja:', process.env.GOOGLE_SHEETS_ID);
    console.log('📧 Email cuenta servicio:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    
    const connection = await googleSheets.testConnection();
    console.log('✅ Resultado:', connection);
    
    const employees = await googleSheets.getEmployees();
    console.log('👥 Empleados encontrados:', employees.length);
    
    const stats = await googleSheets.getStatistics();
    console.log('📊 Estadísticas:', stats);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
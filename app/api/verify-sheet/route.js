import { google } from 'googleapis';

export async function GET() {
  try {
    console.log('=== VERIFICACIÓN DIRECTA DEL SHEET ===');
    
    // 1. Preparar autenticación
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ],
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    const sheetId = process.env.GOOGLE_SHEET_ID;
    
    // 2. Verificar acceso con Drive API (más detallado)
    console.log('Verificando permisos con Drive API...');
    try {
      const driveResponse = await drive.files.get({
        fileId: sheetId,
        fields: 'id,name,permissions,owners'
      });
      
      console.log('✅ Archivo encontrado:', driveResponse.data.name);
      
      // Verificar si nuestra cuenta de servicio tiene permisos
      const permissions = await drive.permissions.list({
        fileId: sheetId,
        fields: 'permissions(emailAddress,role)'
      });
      
      const hasAccess = permissions.data.permissions?.some(p => 
        p.emailAddress === process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      );
      
      if (!hasAccess) {
        return Response.json({
          success: false,
          error: 'NO TIENES ACCESO',
          message: `La cuenta de servicio ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL} NO tiene acceso a este Sheet`,
          instructions: `Comparte el Sheet con ese email como EDITOR`,
          sheetInfo: {
            name: driveResponse.data.name,
            id: driveResponse.data.id
          }
        }, { status: 403 });
      }
      
      console.log('✅ Permisos verificados');
      
    } catch (driveError) {
      console.error('Error Drive API:', driveError.message);
      
      if (driveError.code === 404) {
        return Response.json({
          success: false,
          error: 'SHEET NO ENCONTRADO',
          message: 'El Sheet ID no existe o es incorrecto',
          currentSheetId: sheetId,
          suggestion: 'Verifica que el Sheet ID sea correcto'
        }, { status: 404 });
      }
      
      if (driveError.code === 403) {
        return Response.json({
          success: false,
          error: 'PERMISO DENEGADO',
          message: 'No tienes permisos para acceder a este Sheet',
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          actionRequired: `Comparte el Sheet con: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`
        }, { status: 403 });
      }
    }

    // 3. Probar acceso con Sheets API
    console.log('Probando acceso con Sheets API...');
    try {
      const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'properties.title,sheets.properties'
      });
      
      console.log('✅ Sheets API acceso exitoso');
      
      // Intentar escribir algo
      const testData = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Test!A1',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[
            'Test Connection',
            new Date().toISOString(),
            'OK'
          ]],
        },
      });
      
      console.log('✅ Escritura exitosa');
      
      // Limpiar test
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'Test!A1:C100'
      });
      
      return Response.json({
        success: true,
        message: '✅ CONEXIÓN COMPLETAMENTE EXITOSA',
        sheetInfo: {
          title: sheetsResponse.data.properties.title,
          sheets: sheetsResponse.data.sheets.map(s => s.properties.title),
          testWrite: 'OK'
        },
        permissions: {
          hasAccess: true,
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        }
      });
      
    } catch (sheetsError) {
      console.error('Error Sheets API:', sheetsError.message);
      
      return Response.json({
        success: false,
        error: 'SHEETS API ERROR',
        message: sheetsError.message,
        code: sheetsError.code,
        suggestion: 'Revisa que la cuenta de servicio tenga permisos de escritura'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error general:', error);
    
    return Response.json({
      success: false,
      error: 'ERROR DE CONEXIÓN',
      message: error.message,
      stack: error.stack,
      envCheck: {
        hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasSheetId: !!process.env.GOOGLE_SHEET_ID,
        serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        sheetId: process.env.GOOGLE_SHEET_ID
      }
    }, { status: 500 });
  }
}
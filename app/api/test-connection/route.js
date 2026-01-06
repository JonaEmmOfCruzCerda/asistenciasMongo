import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/googleSheets';

export async function GET() {
  try {
    const connection = await googleSheets.testConnection();
    return NextResponse.json(connection);
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error.message,
      message: 'Error de conexión'
    }, { status: 500 });
  }
}
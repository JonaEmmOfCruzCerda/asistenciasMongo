import { NextResponse } from 'next/server';
import { conectarDB } from '@/lib/mongoose';
import Asistencia from '@/app/models/Asistencia';

export async function GET(solicitud) {
  const { searchParams } = new URL(solicitud.url);
  const numero_empleado = searchParams.get('numero_empleado');

  if (!numero_empleado) {
    return NextResponse.json(
      { error: 'Número de empleado requerido' },
      { status: 400 }
    );
  }

  try {
    await conectarDB();

    console.log('🔍 Verificando asistencia para empleado:', numero_empleado);

    // Verificar asistencia reciente
    const verificacion = await Asistencia.verificarAsistenciaReciente(numero_empleado);
    
    const ahora = new Date();
    let horas_restantes = 0;
    
    if (verificacion.ultimaAsistencia) {
      const horas_transcurridas = (ahora.getTime() - verificacion.ultimaAsistencia.marca_tiempo.getTime()) / (1000 * 60 * 60);
      horas_restantes = Math.max(0, 20 - horas_transcurridas).toFixed(2);
    }

    return NextResponse.json({
      tiene_asistencia_reciente: verificacion.tieneAsistenciaReciente,
      ultima_asistencia: verificacion.ultimaAsistencia?.marca_tiempo || null,
      proximo_registro_permitido: verificacion.proximoRegistroPermitido,
      horas_restantes: horas_restantes,
      detalles: {
        ultimo_registro: verificacion.ultimaAsistencia?.marca_tiempo?.toLocaleString('es-MX') || null,
        proximo_registro: verificacion.proximoRegistroPermitido?.toLocaleString('es-MX') || null,
        horas_pasadas: verificacion.ultimaAsistencia 
          ? ((ahora.getTime() - verificacion.ultimaAsistencia.marca_tiempo.getTime()) / (1000 * 60 * 60)).toFixed(2)
          : null,
        horas_necesarias: horas_restantes
      }
    });

  } catch (error) {
    console.error('❌ Error verificando asistencia:', error);
    return NextResponse.json({ 
      error: 'Error verificando asistencia: ' + error.message,
      tiene_asistencia_reciente: false,
      ultima_asistencia: null,
      proximo_registro_permitido: null,
      horas_restantes: 0
    }, { status: 500 });
  }
}
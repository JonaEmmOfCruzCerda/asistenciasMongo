// scripts/migrarObservaciones.js
import { conectarDB } from '@/lib/mongoose';
import Observacion from '@/app/models/Observacion';

async function migrarObservaciones() {
  try {
    await conectarDB();
    
    const observaciones = await Observacion.find({});
    console.log(`Encontradas ${observaciones.length} observaciones para migrar`);
    
    let actualizadas = 0;
    
    for (const obs of observaciones) {
      // Si no tiene fecha, crear una basada en el campo date
      if (!obs.fecha) {
        const fechaObj = new Date(obs.date);
        const dia = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getFullYear();
        obs.fecha = `${dia}/${mes}/${año}`;
        await obs.save();
        actualizadas++;
      }
    }
    
    console.log(`Migración completada: ${actualizadas} observaciones actualizadas`);
    
  } catch (error) {
    console.error('Error en migración:', error);
  }
}

migrarObservaciones();
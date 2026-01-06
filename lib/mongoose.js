import mongoose from 'mongoose';

const URI_MONGODB = process.env.URI_MONGODB;

if (!URI_MONGODB) {
  throw new Error('Por favor define la variable URI_MONGODB en .env');
}

let cache = global.mongoose;

if (!cache) {
  cache = global.mongoose = { conexion: null, promesa: null };
}

export async function conectarDB() {
  if (cache.conexion) {
    return cache.conexion;
  }

  if (!cache.promesa) {
    const opciones = {
      bufferCommands: false,
    };

    cache.promesa = mongoose.connect(URI_MONGODB, opciones).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cache.conexion = await cache.promesa;
  } catch (e) {
    cache.promesa = null;
    throw e;
  }

  return cache.conexion;
}
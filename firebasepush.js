// 1. Importamos la función de inicialización principal
const { initializeApp } = require('firebase-admin/app');

// 2. Importamos la fábrica de credenciales explícita de su submódulo
const { cert } = require('firebase-admin/app'); 

// 3. Importamos la mensajería
const { getMessaging } = require('firebase-admin/messaging');

// 4. Cargamos tu archivo JSON (protegido una carpeta arriba)
const serviceAccount = require('../firebase-account.json');

// 5. Inicializamos de forma segura e inequívoca
initializeApp({
  credential: cert(serviceAccount)
});

/**
 * OPCIÓN A: Enviar notificación masiva a TODOS los dispositivos
 * Para esto, los dispositivos deben estar suscritos a un "tema" (ej: 'todos').
 */
async function enviarNotificacionMasiva(publicacion) {

  // console.log(publicacion);

  const payload = {
    topic: 'todos', // Nombre del tema masivo
    notification: {
      title: publicacion.categoria,
      body: publicacion.titulo,
      imageUrl: publicacion.imagen
    },
    // Opcional: Datos ocultos que tu app de Angular puede leer en segundo plano
    data: {
        titulo: publicacion.titulo,
        contenido: publicacion.contenido,
        link: publicacion.link,
        imagen: publicacion.imagen,
        categoria: publicacion.categoria,
        date: publicacion.date,
        timestamp: publicacion.timestamp.toString(),
        click_action: 'FLUTTER_NOTIFICATION_CLICK' // Requerido en algunas versiones de Android
    }
  };

  try {
    const response = await getMessaging().send(payload);
    console.log('Envío masivo exitoso. Mensaje ID:', response);
  } catch (error) {
    console.error('Error en el envío masivo:', error);
  }
}

/**
 * OPCIÓN B: Enviar notificación a un solo dispositivo específico
 * Requiere el FCM Token individual que guardaste en tu base de datos.
 */
async function enviarNotificacionIndividual(fcmToken, titulo, mensaje) {
  const payload = {
    token: fcmToken,
    notification: {
      title: titulo,
      body: mensaje
    }
  };

  try {
    const response = await getMessaging().send(payload);
    console.log('Envío individual exitoso:', response);
  } catch (error) {
    console.error('Error enviando al token:', error);
  }
}

// === EJEMPLO DE USO ===
// Descomenta la línea que quieras probar ejecutando: node index.js

// enviarNotificacionMasiva('¡Atención RepublicApp!', 'Este es un mensaje masivo desde Node.js');

// const tokenDePrueba = 'PEGAR_AQUI_EL_TOKEN_LARGO_DEL_DISPOSITIVO';
// enviarNotificacionIndividual(tokenDePrueba, 'Hola Individual', 'Este mensaje es solo para ti');
module.exports = {
  enviarNotificacionMasiva
};
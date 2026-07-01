const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const enviarNotificacion = async (pushToken, titulo, cuerpo, data = {}) => {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.log('❌ Token inválido:', pushToken);
        return false;
    }

    const messages = [{
        to: pushToken,
        sound: 'default',
        title: titulo,
        body: cuerpo,
        data: data,
        priority: 'high',
    }];

    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            const receipts = await expo.sendPushNotificationsAsync(chunk);
            console.log('📨 Notificación enviada:', receipts);
        }
        return true;
    } catch (error) {
        console.error('❌ Error al enviar notificación:', error);
        return false;
    }
};

const enviarNotificacionesMultiples = async (tokens, titulo, cuerpo, data = {}) => {
    if (!tokens || tokens.length === 0) {
        console.log('⚠️ No hay tokens para enviar notificaciones');
        return;
    }

    const messages = tokens
        .filter(token => Expo.isExpoPushToken(token))
        .map(token => ({
            to: token,
            sound: 'default',
            title: titulo,
            body: cuerpo,
            data: data,
            priority: 'high',
        }));

    if (messages.length === 0) {
        console.log('⚠️ No hay tokens válidos para enviar notificaciones');
        return;
    }

    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            const receipts = await expo.sendPushNotificationsAsync(chunk);
            console.log(`📨 ${receipts.length} notificaciones enviadas`);
        }
    } catch (error) {
        console.error('❌ Error al enviar notificaciones múltiples:', error);
    }
};

const obtenerTokenTecnico = async (pool, tecnicoId) => {
    try {
        const result = await pool.query(
            'SELECT token FROM push_tokens WHERE tecnico_id = $1',
            [tecnicoId]
        );
        return result.rows.length > 0 ? result.rows[0].token : null;
    } catch (error) {
        console.error('❌ Error al obtener token del técnico:', error);
        return null;
    }
};

const obtenerTokensSupervisores = async (pool, tecnicoId) => {
    try {
        const result = await pool.query(
            `SELECT pt.token, t.nombre, t.id, t.rol
             FROM push_tokens pt
             JOIN tecnicos t ON pt.tecnico_id = t.id
             WHERE t.rol IN ('jefe', 'admin') AND t.id != $1`,
            [tecnicoId]
        );
        return result.rows;
    } catch (error) {
        console.error('❌ Error al obtener tokens de supervisores:', error);
        return [];
    }
};

const obtenerTodosLosTokens = async (pool) => {
    try {
        const result = await pool.query(
            `SELECT pt.token, t.id, t.nombre, t.rol
             FROM push_tokens pt
             JOIN tecnicos t ON pt.tecnico_id = t.id`
        );
        return result.rows;
    } catch (error) {
        console.error('❌ Error al obtener todos los tokens:', error);
        return [];
    }
};

module.exports = {
    enviarNotificacion,
    enviarNotificacionesMultiples,
    obtenerTokenTecnico,
    obtenerTokensSupervisores,
    obtenerTodosLosTokens
};

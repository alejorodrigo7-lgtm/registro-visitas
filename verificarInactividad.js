const { Pool } = require('pg');
const { enviarNotificacionesMultiples } = require('./backend/services/notificaciones');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ============================================================
// FUNCIÓN PRINCIPAL DE VERIFICACIÓN
// ============================================================
const verificarInactividad = async () => {
    console.log(`🔍 Verificando inactividad - ${new Date().toLocaleString()}`);

    const now = new Date();
    const horaActual = now.toTimeString().slice(0, 5);
    const fechaActual = now.toISOString().slice(0, 10);

    try {
        // ============================================================
        // 1. OBTENER TODOS LOS HORARIOS ACTIVOS
        // ============================================================
        const horarios = await pool.query(
            `SELECT h.*, 
                    t.nombre as tecnico_nombre, 
                    t.email as tecnico_email,
                    t.id as tecnico_id,
                    t.rol as tecnico_rol
             FROM horarios_trabajo h
             JOIN tecnicos t ON h.tecnico_id = t.id
             WHERE h.activo = TRUE`
        );

        console.log(`📋 ${horarios.rows.length} horarios activos encontrados`);

        if (horarios.rows.length === 0) {
            console.log('ℹ️ No hay horarios configurados. Nada que verificar.');
            return;
        }

        // ============================================================
        // 2. VERIFICAR CADA TÉCNICO/COORDINADOR
        // ============================================================
        for (const h of horarios.rows) {
            console.log(`\n🔍 Verificando: ${h.tecnico_nombre} (ID: ${h.tecnico_id}, Rol: ${h.tecnico_rol})`);

            // ============================================================
            // 2.1 VERIFICAR SI ESTÁ EN HORARIO LABORAL
            // ============================================================
            const estaEnHorario = horaActual >= h.hora_entrada && horaActual <= h.hora_salida;

            if (!estaEnHorario) {
                console.log(`⏰ ${h.tecnico_nombre} no está en horario laboral (${h.hora_entrada} - ${h.hora_salida}). Saltando.`);
                continue;
            }

            console.log(`✅ ${h.tecnico_nombre} está en horario laboral (${h.hora_entrada} - ${h.hora_salida})`);

            // ============================================================
            // 2.2 VERIFICAR SI ESTÁ EN DESCANSO
            // ============================================================
            if (h.hora_descanso_inicio && h.hora_descanso_fin) {
                const estaEnDescanso = horaActual >= h.hora_descanso_inicio && horaActual <= h.hora_descanso_fin;
                if (estaEnDescanso) {
                    console.log(`☕ ${h.tecnico_nombre} está en descanso (${h.hora_descanso_inicio} - ${h.hora_descanso_fin}). Saltando.`);
                    continue;
                }
            }

            // ============================================================
            // 2.3 VERIFICAR ÚLTIMA VISITA REGISTRADA
            // ============================================================
            const ultimaVisita = await pool.query(
                `SELECT MAX(fecha_inicio) as ultima 
                 FROM visitas 
                 WHERE tecnico_id = $1 AND DATE(fecha_inicio) = $2`,
                [h.tecnico_id, fechaActual]
            );

            const ultima = ultimaVisita.rows[0].ultima;
            const tiempoLimite = new Date(Date.now() - (h.tiempo_alerta_minutos * 60 * 1000));

            console.log(`📊 Última visita: ${ultima || 'Ninguna'}`);
            console.log(`⏱️ Tiempo de alerta: ${h.tiempo_alerta_minutos} minutos`);
            console.log(`⏰ Límite: ${tiempoLimite.toLocaleTimeString()}`);

            // ============================================================
            // 2.4 VERIFICAR SI DEBE GENERAR ALERTA
            // ============================================================
            let debeAlertar = false;
            let mensajeParaTecnico = '';
            let mensajeParaSupervisor = '';
            let minutosSinVisita = 0;

            if (!ultima) {
                debeAlertar = true;
                mensajeParaTecnico = `⚠️ Usted no ha registrado ninguna visita hoy.`;
                mensajeParaSupervisor = `⚠️ El ${h.tecnico_rol} ${h.tecnico_nombre} no ha registrado ninguna visita hoy.`;
                console.log(`⚠️ ${h.tecnico_nombre} no tiene visitas hoy.`);
            } else if (new Date(ultima) < tiempoLimite) {
                debeAlertar = true;
                minutosSinVisita = Math.floor((Date.now() - new Date(ultima).getTime()) / 60000);
                mensajeParaTecnico = `⏰ Usted no ha registrado una visita o tarea en los últimos ${minutosSinVisita} minutos (límite: ${h.tiempo_alerta_minutos} min).`;
                mensajeParaSupervisor = `⏰ El ${h.tecnico_rol} ${h.tecnico_nombre} no ha registrado visitas en los últimos ${minutosSinVisita} minutos (límite: ${h.tiempo_alerta_minutos} min).`;
                console.log(`⚠️ ${h.tecnico_nombre} lleva ${minutosSinVisita} minutos sin registrar.`);
            } else {
                console.log(`✅ ${h.tecnico_nombre} ha registrado visitas recientemente. Todo en orden.`);
            }

            // ============================================================
            // 2.5 CREAR ALERTA Y ENVIAR NOTIFICACIONES
            // ============================================================
            if (debeAlertar) {
                // Verificar si ya existe una alerta similar en los últimos 5 minutos
                const alertaExistente = await pool.query(
                    `SELECT id FROM alertas 
                     WHERE tecnico_id = $1 
                     AND tipo = 'inactividad' 
                     AND leido = FALSE 
                     AND created_at > NOW() - INTERVAL '5 minutes'`,
                    [h.tecnico_id]
                );

                if (alertaExistente.rows.length > 0) {
                    console.log(`⏳ Ya existe una alerta reciente para ${h.tecnico_nombre}. Saltando.`);
                    continue;
                }

                // --- Guardar alerta en la base de datos (para el técnico) ---
                await pool.query(
                    `INSERT INTO alertas (tecnico_id, jefe_id, tipo, mensaje)
                     VALUES ($1, $1, 'inactividad', $2)`,
                    [h.tecnico_id, mensajeParaTecnico]
                );

                // --- Guardar alerta para supervisores ---
                const supervisores = await pool.query(
                    `SELECT id, nombre FROM tecnicos WHERE rol IN ('jefe', 'admin') AND id != $1`,
                    [h.tecnico_id]
                );

                for (const supervisor of supervisores.rows) {
                    await pool.query(
                        `INSERT INTO alertas (tecnico_id, jefe_id, tipo, mensaje)
                         VALUES ($1, $2, 'inactividad', $3)`,
                        [h.tecnico_id, supervisor.id, mensajeParaSupervisor]
                    );
                }

                console.log(`✅ Alertas guardadas en BD para ${h.tecnico_nombre}`);

                // ============================================================
                // 2.6 ENVIAR NOTIFICACIONES PUSH
                // ============================================================
                try {
                    // Obtener token del técnico
                    const tokenTecnico = await pool.query(
                        'SELECT token FROM push_tokens WHERE tecnico_id = $1',
                        [h.tecnico_id]
                    );

                    // Obtener tokens de supervisores
                    const tokensSupervisores = await pool.query(
                        `SELECT pt.token, t.nombre
                         FROM push_tokens pt
                         JOIN tecnicos t ON pt.tecnico_id = t.id
                         WHERE t.rol IN ('jefe', 'admin') AND t.id != $1`,
                        [h.tecnico_id]
                    );

                    // Enviar notificación al técnico
                    if (tokenTecnico.rows.length > 0) {
                        await enviarNotificacionesMultiples(
                            [tokenTecnico.rows[0].token],
                            '⏰ Alerta de inactividad',
                            mensajeParaTecnico,
                            { type: 'inactividad', tecnico_id: h.tecnico_id }
                        );
                        console.log(`📨 Notificación enviada al técnico ${h.tecnico_nombre}`);
                    }

                    // Enviar notificación a supervisores
                    if (tokensSupervisores.rows.length > 0) {
                        const tokens = tokensSupervisores.rows.map(t => t.token);
                        await enviarNotificacionesMultiples(
                            tokens,
                            '🚨 Alerta de inactividad',
                            mensajeParaSupervisor,
                            { type: 'inactividad', tecnico_id: h.tecnico_id }
                        );
                        console.log(`📨 Notificación enviada a ${tokensSupervisores.rows.length} supervisores`);
                    }

                } catch (error) {
                    console.error('❌ Error al enviar notificaciones push:', error);
                }
            }
        }

        console.log(`\n✅ Verificación completada - ${new Date().toLocaleString()}`);

    } catch (error) {
        console.error('❌ Error en verificación de inactividad:', error);
        console.error('Stack trace:', error.stack);
    }
};

// ============================================================
// 3. EJECUTAR PERIÓDICAMENTE
// ============================================================
const INTERVALO_MS = 60000; // 1 minuto

console.log(`🚀 Iniciando servicio de verificación de inactividad`);
console.log(`⏱️  Intervalo: ${INTERVALO_MS / 1000} segundos`);

// Ejecutar inmediatamente al iniciar
verificarInactividad();

// Programar ejecuciones periódicas
setInterval(verificarInactividad, INTERVALO_MS);

// ============================================================
// 4. MANEJO DE CIERRE GRACIAL
// ============================================================
process.on('SIGTERM', async () => {
    console.log('🛑 Recibida señal SIGTERM. Cerrando conexiones...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Recibida señal SIGINT. Cerrando conexiones...');
    await pool.end();
    process.exit(0);
});

module.exports = { verificarInactividad };

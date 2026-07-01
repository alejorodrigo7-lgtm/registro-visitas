const express = require('express');
const router = express.Router();

// ============================================================
// 1. OBTENER ALERTAS DE UN USUARIO
// ============================================================
router.get('/', async (req, res) => {
    const pool = req.pool;
    const { tecnico_id } = req.query;

    if (!tecnico_id) {
        return res.status(400).json({ error: 'Falta tecnico_id' });
    }

    try {
        const result = await pool.query(
            `SELECT a.*, 
                    t.nombre as tecnico_nombre,
                    j.nombre as jefe_nombre
             FROM alertas a
             LEFT JOIN tecnicos t ON a.tecnico_id = t.id
             LEFT JOIN tecnicos j ON a.jefe_id = j.id
             WHERE a.tecnico_id = $1 OR a.jefe_id = $1
             ORDER BY a.created_at DESC`,
            [tecnico_id]
        );
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener alertas:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// ============================================================
// 2. MARCAR ALERTA COMO LEÍDA
// ============================================================
router.put('/:id/leer', async (req, res) => {
    const pool = req.pool;
    const { id } = req.params;

    try {
        const result = await pool.query(
            'UPDATE alertas SET leido = TRUE WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }

        res.json({ success: true, alerta: result.rows[0] });

    } catch (error) {
        console.error('❌ Error al marcar alerta:', error);
        res.status(500).json({ error: 'Error al marcar alerta' });
    }
});

// ============================================================
// 3. CREAR ALERTA MANUAL (para pruebas)
// ============================================================
router.post('/', async (req, res) => {
    const pool = req.pool;
    const { tecnico_id, jefe_id, tipo, mensaje } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO alertas (tecnico_id, jefe_id, tipo, mensaje)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [tecnico_id, jefe_id, tipo || 'manual', mensaje]
        );

        res.status(201).json({ success: true, alerta: result.rows[0] });

    } catch (error) {
        console.error('❌ Error al crear alerta:', error);
        res.status(500).json({ error: 'Error al crear alerta' });
    }
});

// ============================================================
// 4. OBTENER CONFIGURACIONES DE HORARIOS (para Alertas)
// ============================================================
router.get('/configuraciones', async (req, res) => {
    const pool = req.pool;
    try {
        const result = await pool.query(
            `SELECT 
                h.id,
                h.tecnico_id,
                t.nombre as tecnico_nombre,
                t.email as tecnico_email,
                h.tipo_usuario,
                h.hora_entrada,
                h.hora_salida,
                h.hora_descanso_inicio,
                h.hora_descanso_fin,
                h.tiempo_alerta_minutos,
                h.activo,
                h.created_at,
                h.updated_at
             FROM horarios_trabajo h
             JOIN tecnicos t ON h.tecnico_id = t.id
             ORDER BY h.tipo_usuario, t.nombre`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener configuraciones:', error);
        res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
});

// ============================================================
// 5. ACTUALIZAR CONFIGURACIÓN COMPLETA (PUT)
// ============================================================
router.put('/configuracion/:id', async (req, res) => {
    const pool = req.pool;
    const { id } = req.params;
    const { 
        hora_entrada, 
        hora_salida, 
        hora_descanso_inicio, 
        hora_descanso_fin, 
        tiempo_inactividad, 
        activo 
    } = req.body;

    // Validación básica
    if (!hora_entrada || !hora_salida) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (hora_entrada, hora_salida)' });
    }

    try {
        // Verificar que la configuración exista
        const existe = await pool.query(
            'SELECT id FROM horarios_trabajo WHERE id = $1',
            [id]
        );
        if (existe.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }

        // Actualizar todos los campos
        await pool.query(
            `UPDATE horarios_trabajo 
             SET 
                hora_entrada = $1, 
                hora_salida = $2, 
                hora_descanso_inicio = $3, 
                hora_descanso_fin = $4, 
                tiempo_alerta_minutos = $5, 
                activo = $6,
                updated_at = NOW()
             WHERE id = $7`,
            [hora_entrada, hora_salida, hora_descanso_inicio, hora_descanso_fin, tiempo_inactividad, activo, id]
        );

        // Obtener la configuración actualizada
        const result = await pool.query(
            `SELECT 
                h.id,
                h.tecnico_id,
                t.nombre as tecnico_nombre,
                t.email as tecnico_email,
                h.tipo_usuario,
                h.hora_entrada,
                h.hora_salida,
                h.hora_descanso_inicio,
                h.hora_descanso_fin,
                h.tiempo_alerta_minutos,
                h.activo,
                h.created_at,
                h.updated_at
             FROM horarios_trabajo h
             JOIN tecnicos t ON h.tecnico_id = t.id
             WHERE h.id = $1`,
            [id]
        );

        res.json({ 
            success: true, 
            message: 'Configuración actualizada correctamente',
            configuracion: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error al actualizar configuración:', error);
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});

// ============================================================
// 6. ELIMINAR CONFIGURACIÓN (DELETE) - Opcional
// ============================================================
router.delete('/configuracion/:id', async (req, res) => {
    const pool = req.pool;
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM horarios_trabajo WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }

        res.json({ success: true, message: 'Configuración eliminada correctamente' });

    } catch (error) {
        console.error('❌ Error al eliminar configuración:', error);
        res.status(500).json({ error: 'Error al eliminar configuración' });
    }
});

module.exports = router;

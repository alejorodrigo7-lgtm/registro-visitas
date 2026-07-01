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
// 5. ACTUALIZAR CONFIGURACIÓN DE ALERTA
// ============================================================
router.put('/configuracion/:id', async (req, res) => {
    const pool = req.pool;
    const { id } = req.params;
    const { tiempo_inactividad, activo } = req.body;

    try {
        await pool.query(
            `UPDATE horarios_trabajo 
             SET tiempo_alerta_minutos = $1, activo = $2, updated_at = NOW()
             WHERE id = $3`,
            [tiempo_inactividad, activo, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al actualizar configuración:', error);
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});

module.exports = router;

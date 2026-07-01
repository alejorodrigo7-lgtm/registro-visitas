const express = require('express');
const router = express.Router();

// ============================================================
// 1. CONFIGURAR HORARIO DE TRABAJO (Admin/Jefe)
// ============================================================
router.post('/configurar', async (req, res) => {
    const pool = req.pool;
    const {
        tecnico_id,
        hora_entrada,
        hora_salida,
        hora_descanso_inicio,
        hora_descanso_fin,
        tiempo_alerta_minutos,
        activo
    } = req.body;

    // Validaciones básicas
    if (!tecnico_id || !hora_entrada || !hora_salida) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        // Verificar que el técnico exista
        const tecnicoExiste = await pool.query(
            'SELECT id FROM tecnicos WHERE id = $1',
            [tecnico_id]
        );
        if (tecnicoExiste.rows.length === 0) {
            return res.status(404).json({ error: 'Técnico no encontrado' });
        }

        // Insertar o actualizar horario
        await pool.query(
            `INSERT INTO horarios_trabajo 
             (tecnico_id, hora_entrada, hora_salida, hora_descanso_inicio, hora_descanso_fin, tiempo_alerta_minutos, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tecnico_id) DO UPDATE SET
             hora_entrada = EXCLUDED.hora_entrada,
             hora_salida = EXCLUDED.hora_salida,
             hora_descanso_inicio = EXCLUDED.hora_descanso_inicio,
             hora_descanso_fin = EXCLUDED.hora_descanso_fin,
             tiempo_alerta_minutos = EXCLUDED.tiempo_alerta_minutos,
             activo = EXCLUDED.activo,
             updated_at = NOW()`,
            [tecnico_id, hora_entrada, hora_salida, hora_descanso_inicio, hora_descanso_fin, tiempo_alerta_minutos, activo]
        );

        res.json({ success: true, message: 'Horario configurado correctamente' });

    } catch (error) {
        console.error('❌ Error al configurar horario:', error);
        res.status(500).json({ error: 'Error al configurar horario' });
    }
});

// ============================================================
// 2. OBTENER HORARIO DE UN TÉCNICO
// ============================================================
router.get('/:tecnico_id', async (req, res) => {
    const pool = req.pool;
    const { tecnico_id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM horarios_trabajo WHERE tecnico_id = $1',
            [tecnico_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay horario configurado' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('❌ Error al obtener horario:', error);
        res.status(500).json({ error: 'Error al obtener horario' });
    }
});

// ============================================================
// 3. OBTENER TODOS LOS HORARIOS (Admin/Jefe)
// ============================================================
router.get('/', async (req, res) => {
    const pool = req.pool;

    try {
        const result = await pool.query(
            `SELECT h.*, t.nombre as tecnico_nombre 
             FROM horarios_trabajo h
             JOIN tecnicos t ON h.tecnico_id = t.id
             ORDER BY t.nombre`
        );
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener horarios:', error);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
});

module.exports = router;

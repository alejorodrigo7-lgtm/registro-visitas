const express = require('express');
const router = express.Router();

const verificarToken = (req, res, next) => {
    next();
};

router.post('/iniciar', verificarToken, async (req, res) => {
    const pool = req.pool;
    const {
        tecnico_id,
        usuario_id,
        servicio_id,
        latitud,
        longitud,
        direccion,
        actividades,
        novedades,
        fotos
    } = req.body;

    if (!tecnico_id || !usuario_id || !servicio_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {

        const result = await pool.query(
            `INSERT INTO visitas (tecnico_id, usuario_id, servicio_id, latitud_registro, longitud_registro, direccion_texto)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [tecnico_id, usuario_id, servicio_id, latitud, longitud, direccion]
        );
        const visitaId = result.rows[0].id;

        if (actividades && Array.isArray(actividades)) {
            for (let act of actividades) {
                if (act.descripcion) {
                    await pool.query(
                        `INSERT INTO actividades (visita_id, descripcion, tiempo_empleado) VALUES ($1, $2, $3)`,
                        [visitaId, act.descripcion, act.tiempo || 0]
                    );
                }
            }
        }

        // Novedades
        if (novedades && novedades.descripcion) {
            await pool.query(
                `INSERT INTO novedades (visita_id, tipo, descripcion) VALUES ($1, $2, $3)`,
                [visitaId, novedades.tipo || 'General', novedades.descripcion]
            );
        }

        if (fotos && Array.isArray(fotos)) {
            for (let base64 of fotos) {
                await pool.query(
                    `INSERT INTO fotos (visita_id, url) VALUES ($1, $2)`,
                    [visitaId, `data:image/jpeg;base64,${base64.substring(0, 50)}...`]
                );
            }
        }

        res.status(201).json({ success: true, visita_id: visitaId, message: 'Visita registrada' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar la visita' });
    }
});

router.get('/tecnico/:id', verificarToken, async (req, res) => {
    const pool = req.pool;
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT v.*, u.nombre as usuario_nombre, s.nombre as servicio_nombre 
             FROM visitas v 
             JOIN usuarios u ON v.usuario_id = u.id 
             JOIN servicios s ON v.servicio_id = s.id 
             WHERE v.tecnico_id = $1 
             ORDER BY v.fecha_inicio DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener visitas' });
    }
});

router.get('/usuarios', verificarToken, async (req, res) => {
    const pool = req.pool;
    try {
        const result = await pool.query('SELECT id, nombre, direccion, telefono FROM usuarios ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

router.get('/servicios', verificarToken, async (req, res) => {
    const pool = req.pool;
    try {
        const result = await pool.query('SELECT id, nombre, descripcion FROM servicios ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

module.exports = router;
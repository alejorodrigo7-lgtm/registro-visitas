const express = require('express');
const router = express.Router();

// ============================================================
// 1. IMPORTAR Y CONFIGURAR CLOUDINARY
// ============================================================
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true
});

// ============================================================
// MIDDLEWARE DE VERIFICACIÓN (opcional, para pruebas)
// ============================================================
const verificarToken = (req, res, next) => {
    next();
};

// ============================================================
// RUTA: REGISTRAR UNA VISITA COMPLETA
// ============================================================
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
        // 1. Insertar la visita
        const result = await pool.query(
            `INSERT INTO visitas (tecnico_id, usuario_id, servicio_id, latitud_registro, longitud_registro, direccion_texto)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [tecnico_id, usuario_id, servicio_id, latitud, longitud, direccion]
        );
        const visitaId = result.rows[0].id;

        // 2. Insertar actividades
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

        // 3. Insertar novedades
        if (novedades && novedades.descripcion) {
            await pool.query(
                `INSERT INTO novedades (visita_id, tipo, descripcion) VALUES ($1, $2, $3)`,
                [visitaId, novedades.tipo || 'General', novedades.descripcion]
            );
        }

        // ============================================================
        // 4. SUBIR FOTOS A CLOUDINARY Y GUARDAR URL EN LA BD
        // ============================================================
        if (fotos && Array.isArray(fotos)) {
            for (let base64 of fotos) {
                try {
                    // Subir la imagen a Cloudinary
                    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}`, {
                        folder: 'visitas',
                        resource_type: 'image'
                    });
                    // Guardar la URL segura en la base de datos
                    await pool.query(
                        `INSERT INTO fotos (visita_id, url) VALUES ($1, $2)`,
                        [visitaId, result.secure_url]
                    );
                } catch (err) {
                    console.error('❌ Error subiendo a Cloudinary:', err);
                    // No detenemos el proceso, solo registramos el error
                }
            }
        }

        res.status(201).json({ success: true, visita_id: visitaId, message: 'Visita registrada' });

    } catch (error) {
        console.error('❌ Error al guardar la visita:', error);
        res.status(500).json({ error: 'Error al guardar la visita' });
    }
});

// ============================================================
// RUTA: OBTENER VISITAS DE UN TÉCNICO
// ============================================================
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
        console.error('❌ Error al obtener visitas:', error);
        res.status(500).json({ error: 'Error al obtener visitas' });
    }
});

// ============================================================
// RUTA: OBTENER LISTA DE USUARIOS
// ============================================================
router.get('/usuarios', verificarToken, async (req, res) => {
    const pool = req.pool;
    try {
        const result = await pool.query('SELECT id, nombre, direccion, telefono FROM usuarios ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// ============================================================
// RUTA: OBTENER LISTA DE SERVICIOS
// ============================================================
router.get('/servicios', verificarToken, async (req, res) => {
    const pool = req.pool;
    try {
        const result = await pool.query('SELECT id, nombre, descripcion FROM servicios ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener servicios:', error);
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

module.exports = router;

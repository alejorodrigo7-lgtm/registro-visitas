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
// MIDDLEWARE DE VERIFICACIÓN (opcional)
// ============================================================
const verificarToken = (req, res, next) => {
    next();
};

// ============================================================
// RUTA: REGISTRAR UNA VISITA COMPLETA (con identificador)
// ============================================================
router.post('/iniciar', verificarToken, async (req, res) => {
    const pool = req.pool;
    const {
        tecnico_id,
        identificador,
        servicio_id,
        latitud,
        longitud,
        direccion,
        actividades,
        novedades,
        fotos
    } = req.body;

    if (!tecnico_id || !identificador || !servicio_id) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (técnico, identificador, servicio)' });
    }

    try {
        // 1️⃣ Buscar o crear el usuario por identificador
        let usuario_id;
        const userResult = await pool.query(
            'SELECT id FROM usuarios WHERE identificador = $1',
            [identificador]
        );

        if (userResult.rows.length > 0) {
            usuario_id = userResult.rows[0].id;
        } else {
            const newUser = await pool.query(
                `INSERT INTO usuarios (nombre, identificador, direccion, telefono)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [
                    `Usuario ${identificador}`,
                    identificador,
                    'Dirección pendiente',
                    'Teléfono pendiente'
                ]
            );
            usuario_id = newUser.rows[0].id;
        }

        // 2️⃣ Insertar la visita
        const result = await pool.query(
            `INSERT INTO visitas (tecnico_id, usuario_id, servicio_id, latitud_registro, longitud_registro, direccion_texto)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [tecnico_id, usuario_id, servicio_id, latitud, longitud, direccion]
        );
        const visitaId = result.rows[0].id;

        // 3️⃣ Insertar actividades
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

        // 4️⃣ Insertar novedades
        if (novedades && novedades.descripcion) {
            await pool.query(
                `INSERT INTO novedades (visita_id, tipo, descripcion) VALUES ($1, $2, $3)`,
                [visitaId, novedades.tipo || 'General', novedades.descripcion]
            );
        }

        // 5️⃣ Subir fotos a Cloudinary
        if (fotos && Array.isArray(fotos)) {
            for (let base64 of fotos) {
                try {
                    const resultCloud = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}`, {
                        folder: 'visitas',
                        resource_type: 'image'
                    });
                    await pool.query(
                        `INSERT INTO fotos (visita_id, url) VALUES ($1, $2)`,
                        [visitaId, resultCloud.secure_url]
                    );
                } catch (err) {
                    console.error('❌ Error subiendo a Cloudinary:', err.message);
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

// ============================================================
// RUTA: OBTENER USUARIO POR IDENTIFICADOR (CORREGIDA CON barrio)
// ============================================================
router.get('/usuario/:identificador', verificarToken, async (req, res) => {
    const pool = req.pool;
    const { identificador } = req.params;

    try {
        const result = await pool.query(
            'SELECT id, nombre, barrio, direccion, telefono FROM usuarios WHERE identificador = $1',
            [identificador]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error al buscar usuario:', error);
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ============================================================
// LOGIN (con verificación de cambio de contraseña)
// ============================================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const pool = req.pool;

    try {
        const result = await pool.query(
            'SELECT * FROM tecnicos WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const tecnico = result.rows[0];

        // Verificar contraseña (ahora con bcrypt)
        const passwordValida = await bcrypt.compare(password, tecnico.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token
        const token = jwt.sign(
            { 
                id: tecnico.id, 
                email: tecnico.email, 
                nombre: tecnico.nombre,
                rol: tecnico.rol,
                debe_cambiar_password: tecnico.debe_cambiar_password
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            tecnico: {
                id: tecnico.id,
                nombre: tecnico.nombre,
                email: tecnico.email,
                rol: tecnico.rol,
                debe_cambiar_password: tecnico.debe_cambiar_password
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================
router.post('/cambiar-password', async (req, res) => {
    const { tecnico_id, password_actual, password_nuevo } = req.body;
    const pool = req.pool;

    if (!tecnico_id || !password_actual || !password_nuevo) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    if (password_nuevo.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    try {
        // Obtener el técnico
        const result = await pool.query(
            'SELECT * FROM tecnicos WHERE id = $1',
            [tecnico_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const tecnico = result.rows[0];

        // Verificar contraseña actual
        const passwordValida = await bcrypt.compare(password_actual, tecnico.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Hash de la nueva contraseña
        const saltRounds = 10;
        const nuevoHash = await bcrypt.hash(password_nuevo, saltRounds);

        // Actualizar contraseña y marcar como cambiada
        await pool.query(
            'UPDATE tecnicos SET password_hash = $1, debe_cambiar_password = FALSE WHERE id = $2',
            [nuevoHash, tecnico_id]
        );

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
});

// ============================================================
// CREAR USUARIO (SOLO ADMINISTRADOR)
// ============================================================
router.post('/crear-usuario', async (req, res) => {
    const { nombre, email, password, rol, creador_id } = req.body;
    const pool = req.pool;

    // Validar que el creador sea administrador
    if (!creador_id) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // Verificar que el creador sea administrador
        const creadorResult = await pool.query(
            'SELECT rol FROM tecnicos WHERE id = $1',
            [creador_id]
        );
        
        if (creadorResult.rows.length === 0 || creadorResult.rows[0].rol !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden crear usuarios' });
        }

        // Verificar que el email no exista
        const existe = await pool.query(
            'SELECT id FROM tecnicos WHERE email = $1',
            [email]
        );
        
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Crear usuario
        const result = await pool.query(
            `INSERT INTO tecnicos (nombre, email, password_hash, rol, debe_cambiar_password)
             VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol`,
            [nombre, email, passwordHash, rol, true]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

module.exports = router;

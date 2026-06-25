const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const pool = req.pool;

    try {
        const result = await pool.query('SELECT * FROM tecnicos WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const tecnico = result.rows[0];

        if (tecnico.password_hash !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: tecnico.id, email: tecnico.email, nombre: tecnico.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            tecnico: { id: tecnico.id, nombre: tecnico.nombre, email: tecnico.email }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
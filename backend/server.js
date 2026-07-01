require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// ============================================================
// 1. CONFIGURACIÓN DE LA BASE DE DATOS
// ============================================================
let poolConfig;

if (process.env.DATABASE_URL) {
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    };
} else {
    poolConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
    };
}

const pool = new Pool(poolConfig);

// ============================================================
// 2. INICIALIZAR EXPRESS
// ============================================================
const app = express();
const port = process.env.PORT || 3000;

// ============================================================
// 3. MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// ============================================================
// 4. RUTAS DEL BACKEND
// ============================================================

// Rutas de autenticación (login, cambio de contraseña, crear usuario)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Rutas de visitas (registro, listado, servicios, usuarios)
const visitasRoutes = require('./routes/visitas');
app.use('/api/visitas', visitasRoutes);

// Rutas de horarios de trabajo (configurar, obtener)
const horariosRoutes = require('./routes/horarios');
app.use('/api/horarios', horariosRoutes);

// Rutas de alertas (obtener, marcar como leída, crear)
const alertasRoutes = require('./routes/alertas');
app.use('/api/alertas', alertasRoutes);

// ============================================================
// 5. RUTA DE PRUEBA (PING)
// ============================================================
app.get('/api/ping', (req, res) => {
    res.json({ message: '🏓 Pong! El servidor está funcionando.' });
});

// ============================================================
// 6. INICIAR SERVIDOR
// ============================================================
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});

// ============================================================
// 7. VERIFICAR CONEXIÓN A POSTGRESQL
// ============================================================
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

// ============================================================
// 8. INICIAR VERIFICACIÓN DE INACTIVIDAD (opcional)
// ============================================================
// Si quieres que el script de verificación de inactividad se ejecute
// dentro del mismo proceso, descomenta las líneas siguientes:
/*
if (process.env.NODE_ENV !== 'test') {
    try {
        const { verificarInactividad } = require('./scripts/verificarInactividad');
        // Ejecutar inmediatamente al iniciar
        verificarInactividad();
        // Programar ejecución cada 60 segundos
        setInterval(verificarInactividad, 60000);
        console.log('⏰ Servicio de verificación de inactividad iniciado');
    } catch (error) {
        console.error('❌ Error al iniciar verificación de inactividad:', error.message);
    }
}
*/

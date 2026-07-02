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
// 4. RUTAS
// ============================================================
const authRoutes = require('./routes/auth');
const visitasRoutes = require('./routes/visitas');
const horariosRoutes = require('./routes/horarios');
const alertasRoutes = require('./routes/alertas');

app.use('/api/auth', authRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/alertas', alertasRoutes);

// ============================================================
// 5. RUTA DE PRUEBA
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
// 7. CONEXIÓN A POSTGRESQL
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
// 8. INICIAR VERIFICACIÓN DE INACTIVIDAD
// ============================================================
if (process.env.NODE_ENV !== 'test') {
    try {
        const { verificarInactividad } = require('./verificarInactividad');
        // Ejecutar inmediatamente al iniciar
        verificarInactividad();
        // Programar ejecución cada 60 segundos
        setInterval(verificarInactividad, 60000);
        console.log('⏰ Servicio de verificación de inactividad iniciado');
    } catch (error) {
        console.error('❌ Error al iniciar verificación de inactividad:', error.message);
        console.error('❌ Detalles:', error.stack);
    }
}

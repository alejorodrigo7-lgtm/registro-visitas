// Configuración de conexión a PostgreSQL
let poolConfig;

if (process.env.DATABASE_URL) {
    // Si existe DATABASE_URL (Railway), la usamos directamente
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Railway requiere SSL
        }
    };
} else {
    // Si no, usamos las variables individuales (entorno local)
    poolConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
    };
}

const pool = new Pool(poolConfig);
// Database configuration for TeeTracker Pro
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Variables: cargar solo desde server.js → ./config/env.js (no duplicar dotenv aquí)

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'juanmacv',
    database: process.env.DB_NAME || 'teetracker_pro',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
let pool = null;

/**
 * Initialize database connection pool
 */
async function initializeDatabase() {
    try {
        console.log('🔗 Inicializando conexión a MySQL...');
        console.log('📋 Configuración:', {
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            user: DB_CONFIG.user,
            database: DB_CONFIG.database
        });
        
        // Create connection pool
        pool = mysql.createPool(DB_CONFIG);
        
        // Test connection
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL establecida exitosamente');
        
        // Get database info
        const [rows] = await connection.execute('SELECT VERSION() as version');
        console.log(`📊 MySQL Version: ${rows[0].version}`);
        
        connection.release();
        
        return pool;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error stack:', error.stack);
        
        // If database doesn't exist, try to create it
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('🔨 Base de datos no existe, intentando crear...');
            await createDatabase();
        } else {
            throw error;
        }
    }
}

/**
 * Create database if it doesn't exist
 */
async function createDatabase() {
    try {
        const tempConfig = { ...DB_CONFIG };
        delete tempConfig.database; // Connect without database
        
        const tempConnection = await mysql.createConnection(tempConfig);
        
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Base de datos '${DB_CONFIG.database}' creada exitosamente`);
        
        await tempConnection.end();
        
        // Now initialize with the database
        return await initializeDatabase();
    } catch (error) {
        console.error('❌ Error creando base de datos:', error.message);
        throw error;
    }
}

/**
 * Execute a query
 */
async function executeQuery(query, params = []) {
    try {
        if (!pool) {
            console.log('⚠️ Pool no inicializado, inicializando...');
            await initializeDatabase();
        }
        
        const [rows, fields] = await pool.execute(query, params);
        return { rows, fields };
    } catch (error) {
        console.error('❌ Error ejecutando query:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('Query:', query.substring(0, 100) + '...');
        console.error('Params:', params);
        
        // Si es un error de conexión, resetear el pool
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('🔄 Reseteando pool de conexiones...');
            pool = null;
        }
        
        throw error;
    }
}

/**
 * Execute multiple queries in a transaction
 */
async function executeTransaction(queries) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const { query, params } of queries) {
            const [rows] = await connection.execute(query, params || []);
            results.push(rows);
        }
        
        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Close database connection
 */
async function closeDatabase() {
    if (pool) {
        await pool.end();
        console.log('🔒 Conexión a MySQL cerrada');
    }
}

/**
 * Setup database schema
 */
async function setupSchema() {
    try {
        console.log('🔧 Configurando esquema de base de datos...');
        
        // Read and execute schema file
        
        const schemaPath = path.join(__dirname, 'database_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await executeQuery(statement.trim());
            }
        }
        
        console.log('✅ Esquema de base de datos configurado exitosamente');
    } catch (error) {
        console.error('❌ Error configurando esquema:', error.message);
        throw error;
    }
}

const getPool = () => pool;

export {
    initializeDatabase,
    executeQuery,
    executeTransaction,
    closeDatabase,
    setupSchema,
    getPool
};

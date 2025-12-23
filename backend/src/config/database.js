// Database configuration with correct credentials
import mysql from 'mysql2/promise';

const DB_CONFIG = {
    host: 'vps123353.inmotionhosting.com',
    user: 'retailso_torneo',
    password: 'QKVdSfd4RuHr',
    database: 'retailso_torneog',
    port: 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(DB_CONFIG);

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

// Export functions for compatibility
export async function executeQuery(query, params = []) {
    const [rows, fields] = await pool.execute(query, params);
    return { rows, fields };
}

export async function executeTransaction(queries) {
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

export function getPool() {
    return pool;
}

export { pool };
export default pool;

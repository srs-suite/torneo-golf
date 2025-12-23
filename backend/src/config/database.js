// Simple database configuration with correct credentials
import mysql from 'mysql2/promise';

const DB_CONFIG = {
    host: 'vps123353.inmotionhosting.com',
    user: 'retailso_torneo',
    password: 'QKVdSfd4RuHr',
    database: 'retailso_torneog',
    port: 3306,
    charset: 'utf8mb4'
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

export { pool };
export default pool;

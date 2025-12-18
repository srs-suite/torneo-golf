import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teetracker_pro',
    port: parseInt(process.env.DB_PORT || '3306')
};

async function showAdmins() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const [admins] = await connection.execute(
            'SELECT admin_id, username, full_name, email, created_at FROM club_administrators ORDER BY admin_id'
        );
        
        console.log('\n=== ADMINISTRADORES REGISTRADOS ===\n');
        admins.forEach(admin => {
            console.log(`ID: ${admin.admin_id}`);
            console.log(`Usuario: ${admin.username}`);
            console.log(`Nombre: ${admin.full_name}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Creado: ${admin.created_at}`);
            console.log('---');
        });
        
        // Intentar con admin/admin
        const testPassword = 'admin';
        const hashedTest = crypto.createHash('sha256').update(testPassword).digest('hex');
        
        const [test] = await connection.execute(
            'SELECT admin_id, username FROM club_administrators WHERE username = ? AND password_hash = ?',
            ['admin', hashedTest]
        );
        
        if (test.length > 0) {
            console.log('\n✅ Las credenciales admin/admin FUNCIONAN para:');
            console.log(test[0]);
        } else {
            console.log('\n❌ Las credenciales admin/admin NO funcionan');
            console.log('Ejecuta: node update_admin.js para resetear');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

showAdmins();


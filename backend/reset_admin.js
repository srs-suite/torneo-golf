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

async function resetAdminPassword() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        // Ver todos los administradores
        const [admins] = await connection.execute(
            'SELECT admin_id, username, full_name, email FROM club_administrators ORDER BY admin_id'
        );
        
        console.log('\n=== Administradores en la base de datos ===');
        admins.forEach(admin => {
            console.log(`ID: ${admin.admin_id}, Usuario: ${admin.username}, Nombre: ${admin.full_name}, Email: ${admin.email}`);
        });
        
        // Resetear el superadmin (ID 9) con credenciales admin/admin
        const newPassword = 'admin';
        const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
        
        await connection.execute(
            'UPDATE club_administrators SET username = ?, password_hash = ? WHERE admin_id = 9',
            ['admin', hashedPassword]
        );
        
        console.log('\n✅ Credenciales del superadmin reseteadas:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin');
        
        // Verificar el cambio
        const [updated] = await connection.execute(
            'SELECT admin_id, username, full_name, email FROM club_administrators WHERE admin_id = 9'
        );
        
        console.log('\n=== Administrador actualizado ===');
        console.log(updated[0]);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

resetAdminPassword();


const mysql = require('mysql2/promise');
const crypto = require('crypto');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'torneogolf'
};

async function resetAdminPassword() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        // Ver todos los administradores
        const [admins] = await connection.execute(
            'SELECT admin_id, username, full_name, email, club_id FROM club_administrators'
        );
        
        console.log('\n=== Administradores en la base de datos ===');
        admins.forEach(admin => {
            console.log(`ID: ${admin.admin_id}, Usuario: ${admin.username}, Nombre: ${admin.full_name}, Email: ${admin.email}, Club ID: ${admin.club_id}`);
        });
        
        // Resetear el admin principal (ID 1) a admin/admin
        const newPassword = 'admin';
        const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
        
        await connection.execute(
            'UPDATE club_administrators SET username = ?, password_hash = ? WHERE admin_id = 1',
            ['admin', hashedPassword]
        );
        
        console.log('\n✅ Credenciales del administrador principal reseteadas:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin');
        
        // Verificar el cambio
        const [updated] = await connection.execute(
            'SELECT admin_id, username, full_name, email FROM club_administrators WHERE admin_id = 1'
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


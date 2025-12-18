const mysql = require('mysql2/promise');
const crypto = require('crypto');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'torneogolf'
};

async function showAdmins() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const [admins] = await connection.execute(
            'SELECT admin_id, username, full_name, email, club_id FROM club_administrators ORDER BY admin_id'
        );
        
        console.log('\n=== ADMINISTRADORES REGISTRADOS ===\n');
        admins.forEach(admin => {
            console.log(`ID: ${admin.admin_id}`);
            console.log(`Usuario: ${admin.username}`);
            console.log(`Nombre: ${admin.full_name}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Club ID: ${admin.club_id}`);
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


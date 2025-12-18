// Script para verificar datos en la base de datos
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teetracker_pro',
    port: process.env.DB_PORT || 3306,
};

async function checkData() {
    let connection;
    try {
        console.log('🔍 Conectando a la base de datos...');
        console.log(`   Host: ${DB_CONFIG.host}`);
        console.log(`   Database: ${DB_CONFIG.database}`);
        console.log(`   User: ${DB_CONFIG.user}`);
        
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Conectado exitosamente\n');

        // Verificar clubs
        const [clubs] = await connection.execute('SELECT course_id, course_name FROM golf_courses');
        console.log(`📍 CLUBS REGISTRADOS: ${clubs.length}`);
        clubs.forEach(club => {
            console.log(`   - Club ${club.course_id}: ${club.course_name}`);
        });
        console.log('');

        if (clubs.length === 0) {
            console.log('⚠️  No hay clubs registrados. Necesitas crear un club primero.');
            return;
        }

        // Verificar datos de contabilidad para cada club
        for (const club of clubs) {
            console.log(`\n📊 CONTABILIDAD - ${club.course_name} (ID: ${club.course_id})`);
            console.log('─'.repeat(60));

            // Ingresos por torneos
            const [incomes] = await connection.execute(
                'SELECT COUNT(*) as count, SUM(amount) as total FROM tournament_incomes WHERE course_id = ?',
                [club.course_id]
            );
            console.log(`   💰 Ingresos por Torneos: ${incomes[0].count} registros | Total: $${incomes[0].total || 0}`);

            // Otros ingresos
            const [otherIncomes] = await connection.execute(
                'SELECT COUNT(*) as count, SUM(amount) as total FROM other_incomes WHERE course_id = ?',
                [club.course_id]
            );
            console.log(`   💵 Otros Ingresos: ${otherIncomes[0].count} registros | Total: $${otherIncomes[0].total || 0}`);

            // Gastos
            const [expenses] = await connection.execute(
                'SELECT COUNT(*) as count, SUM(amount) as total FROM expenses WHERE course_id = ?',
                [club.course_id]
            );
            console.log(`   💸 Gastos: ${expenses[0].count} registros | Total: $${expenses[0].total || 0}`);

            // Conversiones
            const [exchanges] = await connection.execute(
                'SELECT COUNT(*) as count FROM currency_exchanges WHERE course_id = ?',
                [club.course_id]
            );
            console.log(`   🔄 Conversiones de Moneda: ${exchanges[0].count} registros`);

            // Verificar socios
            const [members] = await connection.execute(
                'SELECT COUNT(*) as count FROM members WHERE course_id = ?',
                [club.course_id]
            );
            console.log(`   👥 Socios: ${members[0].count} registrados`);

            // Verificar torneos
            const [tournaments] = await connection.execute(
                'SELECT COUNT(*) as count FROM tournaments WHERE course_id = ?',
                [club.course_id]
            );
            console.log(`   🏆 Torneos: ${tournaments[0].count} registrados`);
        }

        console.log('\n\n✅ Verificación completada');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n⚠️  La base de datos no existe. Necesitas:');
            console.log('   1. Crear el archivo backend/.env con tus credenciales de MySQL');
            console.log('   2. Importar el archivo sql/dump.sql en MySQL');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n⚠️  Error de autenticación. Verifica:');
            console.log('   - Usuario de MySQL');
            console.log('   - Contraseña de MySQL');
            console.log('   - Que el archivo backend/.env esté configurado correctamente');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkData();



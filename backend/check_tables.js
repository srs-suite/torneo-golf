// Script para verificar las tablas existentes
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

async function checkTables() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Conectado a la base de datos\n');

        // Listar todas las tablas
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 TABLAS EN LA BASE DE DATOS (${tables.length} tablas):`);
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });

        console.log('\n🔍 Verificando tablas de contabilidad específicamente:\n');
        
        // Verificar tablas relacionadas con ingresos
        const tablesToCheck = [
            'tournament_incomes',
            'other_incomes',
            'expenses',
            'currency_exchanges',
            'incomes',
            'payments'
        ];

        for (const tableName of tablesToCheck) {
            const [result] = await connection.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_schema = ? AND table_name = ?`,
                [DB_CONFIG.database, tableName]
            );
            
            if (result[0].count > 0) {
                const [rows] = await connection.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
                console.log(`   ✅ ${tableName} - ${rows[0].total} registros`);
            } else {
                console.log(`   ❌ ${tableName} - NO EXISTE`);
            }
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTables();



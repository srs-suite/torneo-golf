// Script para dar permisos completos al administrador principal
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teetracker_pro'
};

async function fixAdminPermissions() {
    let connection;
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado exitosamente\n');

        // Obtener todos los administradores principales
        const [admins] = await connection.execute(
            'SELECT admin_id, username, full_name, is_primary_admin FROM club_administrators WHERE is_active = TRUE'
        );

        if (admins.length === 0) {
            console.log('❌ No se encontraron administradores activos');
            return;
        }

        console.log('👥 Administradores encontrados:');
        admins.forEach((admin, index) => {
            console.log(`   ${index + 1}. ${admin.username} (${admin.full_name}) - ${admin.is_primary_admin ? '⭐ Admin Principal' : 'Admin Regular'}`);
        });
        console.log('');

        // Actualizar permisos para cada administrador
        for (const admin of admins) {
            console.log(`🔧 Actualizando permisos para: ${admin.username}...`);
            
            // Verificar si ya tiene registro de permisos
            const [existing] = await connection.execute(
                'SELECT * FROM user_permissions WHERE admin_id = ?',
                [admin.admin_id]
            );

            if (existing.length > 0) {
                // Actualizar permisos existentes
                await connection.execute(`
                    UPDATE user_permissions SET
                        can_view_members = TRUE,
                        can_create_members = TRUE,
                        can_edit_members = TRUE,
                        can_delete_members = TRUE,
                        can_view_tournaments = TRUE,
                        can_create_tournaments = TRUE,
                        can_edit_tournaments = TRUE,
                        can_delete_tournaments = TRUE,
                        can_manage_participants = TRUE,
                        can_view_groups = TRUE,
                        can_manage_groups = TRUE,
                        can_view_scorecards = TRUE,
                        can_manage_scorecards = TRUE,
                        can_view_photos = TRUE,
                        can_view_settings = TRUE,
                        can_view_rankings = TRUE,
                        can_view_accounting = TRUE,
                        can_view_financial_totals = TRUE,
                        can_view_balance = TRUE,
                        can_view_tournament_incomes = TRUE,
                        can_manage_tournament_incomes = TRUE,
                        can_view_other_incomes = TRUE,
                        can_manage_other_incomes = TRUE,
                        can_view_expenses = TRUE,
                        can_manage_expenses = TRUE,
                        can_view_currency_exchanges = TRUE,
                        can_manage_currency_exchanges = TRUE,
                        can_manage_payments = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE admin_id = ?
                `, [admin.admin_id]);
                console.log('   ✅ Permisos actualizados');
            } else {
                // Insertar nuevos permisos
                await connection.execute(`
                    INSERT INTO user_permissions (
                        admin_id,
                        can_view_members, can_create_members, can_edit_members, can_delete_members,
                        can_view_tournaments, can_create_tournaments, can_edit_tournaments, can_delete_tournaments,
                        can_manage_participants, can_view_groups, can_manage_groups,
                        can_view_scorecards, can_manage_scorecards,
                        can_view_photos,
                        can_view_settings, can_view_rankings,
                        can_view_accounting, can_view_financial_totals, can_view_balance,
                        can_view_tournament_incomes, can_manage_tournament_incomes,
                        can_view_other_incomes, can_manage_other_incomes,
                        can_view_expenses, can_manage_expenses,
                        can_view_currency_exchanges, can_manage_currency_exchanges,
                        can_manage_payments
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    admin.admin_id,
                    true, true, true, true,  // members
                    true, true, true, true,  // tournaments
                    true, true, true,        // participants, groups
                    true, true,              // scorecards
                    true,                    // photos
                    true, true,              // settings, rankings
                    true, true, true,        // accounting, financial totals, balance
                    true, true,              // tournament incomes
                    true, true,              // other incomes
                    true, true,              // expenses
                    true, true,              // currency exchanges
                    true                     // payments
                ]);
                console.log('   ✅ Permisos creados');
            }
        }

        console.log('\n✅ ¡Todos los permisos actualizados exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('   1. Cierra el navegador completamente');
        console.log('   2. Abre el navegador de nuevo');
        console.log('   3. Ve a http://localhost:5173');
        console.log('   4. Inicia sesión con tu usuario');
        console.log('   5. ¡Deberías ver todos los menús ahora!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

fixAdminPermissions();


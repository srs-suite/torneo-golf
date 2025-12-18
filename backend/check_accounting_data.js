// Verificar datos de contabilidad detallados
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

async function checkAccountingData() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Conectado a la base de datos\n');

        // Verificar clubs
        const [clubs] = await connection.execute('SELECT course_id, course_name FROM golf_courses WHERE is_active = 1');
        console.log(`📍 CLUBS ACTIVOS: ${clubs.length}\n`);

        for (const club of clubs) {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`📊 CLUB: ${club.course_name} (ID: ${club.course_id})`);
            console.log('='.repeat(70));

            // 1. INGRESOS DE TORNEOS (desde tournament_participants)
            console.log('\n💰 1. INGRESOS DE TORNEOS:');
            const [tournamentIncomes] = await connection.execute(`
                SELECT 
                    t.tournament_id,
                    t.tournament_name,
                    t.tournament_date,
                    COUNT(tp.participation_id) as participants,
                    SUM(COALESCE(tp.fee_amount, 0)) as total_fee,
                    SUM(COALESCE(tp.paid_amount, 0)) as total_paid,
                    SUM(CASE WHEN tp.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                    COALESCE(t.currency, 'ARS') as currency
                FROM tournaments t
                LEFT JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id
                WHERE t.course_id = ?
                GROUP BY t.tournament_id
                ORDER BY t.tournament_date DESC
                LIMIT 10
            `, [club.course_id]);

            if (tournamentIncomes.length === 0) {
                console.log('   ⚠️  No hay torneos con ingresos registrados');
            } else {
                let totalIngresos = 0;
                tournamentIncomes.forEach(t => {
                    console.log(`   - ${t.tournament_name} (${t.tournament_date?.toISOString().split('T')[0]})`);
                    console.log(`     Participantes: ${t.participants} | Pagados: ${t.paid_count} | Total: $${t.total_paid} ${t.currency}`);
                    totalIngresos += Number(t.total_paid || 0);
                });
                console.log(`   TOTAL INGRESOS TORNEOS: $${totalIngresos}`);
            }

            // 2. OTROS INGRESOS
            console.log('\n💵 2. OTROS INGRESOS:');
            const [otherIncomes] = await connection.execute(`
                SELECT 
                    income_id,
                    income_date,
                    description,
                    amount,
                    currency,
                    member_id,
                    payment_type
                FROM other_incomes
                WHERE club_id = ?
                ORDER BY income_date DESC
                LIMIT 10
            `, [club.course_id]);

            if (otherIncomes.length === 0) {
                console.log('   ⚠️  No hay otros ingresos registrados');
            } else {
                let totalOtros = 0;
                otherIncomes.forEach(i => {
                    console.log(`   - #${i.income_id} | ${i.income_date?.toISOString().split('T')[0]} | ${i.description || 'Sin descripción'}`);
                    console.log(`     Monto: $${i.amount} ${i.currency || 'ARS'} | Tipo: ${i.payment_type || 'N/A'} | Socio: ${i.member_id || 'N/A'}`);
                    totalOtros += Number(i.amount || 0);
                });
                console.log(`   TOTAL OTROS INGRESOS: $${totalOtros}`);
            }

            // 3. GASTOS
            console.log('\n💸 3. GASTOS:');
            const [expenses] = await connection.execute(`
                SELECT 
                    expense_id,
                    expense_date,
                    detail,
                    amount,
                    currency,
                    receipt_number
                FROM club_expenses
                WHERE club_id = ?
                ORDER BY expense_date DESC
                LIMIT 10
            `, [club.course_id]);

            if (expenses.length === 0) {
                console.log('   ⚠️  No hay gastos registrados');
            } else {
                let totalGastos = 0;
                expenses.forEach(e => {
                    console.log(`   - #${e.expense_id} | ${e.expense_date?.toISOString().split('T')[0]} | ${e.detail || 'Sin detalle'}`);
                    console.log(`     Monto: $${e.amount} ${e.currency || 'ARS'} | Recibo: ${e.receipt_number || 'N/A'}`);
                    totalGastos += Number(e.amount || 0);
                });
                console.log(`   TOTAL GASTOS: $${totalGastos}`);
            }

            // 4. CONVERSIONES
            console.log('\n🔄 4. CONVERSIONES DE MONEDA:');
            const [exchanges] = await connection.execute(`
                SELECT 
                    exchange_id,
                    exchange_date,
                    from_currency,
                    from_amount,
                    to_currency,
                    to_amount,
                    exchange_rate
                FROM currency_exchanges
                WHERE club_id = ?
                ORDER BY exchange_date DESC
                LIMIT 10
            `, [club.course_id]);

            if (exchanges.length === 0) {
                console.log('   ℹ️  No hay conversiones de moneda registradas');
            } else {
                exchanges.forEach(e => {
                    console.log(`   - #${e.exchange_id} | ${e.exchange_date?.toISOString().split('T')[0]}`);
                    console.log(`     ${e.from_amount} ${e.from_currency} → ${e.to_amount} ${e.to_currency} (Tasa: ${e.exchange_rate})`);
                });
            }

            // RESUMEN
            const [summary] = await connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM tournaments WHERE course_id = ?) as total_tournaments,
                    (SELECT COUNT(*) FROM tournament_participants tp JOIN tournaments t ON tp.tournament_id = t.tournament_id WHERE t.course_id = ?) as total_participants,
                    (SELECT COUNT(*) FROM other_incomes WHERE club_id = ?) as total_other_incomes,
                    (SELECT COUNT(*) FROM club_expenses WHERE club_id = ?) as total_expenses,
                    (SELECT COUNT(*) FROM currency_exchanges WHERE club_id = ?) as total_exchanges,
                    (SELECT COUNT(*) FROM members WHERE course_id = ?) as total_members
            `, [club.course_id, club.course_id, club.course_id, club.course_id, club.course_id, club.course_id]);

            console.log('\n📈 RESUMEN:');
            console.log(`   - Torneos: ${summary[0].total_tournaments}`);
            console.log(`   - Participantes: ${summary[0].total_participants}`);
            console.log(`   - Otros Ingresos: ${summary[0].total_other_incomes}`);
            console.log(`   - Gastos: ${summary[0].total_expenses}`);
            console.log(`   - Conversiones: ${summary[0].total_exchanges}`);
            console.log(`   - Socios: ${summary[0].total_members}`);
        }

        console.log('\n\n✅ Verificación completada');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAccountingData();


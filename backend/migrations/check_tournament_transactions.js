import { initializeDatabase, executeQuery } from '../src/config/database.js';

/**
 * Script para verificar transacciones de torneos y encontrar problemas
 */
async function checkTournamentTransactions() {
    try {
        console.log('🔍 Verificando transacciones de torneos...\n');
        
        await initializeDatabase();
        
        // Buscar el torneo "Clausura Copa Comdetur"
        const tournamentQuery = `
            SELECT 
                t.tournament_id,
                t.tournament_name,
                t.tournament_date,
                t.account_id,
                c.account_name,
                COUNT(tp.participation_id) as total_participants,
                COUNT(CASE WHEN tp.payment_status = 'paid' THEN 1 END) as paid_participants,
                SUM(CASE WHEN tp.payment_status = 'paid' THEN tp.paid_amount ELSE 0 END) as total_paid_amount
            FROM tournaments t
            LEFT JOIN custodian_accounts c ON t.account_id = c.account_id
            LEFT JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id
            WHERE t.tournament_name LIKE '%Clausura%' OR t.tournament_name LIKE '%Comdetur%'
            GROUP BY t.tournament_id, t.tournament_name, t.tournament_date, t.account_id, c.account_name
        `;
        
        const { rows: tournaments } = await executeQuery(tournamentQuery, []);
        
        console.log(`📊 Torneos encontrados: ${tournaments.length}\n`);
        
        for (const tournament of tournaments) {
            console.log(`🏆 Torneo: ${tournament.tournament_name}`);
            console.log(`   ID: ${tournament.tournament_id}`);
            console.log(`   Fecha: ${tournament.tournament_date}`);
            console.log(`   Cuenta ID: ${tournament.account_id || 'NO ASIGNADA'}`);
            console.log(`   Cuenta Nombre: ${tournament.account_name || 'NO ASIGNADA'}`);
            console.log(`   Participantes pagados: ${tournament.paid_participants}`);
            console.log(`   Total pagado: ${tournament.total_paid_amount || 0} ARS\n`);
            
            // Verificar transacciones para este torneo
            if (tournament.account_id) {
                const transactionsQuery = `
                    SELECT 
                        at.transaction_id,
                        at.transaction_date,
                        at.transaction_type,
                        at.amount,
                        at.currency,
                        at.reference_type,
                        at.reference_id,
                        at.to_account_id,
                        ta.account_name as to_account_name,
                        at.description
                    FROM account_transactions at
                    LEFT JOIN custodian_accounts ta ON at.to_account_id = ta.account_id
                    WHERE at.reference_type = 'tournament_payment'
                    AND at.reference_id IN (
                        SELECT participation_id 
                        FROM tournament_participants 
                        WHERE tournament_id = ?
                    )
                    ORDER BY at.transaction_date DESC
                `;
                
                const { rows: transactions } = await executeQuery(transactionsQuery, [tournament.tournament_id]);
                
                console.log(`   📋 Transacciones encontradas: ${transactions.length}`);
                if (transactions.length > 0) {
                    const totalInTransactions = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
                    console.log(`   💰 Total en transacciones: ${totalInTransactions} ${transactions[0].currency || 'ARS'}`);
                    console.log(`   📊 Diferencia: ${(tournament.total_paid_amount || 0) - totalInTransactions} ARS\n`);
                    
                    // Mostrar primeras 5 transacciones
                    transactions.slice(0, 5).forEach(t => {
                        console.log(`      - ID: ${t.transaction_id}, Monto: ${t.amount} ${t.currency}, Cuenta: ${t.to_account_name || 'N/A'}`);
                    });
                    if (transactions.length > 5) {
                        console.log(`      ... y ${transactions.length - 5} más`);
                    }
                } else {
                    console.log(`   ⚠️  NO HAY TRANSACCIONES para este torneo!\n`);
                }
            } else {
                console.log(`   ⚠️  El torneo NO tiene cuenta asignada\n`);
            }
            
            console.log('---\n');
        }
        
        // Verificar todas las transacciones de torneos para "Caja del Club"
        const cajaClubQuery = `
            SELECT 
                ca.account_id,
                ca.account_name,
                COUNT(at.transaction_id) as transaction_count,
                SUM(CASE WHEN at.currency = 'ARS' THEN at.amount ELSE 0 END) as total_ars,
                SUM(CASE WHEN at.currency = 'USD' THEN at.amount ELSE 0 END) as total_usd
            FROM custodian_accounts ca
            LEFT JOIN account_transactions at ON at.to_account_id = ca.account_id 
                AND at.transaction_type = 'income_tournament'
            WHERE ca.account_name LIKE '%Caja%Club%' OR ca.account_name LIKE '%caja%club%'
            GROUP BY ca.account_id, ca.account_name
        `;
        
        const { rows: cajaClub } = await executeQuery(cajaClubQuery, []);
        
        console.log(`\n💰 Resumen para "Caja del Club":`);
        for (const account of cajaClub) {
            console.log(`   Cuenta: ${account.account_name} (ID: ${account.account_id})`);
            console.log(`   Transacciones de torneos: ${account.transaction_count || 0}`);
            console.log(`   Total ARS: ${account.total_ars || 0}`);
            console.log(`   Total USD: ${account.total_usd || 0}\n`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Ejecutar
checkTournamentTransactions()
    .then(() => {
        console.log('✅ Verificación completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error ejecutando script:', error);
        process.exit(1);
    });


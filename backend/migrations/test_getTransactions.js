import { initializeDatabase, executeQuery } from '../src/config/database.js';

/**
 * Script para probar el query getTransactions y ver si devuelve las transacciones de torneos
 */
async function testGetTransactions() {
    try {
        console.log('🔍 Probando getTransactions...\n');
        
        await initializeDatabase();
        
        const clubId = 1;
        const fromDate = null; // Sin filtro de fecha
        const toDate = null;
        
        // Replicar el query de getTransactions
        let query = `
            SELECT 
                t.transaction_id,
                t.transaction_date,
                t.transaction_type,
                t.amount,
                t.currency,
                NULL as to_amount,
                NULL as to_currency,
                t.description,
                t.reference_type,
                t.reference_id,
                t.created_at,
                t.from_account_id,
                t.to_account_id,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name
            FROM account_transactions t
            LEFT JOIN custodian_accounts fa ON t.from_account_id = fa.account_id
            LEFT JOIN custodian_accounts ta ON t.to_account_id = ta.account_id
            WHERE t.club_id = ?
            AND (
                t.reference_type IS NULL 
                OR t.transaction_type = 'transfer'
                OR t.reference_type = 'tournament_payment'
                OR t.reference_type = 'tournament_payment_reversal'
                OR t.reference_type = 'tournament_payment_adjustment'
                OR (t.reference_type = 'other_income' AND EXISTS (SELECT 1 FROM other_incomes oi WHERE oi.income_id = t.reference_id AND oi.club_id = t.club_id))
                OR (t.reference_type = 'expense' AND EXISTS (SELECT 1 FROM club_expenses e WHERE e.expense_id = t.reference_id AND e.club_id = t.club_id))
            )
        `;
        
        const params = [clubId];
        
        if (fromDate) {
            query += ` AND t.transaction_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND t.transaction_date <= ?`;
            params.push(toDate);
        }
        
        query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;
        
        const { rows } = await executeQuery(query, params);
        
        console.log(`📊 Total transacciones: ${rows.length}`);
        
        const porTipo = rows.reduce((acc, r) => {
            acc[r.transaction_type] = (acc[r.transaction_type] || 0) + 1;
            return acc;
        }, {});
        
        console.log('📊 Por tipo:', porTipo);
        
        const tournamentTransactions = rows.filter(r => r.transaction_type === 'income_tournament');
        console.log(`\n🏆 Transacciones de torneos: ${tournamentTransactions.length}`);
        
        if (tournamentTransactions.length > 0) {
            const totalARS = tournamentTransactions
                .filter(t => (t.currency || 'ARS') === 'ARS')
                .reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const totalUSD = tournamentTransactions
                .filter(t => (t.currency || 'ARS') === 'USD')
                .reduce((sum, t) => sum + Number(t.amount || 0), 0);
            
            console.log(`   Total ARS: ${totalARS}`);
            console.log(`   Total USD: ${totalUSD}`);
            
            console.log('\n   Primeras 5 transacciones de torneos:');
            tournamentTransactions.slice(0, 5).forEach(t => {
                console.log(`   - ID: ${t.transaction_id}, Fecha: ${t.transaction_date}, Monto: ${t.amount} ${t.currency}, Cuenta: ${t.to_account_name || 'N/A'}`);
            });
        } else {
            console.log('   ⚠️  NO SE ENCONTRARON transacciones de torneos!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Ejecutar
testGetTransactions()
    .then(() => {
        console.log('\n✅ Prueba completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error ejecutando script:', error);
        process.exit(1);
    });


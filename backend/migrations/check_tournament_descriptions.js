import { initializeDatabase, executeQuery } from '../src/config/database.js';

/**
 * Script para verificar las descripciones de las transacciones de torneos
 */
async function checkTournamentDescriptions() {
    try {
        console.log('🔍 Verificando descripciones de transacciones de torneos...\n');
        
        await initializeDatabase();
        
        const query = `
            SELECT 
                at.transaction_id,
                at.description,
                at.transaction_date,
                at.amount,
                at.currency,
                tp.tournament_id,
                t.tournament_name
            FROM account_transactions at
            INNER JOIN tournament_participants tp ON at.reference_id = tp.participation_id
            INNER JOIN tournaments t ON tp.tournament_id = t.tournament_id
            WHERE at.transaction_type = 'income_tournament'
            AND at.reference_type = 'tournament_payment'
            ORDER BY at.transaction_date DESC, at.transaction_id
            LIMIT 10
        `;
        
        const { rows } = await executeQuery(query, []);
        
        console.log(`📊 Primeras 10 transacciones de torneos:\n`);
        rows.forEach((tx, index) => {
            console.log(`${index + 1}. ID: ${tx.transaction_id}`);
            console.log(`   Torneo: ${tx.tournament_name}`);
            console.log(`   Descripción: ${tx.description}`);
            console.log(`   Monto: ${tx.amount} ${tx.currency}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Ejecutar
checkTournamentDescriptions()
    .then(() => {
        console.log('✅ Verificación completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error ejecutando script:', error);
        process.exit(1);
    });


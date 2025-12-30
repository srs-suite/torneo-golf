import { initializeDatabase, executeQuery } from '../src/config/database.js';

/**
 * Script para actualizar las descripciones de las transacciones de torneos
 * para incluir el nombre del torneo
 */
async function updateTournamentTransactionDescriptions() {
    try {
        console.log('🔄 Actualizando descripciones de transacciones de torneos...\n');
        
        await initializeDatabase();
        
        // Buscar todas las transacciones de torneos que tienen descripciones sin nombre de torneo
        const query = `
            SELECT 
                at.transaction_id,
                at.reference_id,
                at.description,
                tp.tournament_id,
                t.tournament_name
            FROM account_transactions at
            INNER JOIN tournament_participants tp ON at.reference_id = tp.participation_id
            INNER JOIN tournaments t ON tp.tournament_id = t.tournament_id
            WHERE at.transaction_type = 'income_tournament'
            AND at.reference_type = 'tournament_payment'
            AND (at.description NOT LIKE CONCAT('%', t.tournament_name, '%') OR at.description LIKE '%Pago de torneo - Participante ID:%')
            ORDER BY at.transaction_id
        `;
        
        const { rows: transactionsToUpdate } = await executeQuery(query, []);
        
        console.log(`📊 Transacciones a actualizar: ${transactionsToUpdate.length}\n`);
        
        if (transactionsToUpdate.length === 0) {
            console.log('✅ No hay transacciones que actualizar.\n');
            return;
        }
        
        let updated = 0;
        let errors = 0;
        
        for (const tx of transactionsToUpdate) {
            try {
                const newDescription = `Pago de torneo: ${tx.tournament_name} - Participante ID: ${tx.reference_id}`;
                
                const updateQuery = `
                    UPDATE account_transactions
                    SET description = ?
                    WHERE transaction_id = ?
                `;
                
                await executeQuery(updateQuery, [newDescription, tx.transaction_id]);
                
                updated++;
                if (updated % 10 === 0) {
                    console.log(`✅ Actualizadas ${updated} transacciones...`);
                }
            } catch (error) {
                errors++;
                console.error(`❌ Error actualizando transacción ${tx.transaction_id}:`, error.message);
            }
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`   ✅ Actualizadas: ${updated}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log(`   📋 Total procesado: ${transactionsToUpdate.length}\n`);
        
        if (updated > 0) {
            console.log('✅ Actualización completada exitosamente.\n');
        }
        
    } catch (error) {
        console.error('❌ Error en la actualización:', error);
        throw error;
    }
}

// Ejecutar
updateTournamentTransactionDescriptions()
    .then(() => {
        console.log('✅ Script completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error ejecutando script:', error);
        process.exit(1);
    });


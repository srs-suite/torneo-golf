import { initializeDatabase, executeQuery } from '../src/config/database.js';

/**
 * Script de migración para crear transacciones faltantes de pagos de torneos
 * 
 * Este script busca todos los pagos de torneos que están marcados como "paid"
 * pero que no tienen una transacción correspondiente en account_transactions,
 * y crea las transacciones faltantes.
 */
async function createMissingTournamentTransactions() {
    try {
        console.log('🔄 Iniciando migración: Crear transacciones faltantes de pagos de torneos...\n');
        
        await initializeDatabase();
        
        // Buscar todos los pagos de torneos que están marcados como "paid"
        // y que no tienen una transacción correspondiente
        const query = `
            SELECT 
                tp.participation_id,
                tp.tournament_id,
                tp.paid_amount,
                tp.currency,
                c.club_id,
                t.tournament_date,
                t.account_id,
                t.tournament_name
            FROM tournament_participants tp
            INNER JOIN tournaments t ON tp.tournament_id = t.tournament_id
            INNER JOIN clubs c ON t.course_id = c.club_id
            WHERE tp.payment_status = 'paid'
            AND tp.paid_amount > 0
            AND t.account_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 
                FROM account_transactions at
                WHERE at.reference_type = 'tournament_payment'
                AND at.reference_id = tp.participation_id
                AND at.transaction_type = 'income_tournament'
                AND at.to_account_id = t.account_id
                AND at.amount = tp.paid_amount
                AND at.currency = tp.currency
            )
            ORDER BY t.tournament_date DESC, tp.participation_id
        `;
        
        const { rows: missingPayments } = await executeQuery(query, []);
        
        console.log(`📊 Encontrados ${missingPayments.length} pagos sin transacción\n`);
        
        if (missingPayments.length === 0) {
            console.log('✅ No hay transacciones faltantes. Todo está actualizado.\n');
            return;
        }
        
        let created = 0;
        let errors = 0;
        
        for (const payment of missingPayments) {
            try {
                // IMPORTANTE: Insertar la transacción directamente sin actualizar el balance
                // porque el balance ya está correcto (fue actualizado cuando se marcó el pago como "paid")
                // Solo necesitamos crear el registro histórico de la transacción
                const insertQuery = `
                    INSERT INTO account_transactions (
                        club_id, 
                        transaction_type, 
                        transaction_date,
                        from_account_id, 
                        to_account_id, 
                        amount, 
                        currency,
                        description, 
                        reference_type, 
                        reference_id,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `;
                
                const tournamentName = payment.tournament_name || `Torneo ID ${payment.tournament_id}`;
                const description = `Pago de torneo: ${tournamentName} - Participante ID: ${payment.participation_id}`;
                
                await executeQuery(insertQuery, [
                    payment.club_id,
                    'income_tournament',
                    payment.tournament_date || new Date().toISOString().split('T')[0],
                    null, // from_account_id
                    payment.account_id, // to_account_id
                    payment.paid_amount,
                    payment.currency || 'ARS',
                    description,
                    'tournament_payment',
                    payment.participation_id
                ]);
                
                created++;
                console.log(`✅ Creada transacción para participación ${payment.participation_id} (Torneo ${payment.tournament_id}): ${payment.paid_amount} ${payment.currency || 'ARS'}`);
            } catch (error) {
                errors++;
                console.error(`❌ Error creando transacción para participación ${payment.participation_id}:`, error.message);
            }
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`   ✅ Transacciones creadas: ${created}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log(`   📋 Total procesado: ${missingPayments.length}\n`);
        
        if (created > 0) {
            console.log('✅ Migración completada exitosamente.\n');
        } else if (errors > 0) {
            console.log('⚠️  Migración completada con errores. Revisa los logs arriba.\n');
        }
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('create_missing_tournament_transactions')) {
    createMissingTournamentTransactions()
        .then(() => {
            console.log('✅ Script completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
} else {
    // Si se ejecuta directamente, ejecutar de todas formas
    createMissingTournamentTransactions()
        .then(() => {
            console.log('✅ Script completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

export { createMissingTournamentTransactions };


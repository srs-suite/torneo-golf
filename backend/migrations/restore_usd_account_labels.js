/**
 * Vuelve a poner la cuenta en los ingresos y gastos en dólares que quedaron
 * sin cuenta. No toca los movimientos ni los saldos de las tarjetas.
 *
 *   NODE_ENV=production node migrations/restore_usd_account_labels.js 1
 *   NODE_ENV=production node migrations/restore_usd_account_labels.js 1 --apply
 */
import '../src/config/env.js';
import { initializeDatabase, executeQuery, closeDatabase } from '../src/config/database.js';

function fecha(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(value || '').slice(0, 10);
}

async function main() {
    const apply = process.argv.includes('--apply');
    const clubId = parseInt(process.argv.slice(2).find((arg) => arg !== '--apply'), 10);
    if (!clubId || Number.isNaN(clubId)) {
        console.error('Uso: NODE_ENV=production node migrations/restore_usd_account_labels.js <club_id> [--apply]');
        process.exit(1);
    }

    await initializeDatabase();

    const { rows: accounts } = await executeQuery(
        `SELECT account_id, account_name FROM custodian_accounts WHERE club_id = ?`,
        [clubId]
    );
    const juan = accounts.find((acc) => String(acc.account_name || '').trim().toLowerCase() === 'juan castro videla');
    if (!juan) {
        console.error('No encontré la cuenta Juan Castro Videla.');
        await closeDatabase();
        process.exit(1);
    }

    const { rows: incomes } = await executeQuery(
        `SELECT income_id, income_date, amount, description
         FROM other_incomes
         WHERE club_id = ? AND account_id IS NULL AND UPPER(TRIM(currency)) = 'USD'`,
        [clubId]
    );
    const { rows: expenses } = await executeQuery(
        `SELECT expense_id, expense_date, amount, detail
         FROM club_expenses
         WHERE club_id = ? AND account_id IS NULL AND UPPER(TRIM(currency)) = 'USD'`,
        [clubId]
    );

    console.log('Se les vuelve a poner la cuenta Juan Castro Videla. Los saldos no se tocan.');
    console.log(`Ingresos: ${incomes.length}`);
    for (const row of incomes) {
        console.log(`  ingreso #${row.income_id}  ${fecha(row.income_date)}  US$${Number(row.amount).toFixed(2)}  ${row.description || ''}`);
    }
    console.log(`Gastos: ${expenses.length}`);
    for (const row of expenses) {
        console.log(`  gasto #${row.expense_id}  ${fecha(row.expense_date)}  US$${Number(row.amount).toFixed(2)}  ${row.detail || ''}`);
    }

    if (incomes.length === 0 && expenses.length === 0) {
        console.log('No hay nada sin cuenta.');
        await closeDatabase();
        return;
    }

    if (!apply) {
        console.log('Sin cambios. Para guardar:');
        console.log('NODE_ENV=production node migrations/restore_usd_account_labels.js 1 --apply');
        await closeDatabase();
        return;
    }

    await executeQuery(
        `UPDATE other_incomes SET account_id = ?
         WHERE club_id = ? AND account_id IS NULL AND UPPER(TRIM(currency)) = 'USD'`,
        [juan.account_id, clubId]
    );
    await executeQuery(
        `UPDATE club_expenses SET account_id = ?
         WHERE club_id = ? AND account_id IS NULL AND UPPER(TRIM(currency)) = 'USD'`,
        [juan.account_id, clubId]
    );

    console.log('Listo. El recuadro naranja no debería aparecer. Caja del Club sigue en US$300,00 y Juan en US$0,00.');
    await closeDatabase();
}

main().catch(async (error) => {
    console.error(error);
    try { await closeDatabase(); } catch (_e) { /* ya cerrado */ }
    process.exit(1);
});

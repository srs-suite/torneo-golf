/**
 * El ajuste de Colombo cambió la cuenta de destino de algunos otros ingresos.
 * Juan quedó con saldo y Caja del Club con menos. Los movimientos siguen.
 *
 * No mueve los 68 ingresos. Deja en Juan los que ya tienen una salida del mismo
 * monto (se cobró y después se pagó o se transfirió). Devuelve a Caja del Club
 * solo los que explican el saldo que le apareció.
 *
 *   NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1
 *   NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1 --apply
 */
import '../src/config/env.js';
import { initializeDatabase, executeQuery, closeDatabase } from '../src/config/database.js';

function cents(value) {
    return Math.round(Number(value || 0) * 100);
}

function pesos(c) {
    return (c / 100).toFixed(2);
}

function fecha(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(value || '').slice(0, 10);
}

function visible(tx) {
    const ref = tx.reference_type;
    if (ref == null || ref === '') return true;
    if (tx.transaction_type === 'transfer' || tx.transaction_type === 'income_tournament') return true;
    if (ref === 'tournament_payment' || ref === 'tournament_payment_reversal' || ref === 'tournament_payment_adjustment') return true;
    if (ref === 'other_income') return Number(tx.income_exists) === 1;
    if (ref === 'expense') return Number(tx.expense_exists) === 1;
    return false;
}

function takeSameAmount(pool, amount) {
    const index = pool.findIndex((item) => item.cents === amount);
    if (index < 0) return null;
    return pool.splice(index, 1)[0];
}

async function main() {
    const apply = process.argv.includes('--apply');
    const clubId = parseInt(process.argv.slice(2).find((arg) => arg !== '--apply'), 10);
    if (!clubId || Number.isNaN(clubId)) {
        console.error('Uso: NODE_ENV=production node migrations/revert_misassigned_other_incomes.js <club_id> [--apply]');
        process.exit(1);
    }

    await initializeDatabase();

    const { rows: accounts } = await executeQuery(
        `SELECT account_id, account_name FROM custodian_accounts WHERE club_id = ?`,
        [clubId]
    );
    const byName = (name) => accounts.find((acc) => String(acc.account_name || '').trim().toLowerCase() === name);
    const juan = byName('juan castro videla');
    const caja = byName('caja del club');
    if (!juan || !caja) {
        console.error('No encontré la cuenta Juan Castro Videla o Caja del Club.');
        await closeDatabase();
        process.exit(1);
    }
    const juanId = Number(juan.account_id);
    const cajaId = Number(caja.account_id);

    const { rows: txs } = await executeQuery(
        `SELECT t.transaction_id, t.transaction_type, t.transaction_date, t.amount, t.currency,
                t.from_account_id, t.to_account_id, t.description, t.reference_type,
                IF(oi.income_id IS NULL, 0, 1) AS income_exists,
                IF(e.expense_id IS NULL, 0, 1) AS expense_exists
         FROM account_transactions t
         LEFT JOIN other_incomes oi
           ON t.reference_type = 'other_income' AND t.reference_id = oi.income_id AND oi.club_id = t.club_id
         LEFT JOIN club_expenses e
           ON t.reference_type = 'expense' AND t.reference_id = e.expense_id AND e.club_id = t.club_id
         WHERE t.club_id = ?`,
        [clubId]
    );
    const { rows: exchanges } = await executeQuery(
        `SELECT exchange_id, exchange_date, from_account_id, to_account_id,
                from_currency, from_amount, to_currency, to_amount, notes
         FROM currency_exchanges WHERE club_id = ?`,
        [clubId]
    );

    const incomes = [];
    const otherIn = [];
    const outflows = [];

    const pushFlow = (list, item) => {
        if ((item.currency || 'ARS') !== 'ARS') return;
        if (item.cents <= 0) return;
        list.push(item);
    };

    for (const tx of txs) {
        if (!visible(tx)) continue;
        const amount = cents(tx.amount);
        const fromId = tx.from_account_id != null ? Number(tx.from_account_id) : null;
        const toId = tx.to_account_id != null ? Number(tx.to_account_id) : null;
        const base = {
            id: tx.transaction_id,
            cents: amount,
            currency: tx.currency || 'ARS',
            date: fecha(tx.transaction_date),
            description: tx.description || ''
        };
        if (tx.transaction_type === 'income_other' && toId === juanId) {
            pushFlow(incomes, base);
        } else if ((tx.transaction_type === 'income_tournament' || tx.transaction_type === 'transfer') && toId === juanId) {
            pushFlow(otherIn, base);
        } else if (tx.transaction_type === 'transfer' && fromId === juanId) {
            pushFlow(outflows, base);
        } else if (tx.transaction_type === 'expense' && fromId === juanId) {
            pushFlow(outflows, base);
        } else if ((tx.transaction_type === 'income_tournament' || tx.transaction_type === 'income_other') && fromId === juanId) {
            pushFlow(outflows, base);
        }
    }

    for (const ex of exchanges) {
        const fromId = ex.from_account_id != null ? Number(ex.from_account_id) : null;
        const toId = ex.to_account_id != null ? Number(ex.to_account_id) : null;
        if (fromId === juanId) {
            pushFlow(outflows, {
                id: `EX${ex.exchange_id}`,
                cents: cents(ex.from_amount),
                currency: ex.from_currency || 'ARS',
                date: fecha(ex.exchange_date),
                description: ex.notes || 'Conversión'
            });
        }
        if (toId === juanId) {
            pushFlow(otherIn, {
                id: `EX${ex.exchange_id}`,
                cents: cents(ex.to_amount),
                currency: ex.to_currency || 'ARS',
                date: fecha(ex.exchange_date),
                description: ex.notes || 'Conversión'
            });
        }
    }

    const balance = incomes.reduce((s, i) => s + i.cents, 0)
        + otherIn.reduce((s, i) => s + i.cents, 0)
        - outflows.reduce((s, i) => s + i.cents, 0);

    console.log(`Saldo en pesos de Juan que muestra la pantalla: $${pesos(balance)}`);
    console.log(`Otros ingresos en Juan: ${incomes.length} por $${pesos(incomes.reduce((s, i) => s + i.cents, 0))}`);
    console.log(`Otras entradas: ${otherIn.length} por $${pesos(otherIn.reduce((s, i) => s + i.cents, 0))}`);
    console.log(`Salidas: ${outflows.length} por $${pesos(outflows.reduce((s, i) => s + i.cents, 0))}`);

    const pendingOut = [...outflows];
    for (const entry of otherIn) takeSameAmount(pendingOut, entry.cents);
    const stay = [];
    const pool = [...incomes];
    for (const out of [...pendingOut]) {
        const matched = takeSameAmount(pool, out.cents);
        if (matched) {
            stay.push(matched);
            takeSameAmount(pendingOut, out.cents);
        }
    }

    const leftoverSum = pool.reduce((s, i) => s + i.cents, 0);
    console.log(`Ingresos que ya salieron de la cuenta y se quedan en Juan: ${stay.length}`);
    console.log(`Ingresos que explican el saldo y vuelven a Caja del Club: ${pool.length} por $${pesos(leftoverSum)}`);
    for (const tx of pool) {
        console.log(`  #${tx.id}  ${tx.date}  $${pesos(tx.cents)}  ${tx.description}`);
    }
    if (pendingOut.length) {
        console.log(`Salidas sin un ingreso del mismo monto: ${pendingOut.length} por $${pesos(pendingOut.reduce((s, i) => s + i.cents, 0))}`);
        for (const tx of pendingOut) {
            console.log(`  salida #${tx.id}  ${tx.date}  $${pesos(tx.cents)}  ${tx.description}`);
        }
    }

    if (leftoverSum !== balance || balance <= 0) {
        console.log('Esa lista no cierra con el saldo de Juan. No modifiqué nada.');
        await closeDatabase();
        process.exit(2);
    }

    if (!apply) {
        console.log('Sin cambios. Si esa lista es la que tiene que volver a la caja:');
        console.log('NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1 --apply');
        await closeDatabase();
        return;
    }

    for (const tx of pool) {
        const amount = tx.cents / 100;
        const updated = await executeQuery(
            `UPDATE account_transactions
             SET to_account_id = ?
             WHERE transaction_id = ? AND club_id = ? AND to_account_id = ?`,
            [cajaId, tx.id, clubId, juanId]
        );
        if (!updated.rows || updated.rows.affectedRows !== 1) {
            throw new Error(`No se pudo reasignar el movimiento #${tx.id}`);
        }
        await executeQuery(
            `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars - ? WHERE account_id = ? AND club_id = ?`,
            [amount, juanId, clubId]
        );
        await executeQuery(
            `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars + ? WHERE account_id = ? AND club_id = ?`,
            [amount, cajaId, clubId]
        );
    }

    console.log(`Listo. ${pool.length} ingresos volvieron a Caja del Club, por $${pesos(leftoverSum)}.`);
    await closeDatabase();
}

main().catch(async (error) => {
    console.error(error);
    try { await closeDatabase(); } catch (_e) { /* ya cerrado */ }
    process.exit(1);
});

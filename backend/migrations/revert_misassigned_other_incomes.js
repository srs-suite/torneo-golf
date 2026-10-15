/**
 * Pasa a Caja del Club todo lo que el sistema tiene asentado en Juan Castro Videla.
 * No borra movimientos: les cambia la cuenta. Juan queda en 0 pesos y 0 dólares.
 *
 *   NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1
 *   NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1 --apply
 */
import '../src/config/env.js';
import { initializeDatabase, executeQuery, closeDatabase } from '../src/config/database.js';

function cents(value) {
    return Math.round(Number(value || 0) * 100);
}

function money(centsValue) {
    const sign = centsValue < 0 ? '-' : '';
    return sign + (Math.abs(centsValue) / 100).toFixed(2);
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

function emptyMap() {
    return new Map();
}

function add(map, accountId, currency, delta) {
    if (accountId == null || accountId === '') return;
    const id = Number(accountId);
    if (!Number.isFinite(id) || delta === 0) return;
    if (!map.has(id)) map.set(id, { ars: 0, usd: 0 });
    const bag = map.get(id);
    if ((currency || 'ARS') === 'USD') bag.usd += delta;
    else bag.ars += delta;
}

function screenBalances(txs, exchanges, rewrite) {
    const map = emptyMap();
    const accountOf = (id) => {
        if (id == null || id === '') return null;
        const n = Number(id);
        return rewrite && rewrite.has(n) ? rewrite.get(n) : n;
    };

    for (const tx of txs) {
        if (!visible(tx)) continue;
        const amount = cents(tx.amount);
        const currency = tx.currency || 'ARS';
        const fromId = accountOf(tx.from_account_id);
        const toId = accountOf(tx.to_account_id);
        if (tx.transaction_type === 'income_tournament' || tx.transaction_type === 'income_other') {
            add(map, toId, currency, amount);
        } else if (tx.transaction_type === 'expense') {
            add(map, fromId, currency, -amount);
        } else if (tx.transaction_type === 'transfer') {
            add(map, fromId, currency, -amount);
            add(map, toId, currency, amount);
        }
    }

    for (const ex of exchanges) {
        const fromId = accountOf(ex.from_account_id);
        const toId = accountOf(ex.to_account_id);
        add(map, fromId, ex.from_currency || 'ARS', -cents(ex.from_amount));
        add(map, toId, ex.to_currency || 'ARS', cents(ex.to_amount));
    }
    return map;
}

function line(label, bag) {
    const ars = bag ? bag.ars : 0;
    const usd = bag ? bag.usd : 0;
    console.log(`${label}  $${money(ars)}    US$${money(usd)}`);
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
        `SELECT account_id, account_name, current_balance_ars, current_balance_usd
         FROM custodian_accounts WHERE club_id = ?`,
        [clubId]
    );
    const byName = (name) => accounts.find((acc) => String(acc.account_name || '').trim().toLowerCase() === name);
    const juan = byName('juan castro videla');
    const caja = byName('caja del club');
    if (!juan || !caja) {
        console.error('No encontré Juan Castro Videla o Caja del Club.');
        for (const acc of accounts) console.error(`  - ${acc.account_name}`);
        await closeDatabase();
        process.exit(1);
    }
    const juanId = Number(juan.account_id);
    const cajaId = Number(caja.account_id);

    const { rows: txs } = await executeQuery(
        `SELECT t.transaction_id, t.transaction_type, t.amount, t.currency,
                t.from_account_id, t.to_account_id, t.reference_type,
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
        `SELECT from_account_id, to_account_id, from_currency, from_amount, to_currency, to_amount
         FROM currency_exchanges WHERE club_id = ?`,
        [clubId]
    );

    const before = screenBalances(txs, exchanges, null);
    const after = screenBalances(txs, exchanges, new Map([[juanId, cajaId]]));

    console.log('Como se ve ahora:');
    line('  Juan Castro Videla', before.get(juanId));
    line('  Caja del Club     ', before.get(cajaId));
    console.log('Como va a quedar:');
    line('  Juan Castro Videla', after.get(juanId));
    line('  Caja del Club     ', after.get(cajaId));

    const touches = txs.filter((tx) => Number(tx.from_account_id) === juanId || Number(tx.to_account_id) === juanId).length
        + exchanges.filter((ex) => Number(ex.from_account_id) === juanId || Number(ex.to_account_id) === juanId).length;
    console.log(`Movimientos que pasan de Juan a Caja del Club: ${touches}`);

    if (!apply) {
        console.log('Sin cambios. Para dejarlo así:');
        console.log('NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1 --apply');
        await closeDatabase();
        return;
    }

    await executeQuery(
        `UPDATE account_transactions SET to_account_id = ? WHERE club_id = ? AND to_account_id = ?`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE account_transactions SET from_account_id = ? WHERE club_id = ? AND from_account_id = ?`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE currency_exchanges SET to_account_id = ? WHERE club_id = ? AND to_account_id = ?`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE currency_exchanges SET from_account_id = ? WHERE club_id = ? AND from_account_id = ?`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE other_incomes SET account_id = ? WHERE club_id = ? AND account_id = ?`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE club_expenses SET account_id = ? WHERE club_id = ? AND account_id = ?`,
        [cajaId, clubId, juanId]
    );
    try {
        await executeQuery(
            `UPDATE tournaments SET account_id = ? WHERE course_id = ? AND account_id = ?`,
            [cajaId, clubId, juanId]
        );
    } catch (_e) { /* la columna puede no usarse */ }

    const cajaAfter = after.get(cajaId) || { ars: 0, usd: 0 };
    await executeQuery(
        `UPDATE custodian_accounts
         SET current_balance_ars = ?, current_balance_usd = ?
         WHERE club_id = ? AND account_id = ?`,
        [cajaAfter.ars / 100, cajaAfter.usd / 100, clubId, cajaId]
    );
    await executeQuery(
        `UPDATE custodian_accounts
         SET current_balance_ars = 0, current_balance_usd = 0
         WHERE club_id = ? AND account_id = ?`,
        [clubId, juanId]
    );

    console.log('Listo. Juan quedó en cero. Ese saldo pasó a Caja del Club.');
    await closeDatabase();
}

main().catch(async (error) => {
    console.error(error);
    try { await closeDatabase(); } catch (_e) { /* ya cerrado */ }
    process.exit(1);
});

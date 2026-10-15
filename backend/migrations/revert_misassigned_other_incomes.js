/**
 * Pasa a Caja del Club los pesos asentados en Juan Castro Videla.
 * Los dólares de Juan no se suman a la caja: se los saca de su cuenta
 * para que el club siga con sus US$300 y Juan quede en cero.
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

function isUsd(currency) {
    const code = String(currency || 'ARS').trim().toUpperCase().replace('US$', 'USD').replace('U$S', 'USD');
    return code === 'USD';
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

function add(map, accountId, currency, delta) {
    if (accountId == null || accountId === '') return;
    const id = Number(accountId);
    if (!Number.isFinite(id) || delta === 0) return;
    if (!map.has(id)) map.set(id, { ars: 0, usd: 0 });
    const bag = map.get(id);
    if (isUsd(currency)) bag.usd += delta;
    else bag.ars += delta;
}

/**
 * Pesos de Juan pasan a Caja. Dólares de Juan no van a ninguna cuenta.
 */
function mapLeg(id, currency, juanId, cajaId, rewrite) {
    if (id == null || id === '') return null;
    const n = Number(id);
    if (!rewrite || n !== juanId) return n;
    if (isUsd(currency)) return null;
    return cajaId;
}

function screenBalances(txs, exchanges, juanId, cajaId, rewrite) {
    const map = new Map();
    for (const tx of txs) {
        if (!visible(tx)) continue;
        const amount = cents(tx.amount);
        const currency = tx.currency || 'ARS';
        const fromId = mapLeg(tx.from_account_id, currency, juanId, cajaId, rewrite);
        const toId = mapLeg(tx.to_account_id, currency, juanId, cajaId, rewrite);
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
        const fromId = mapLeg(ex.from_account_id, ex.from_currency, juanId, cajaId, rewrite);
        const toId = mapLeg(ex.to_account_id, ex.to_currency, juanId, cajaId, rewrite);
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
        console.error('Uso: NODE_ENV=production node migrations/revert_misassigned_other_incomes.js <club_id> [--apply]');
        process.exit(1);
    }

    await initializeDatabase();

    const { rows: accounts } = await executeQuery(
        `SELECT account_id, account_name FROM custodian_accounts WHERE club_id = ?`,
        [clubId]
    );
    const nameOf = (id) => {
        const acc = accounts.find((item) => Number(item.account_id) === Number(id));
        return acc ? acc.account_name : (id == null ? '-' : `#${id}`);
    };
    const byName = (name) => accounts.find((acc) => String(acc.account_name || '').trim().toLowerCase() === name);
    const juan = byName('juan castro videla');
    const caja = byName('caja del club');
    if (!juan || !caja) {
        console.error('No encontré Juan Castro Videla o Caja del Club.');
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

    const before = screenBalances(txs, exchanges, juanId, cajaId, false);
    const after = screenBalances(txs, exchanges, juanId, cajaId, true);

    console.log('Como se ve ahora:');
    line('  Juan Castro Videla', before.get(juanId));
    line('  Caja del Club     ', before.get(cajaId));
    console.log('Como va a quedar:');
    line('  Juan Castro Videla', after.get(juanId));
    line('  Caja del Club     ', after.get(cajaId));

    const usdLines = [];
    for (const tx of txs) {
        if (!isUsd(tx.currency)) continue;
        if (Number(tx.from_account_id) !== juanId && Number(tx.to_account_id) !== juanId) continue;
        usdLines.push(`  #${tx.transaction_id}  ${fecha(tx.transaction_date)}  US$${Number(tx.amount).toFixed(2)}  ${tx.transaction_type}  ${nameOf(tx.from_account_id)} → ${nameOf(tx.to_account_id)}  ${tx.description || ''}`);
    }
    for (const ex of exchanges) {
        const fromJuan = Number(ex.from_account_id) === juanId && isUsd(ex.from_currency);
        const toJuan = Number(ex.to_account_id) === juanId && isUsd(ex.to_currency);
        if (!fromJuan && !toJuan) continue;
        const amount = fromJuan ? ex.from_amount : ex.to_amount;
        usdLines.push(`  #EX${ex.exchange_id}  ${fecha(ex.exchange_date)}  US$${Number(amount).toFixed(2)}  conversión  ${nameOf(ex.from_account_id)} → ${nameOf(ex.to_account_id)}  ${ex.notes || ''}`);
    }
    console.log(`Dólares que se sacan de Juan y no se cargan a la caja: ${usdLines.length}`);
    for (const row of usdLines) console.log(row);

    if (!apply) {
        console.log('Sin cambios. Si Juan queda en cero y la caja conserva US$300,00:');
        console.log('NODE_ENV=production node migrations/revert_misassigned_other_incomes.js 1 --apply');
        await closeDatabase();
        return;
    }

    await executeQuery(
        `UPDATE account_transactions SET to_account_id = ?
         WHERE club_id = ? AND to_account_id = ? AND (currency IS NULL OR currency <> 'USD')`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE account_transactions SET from_account_id = ?
         WHERE club_id = ? AND from_account_id = ? AND (currency IS NULL OR currency <> 'USD')`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE account_transactions SET to_account_id = NULL
         WHERE club_id = ? AND to_account_id = ? AND currency = 'USD'`,
        [clubId, juanId]
    );
    await executeQuery(
        `UPDATE account_transactions SET from_account_id = NULL
         WHERE club_id = ? AND from_account_id = ? AND currency = 'USD'`,
        [clubId, juanId]
    );
    await executeQuery(
        `UPDATE currency_exchanges SET from_account_id = ?
         WHERE club_id = ? AND from_account_id = ? AND (from_currency IS NULL OR from_currency <> 'USD')`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE currency_exchanges SET to_account_id = ?
         WHERE club_id = ? AND to_account_id = ? AND (to_currency IS NULL OR to_currency <> 'USD')`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE currency_exchanges SET from_account_id = NULL
         WHERE club_id = ? AND from_account_id = ? AND from_currency = 'USD'`,
        [clubId, juanId]
    );
    await executeQuery(
        `UPDATE currency_exchanges SET to_account_id = NULL
         WHERE club_id = ? AND to_account_id = ? AND to_currency = 'USD'`,
        [clubId, juanId]
    );
    await executeQuery(
        `UPDATE other_incomes SET account_id = ?
         WHERE club_id = ? AND account_id = ? AND (currency IS NULL OR currency <> 'USD')`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE other_incomes SET account_id = NULL
         WHERE club_id = ? AND account_id = ? AND currency = 'USD'`,
        [clubId, juanId]
    );
    await executeQuery(
        `UPDATE club_expenses SET account_id = ?
         WHERE club_id = ? AND account_id = ? AND (currency IS NULL OR currency <> 'USD')`,
        [cajaId, clubId, juanId]
    );
    await executeQuery(
        `UPDATE club_expenses SET account_id = NULL
         WHERE club_id = ? AND account_id = ? AND currency = 'USD'`,
        [clubId, juanId]
    );

    const cajaAfter = after.get(cajaId) || { ars: 0, usd: 0 };
    await executeQuery(
        `UPDATE custodian_accounts SET current_balance_ars = ?, current_balance_usd = ? WHERE club_id = ? AND account_id = ?`,
        [cajaAfter.ars / 100, cajaAfter.usd / 100, clubId, cajaId]
    );
    await executeQuery(
        `UPDATE custodian_accounts SET current_balance_ars = 0, current_balance_usd = 0 WHERE club_id = ? AND account_id = ?`,
        [clubId, juanId]
    );

    console.log('Listo. Juan quedó en cero. Los pesos pasaron a Caja del Club y los US$300 siguen en el club.');
    await closeDatabase();
}

main().catch(async (error) => {
    console.error(error);
    try { await closeDatabase(); } catch (_e) { /* ya cerrado */ }
    process.exit(1);
});

/**
 * Auditoría: compara saldos en custodian_accounts (current_balance_*)
 * con el saldo recalculado desde account_transactions + currency_exchanges.
 *
 * Uso (desde la carpeta backend, con .env.dev / .env.prod o variables de entorno):
 *   node migrations/audit_custodian_balances.js <club_id>
 *   node migrations/audit_custodian_balances.js <club_id> --fix
 *
 * --fix actualiza current_balance_ars y current_balance_usd para alinear con el libro.
 * Hacer backup de la base antes de usar --fix.
 */
import '../src/config/env.js';
import { initializeDatabase, executeQuery, closeDatabase, executeTransaction } from '../src/config/database.js';

const normCur = (c) => (String(c || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS');

/** mysql2: DATE como objeto Date; no usar String(d).slice(0,10) para ordenar. */
function sqlDateString(v) {
    if (v == null || v === '') return '1970-01-01';
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(v);
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    return '1970-01-01';
}

function ensure(map, accountId) {
    if (accountId == null || accountId === '') return null;
    const id = Number(accountId);
    if (!Number.isFinite(id)) return null;
    if (!map.has(id)) map.set(id, { ars: 0, usd: 0 });
    return { id, bal: map.get(id) };
}

function addBal(bal, currency, delta) {
    if (!bal) return;
    const c = normCur(currency);
    if (c === 'USD') bal.usd += delta;
    else bal.ars += delta;
}

/**
 * Une movimientos del libro y conversiones en una sola línea de tiempo.
 * Misma idea que la reconstrucción de saldo en el frontend (Payments / informe).
 */
function buildExpectedBalances(transactions, exchanges) {
    const balances = new Map();
    const events = [];

    for (const tx of transactions) {
        const tid = Number(tx.transaction_id) || 0;
        events.push({
            sortDate: sqlDateString(tx.transaction_date),
            sortKey: tid,
            kind: 'tx',
            tx
        });
    }
    for (const ex of exchanges) {
        const eid = Number(ex.exchange_id) || 0;
        events.push({
            sortDate: sqlDateString(ex.exchange_date),
            sortKey: eid,
            kind: 'ex',
            ex
        });
    }

    events.sort((a, b) => {
        const c = a.sortDate.localeCompare(b.sortDate);
        if (c !== 0) return c;
        return a.sortKey - b.sortKey;
    });

    for (const ev of events) {
        if (ev.kind === 'tx') {
            const tx = ev.tx;
            const type = tx.transaction_type;
            const cur = tx.currency || 'ARS';
            const amount = Number(tx.amount || 0);
            const fromId = tx.from_account_id != null ? Number(tx.from_account_id) : null;
            const toId = tx.to_account_id != null ? Number(tx.to_account_id) : null;

            if (type === 'income_tournament' || type === 'income_other') {
                const to = ensure(balances, toId);
                if (to) addBal(to.bal, cur, amount);
            } else if (type === 'expense') {
                const from = ensure(balances, fromId);
                if (from) addBal(from.bal, cur, -amount);
            } else if (type === 'transfer') {
                const from = ensure(balances, fromId);
                const to = ensure(balances, toId);
                if (from) addBal(from.bal, cur, -amount);
                if (to) addBal(to.bal, cur, amount);
            } else if (type === 'exchange') {
                // Raro: las conversiones suelen estar solo en currency_exchanges.
                const fromCurrency = normCur(tx.from_currency || cur);
                const toCurrency = normCur(tx.to_currency || cur);
                const fromAmount = Number(tx.from_amount != null ? tx.from_amount : amount);
                const toAmount = Number(tx.to_amount != null ? tx.to_amount : amount);
                const from = ensure(balances, fromId);
                const to = ensure(balances, toId);
                if (from) addBal(from.bal, fromCurrency, -fromAmount);
                if (to) addBal(to.bal, toCurrency, toAmount);
            }
        } else {
            const ex = ev.ex;
            const from = ensure(balances, ex.from_account_id);
            const to = ensure(balances, ex.to_account_id);
            const fromAmt = Number(ex.from_amount || 0);
            const toAmt = Number(ex.to_amount || 0);
            if (from) addBal(from.bal, ex.from_currency, -fromAmt);
            if (to) addBal(to.bal, ex.to_currency, toAmt);
        }
    }

    return balances;
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

async function main() {
    const args = process.argv.slice(2).filter((a) => a !== '--fix');
    const doFix = process.argv.includes('--fix');
    const clubId = parseInt(args[0], 10);
    if (!clubId || Number.isNaN(clubId)) {
        console.error('Uso: node migrations/audit_custodian_balances.js <club_id> [--fix]');
        process.exit(1);
    }

    await initializeDatabase();

    const { rows: accounts } = await executeQuery(
        `SELECT account_id, account_name, current_balance_ars, current_balance_usd, is_active
         FROM custodian_accounts WHERE club_id = ? ORDER BY account_name`,
        [clubId]
    );

    const { rows: transactions } = await executeQuery(
        `SELECT transaction_id, transaction_type, transaction_date, amount, currency,
                from_account_id, to_account_id
         FROM account_transactions
         WHERE club_id = ?
         ORDER BY transaction_date ASC, transaction_id ASC`,
        [clubId]
    );

    let exchanges = [];
    try {
        const { rows } = await executeQuery(
            `SELECT exchange_id, exchange_date, from_account_id, to_account_id,
                    from_currency, from_amount, to_currency, to_amount
             FROM currency_exchanges
             WHERE club_id = ?
             ORDER BY exchange_date ASC, exchange_id ASC`,
            [clubId]
        );
        exchanges = rows;
    } catch (e) {
        console.warn('ℹ️ currency_exchanges:', e.message);
    }

    const expected = buildExpectedBalances(transactions, exchanges);

    console.log(`\n🔍 Auditoría de saldos — club_id=${clubId}`);
    console.log(`   Movimientos en libro: ${transactions.length}, conversiones: ${exchanges.length}\n`);

    const mismatches = [];
    for (const acc of accounts) {
        const id = Number(acc.account_id);
        const exp = expected.get(id) || { ars: 0, usd: 0 };
        const dbArs = round2(acc.current_balance_ars);
        const dbUsd = round2(acc.current_balance_usd);
        const exArs = round2(exp.ars);
        const exUsd = round2(exp.usd);
        const dArs = round2(dbArs - exArs);
        const dUsd = round2(dbUsd - exUsd);

        const bad = Math.abs(dArs) > 0.02 || Math.abs(dUsd) > 0.02;
        const flag = acc.is_active ? '' : ' (inactiva)';
        if (bad) {
            mismatches.push({
                id,
                name: acc.account_name + flag,
                dbArs,
                dbUsd,
                exArs,
                exUsd,
                dArs,
                dUsd
            });
        }
        const mark = bad ? '❌' : '✅';
        console.log(
            `${mark} [${id}] ${acc.account_name}${flag}\n` +
                `    BD   ARS ${dbArs.toLocaleString('es-AR')} | USD ${dbUsd.toLocaleString('es-AR')}\n` +
                `    Libro ARS ${exArs.toLocaleString('es-AR')} | USD ${exUsd.toLocaleString('es-AR')}\n` +
                (bad ? `    Δ    ARS ${dArs.toLocaleString('es-AR')} | USD ${dUsd.toLocaleString('es-AR')}\n` : '')
        );
    }

    const unknownIds = [...expected.keys()].filter(
        (id) => !accounts.some((a) => Number(a.account_id) === id)
    );
    if (unknownIds.length) {
        console.log('\n⚠️ Hay movimientos en cuentas que no existen o no son de este listado:');
        for (const id of unknownIds) {
            const b = expected.get(id);
            if (round2(b.ars) !== 0 || round2(b.usd) !== 0) {
                console.log(`   account_id ${id}: ARS ${b.ars}, USD ${b.usd} (revisar ID en movimientos)`);
            }
        }
    }

    if (mismatches.length === 0) {
        console.log('\n✅ No hay diferencias relevantes (±0,02): los saldos en BD coinciden con el libro recalculado.');
    } else {
        console.log(
            `\n❌ ${mismatches.length} cuenta(s) con diferencia BD vs libro. Revisá gastos/ingresos sin transacción, ` +
                `cambios manuales en MySQL o bugs viejos antes de alinear.`
        );
        if (doFix) {
            const ops = mismatches.map((m) => ({
                query: `UPDATE custodian_accounts SET current_balance_ars = ?, current_balance_usd = ? WHERE club_id = ? AND account_id = ?`,
                params: [m.exArs, m.exUsd, clubId, m.id]
            }));
            await executeTransaction(ops);
            console.log('✅ Saldos actualizados desde el libro recalculado (--fix). Verificá en la app.');
        } else {
            console.log('   Para alinear automáticamente (con backup previo): añadí --fix al comando.');
        }
    }

    await closeDatabase();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

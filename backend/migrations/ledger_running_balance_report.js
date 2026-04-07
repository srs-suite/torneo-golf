/**
 * Recorre el libro en orden y muestra el saldo corrido ARS/USD para UNA cuenta
 * (sin sumar a mano). Al final compara con custodian_accounts.
 *
 * Además lista posibles duplicados de asiento (mismo reference_type + reference_id).
 *
 * Uso:
 *   NODE_ENV=production node migrations/ledger_running_balance_report.js <club_id> <account_id>
 *   NODE_ENV=production node migrations/ledger_running_balance_report.js 1 2 --csv > juan_ledger.csv
 *
 * --csv  salida separada por ; (Excel ES) sin colores
 */
import '../src/config/env.js';
import { initializeDatabase, executeQuery, closeDatabase } from '../src/config/database.js';

const normCur = (c) => (String(c || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS');

/** mysql2 devuelve DATE como Date; String(date).slice(0,10) da "Fri Dec 26" y rompe el orden. */
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

function deltaForAccountFromTx(tx, accountId) {
    const aid = Number(accountId);
    let dArs = 0;
    let dUsd = 0;
    const add = (cur, d) => {
        if (normCur(cur) === 'USD') dUsd += d;
        else dArs += d;
    };

    const type = tx.transaction_type;
    const cur = tx.currency || 'ARS';
    const amount = Number(tx.amount || 0);
    const fromId = tx.from_account_id != null ? Number(tx.from_account_id) : null;
    const toId = tx.to_account_id != null ? Number(tx.to_account_id) : null;

    if (type === 'income_tournament' || type === 'income_other') {
        if (toId === aid) add(cur, amount);
    } else if (type === 'expense') {
        if (fromId === aid) add(cur, -amount);
    } else if (type === 'transfer') {
        if (fromId === aid) add(cur, -amount);
        if (toId === aid) add(cur, amount);
    } else if (type === 'exchange') {
        const fc = normCur(tx.from_currency || cur);
        const tc = normCur(tx.to_currency || cur);
        const fa = Number(tx.from_amount != null ? tx.from_amount : amount);
        const ta = Number(tx.to_amount != null ? tx.to_amount : amount);
        if (fromId === aid) add(fc, -fa);
        if (toId === aid) add(tc, ta);
    }
    return { dArs, dUsd };
}

function deltaForAccountFromEx(ex, accountId) {
    const aid = Number(accountId);
    let dArs = 0;
    let dUsd = 0;
    const fromId = ex.from_account_id != null ? Number(ex.from_account_id) : null;
    const toId = ex.to_account_id != null ? Number(ex.to_account_id) : null;
    const fa = Number(ex.from_amount || 0);
    const ta = Number(ex.to_amount || 0);
    const add = (cur, d) => {
        if (normCur(cur) === 'USD') dUsd += d;
        else dArs += d;
    };
    if (fromId === aid) add(ex.from_currency, -fa);
    if (toId === aid) add(ex.to_currency, ta);
    return { dArs, dUsd };
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

async function main() {
    const argv = process.argv.slice(2).filter((a) => a !== '--csv');
    const asCsv = process.argv.includes('--csv');
    const clubId = parseInt(argv[0], 10);
    const accountId = parseInt(argv[1], 10);
    if (!clubId || !accountId || Number.isNaN(clubId) || Number.isNaN(accountId)) {
        console.error('Uso: node migrations/ledger_running_balance_report.js <club_id> <account_id> [--csv]');
        process.exit(1);
    }

    await initializeDatabase();

    const { rows: accRows } = await executeQuery(
        `SELECT account_id, account_name, current_balance_ars, current_balance_usd FROM custodian_accounts WHERE club_id = ? AND account_id = ?`,
        [clubId, accountId]
    );
    if (!accRows.length) {
        console.error('Cuenta no encontrada');
        await closeDatabase();
        process.exit(1);
    }
    const acc = accRows[0];

    const { rows: transactions } = await executeQuery(
        `SELECT transaction_id, transaction_type, transaction_date, amount, currency,
                from_account_id, to_account_id, description, reference_type, reference_id
         FROM account_transactions WHERE club_id = ? ORDER BY transaction_date ASC, transaction_id ASC`,
        [clubId]
    );

    let exchanges = [];
    try {
        const { rows } = await executeQuery(
            `SELECT exchange_id, exchange_date, from_account_id, to_account_id,
                    from_currency, from_amount, to_currency, to_amount, notes
             FROM currency_exchanges WHERE club_id = ? ORDER BY exchange_date ASC, exchange_id ASC`,
            [clubId]
        );
        exchanges = rows;
    } catch (_) {
        /* no tabla */
    }

    const events = [];
    for (const tx of transactions) {
        events.push({
            sortDate: sqlDateString(tx.transaction_date),
            sortKey: Number(tx.transaction_id) || 0,
            kind: 'tx',
            tx
        });
    }
    for (const ex of exchanges) {
        events.push({
            sortDate: sqlDateString(ex.exchange_date),
            sortKey: Number(ex.exchange_id) || 0,
            kind: 'ex',
            ex
        });
    }
    events.sort((a, b) => {
        const c = a.sortDate.localeCompare(b.sortDate);
        if (c !== 0) return c;
        return a.sortKey - b.sortKey;
    });

    let runArs = 0;
    let runUsd = 0;
    const lines = [];

    const pushLine = (cols) => {
        lines.push(cols);
        if (!asCsv) {
            console.log(cols.join(' | '));
        }
    };

    if (asCsv) {
        lines.push(
            ['fecha', 'tipo', 'id', 'd_ARS', 'd_USD', 'saldo_ARS', 'saldo_USD', 'detalle'].join(';')
        );
    } else {
        console.log(`\nCuenta: ${acc.account_name} (id=${accountId})`);
        console.log(`Saldos en BD: ARS ${acc.current_balance_ars} | USD ${acc.current_balance_usd}`);
        console.log('--- Saldo corrido desde libro (solo movimientos que tocan esta cuenta) ---\n');
    }

    for (const ev of events) {
        let dArs = 0;
        let dUsd = 0;
        let label = '';
        let id = '';
        let tipo = '';

        if (ev.kind === 'tx') {
            const tx = ev.tx;
            const d = deltaForAccountFromTx(tx, accountId);
            dArs = d.dArs;
            dUsd = d.dUsd;
            if (dArs === 0 && dUsd === 0) continue;
            id = String(tx.transaction_id);
            tipo = tx.transaction_type;
            label = (tx.description || '').replace(/\s+/g, ' ').slice(0, 80);
        } else {
            const ex = ev.ex;
            const d = deltaForAccountFromEx(ex, accountId);
            dArs = d.dArs;
            dUsd = d.dUsd;
            if (dArs === 0 && dUsd === 0) continue;
            id = `EX${ex.exchange_id}`;
            tipo = 'exchange';
            label = (ex.notes || `${ex.from_amount} ${ex.from_currency} -> ${ex.to_amount} ${ex.to_currency}`).replace(/\s+/g, ' ').slice(0, 80);
        }

        runArs += dArs;
        runUsd += dUsd;

        if (asCsv) {
            lines.push(
                [
                    ev.sortDate,
                    tipo,
                    id,
                    round2(dArs).toFixed(2),
                    round2(dUsd).toFixed(2),
                    round2(runArs).toFixed(2),
                    round2(runUsd).toFixed(2),
                    `"${label.replace(/"/g, '""')}"`
                ].join(';')
            );
        } else {
            pushLine([
                ev.sortDate,
                tipo,
                id,
                `ΔARS ${round2(dArs).toLocaleString('es-AR')}`,
                `ΔUSD ${round2(dUsd).toLocaleString('es-AR')}`,
                `=> ARS ${round2(runArs).toLocaleString('es-AR')}`,
                `USD ${round2(runUsd).toLocaleString('es-AR')}`,
                label
            ]);
        }
    }

    if (asCsv) {
        console.log(lines.join('\n'));
    }

    const diffArs = round2(Number(acc.current_balance_ars) - runArs);
    const diffUsd = round2(Number(acc.current_balance_usd) - runUsd);

    if (!asCsv) {
        console.log('\n--- Totales ---');
        console.log(`Libro (recorrido): ARS ${round2(runArs).toLocaleString('es-AR')} | USD ${round2(runUsd).toLocaleString('es-AR')}`);
        console.log(`Base (custodian):  ARS ${round2(Number(acc.current_balance_ars)).toLocaleString('es-AR')} | USD ${round2(Number(acc.current_balance_usd)).toLocaleString('es-AR')}`);
        console.log(`Diferencia BD - libro: ARS ${diffArs.toLocaleString('es-AR')} | USD ${diffUsd.toLocaleString('es-AR')}`);
    }

    const { rows: dups } = await executeQuery(
        `SELECT transaction_type, reference_type, reference_id, COUNT(*) AS n,
                GROUP_CONCAT(transaction_id ORDER BY transaction_id) AS ids
         FROM account_transactions
         WHERE club_id = ? AND reference_id IS NOT NULL AND reference_type IS NOT NULL
           AND (from_account_id = ? OR to_account_id = ?)
         GROUP BY transaction_type, reference_type, reference_id
         HAVING n > 1`,
        [clubId, accountId, accountId]
    );

    if (!asCsv && dups.length) {
        console.log('\n⚠️ Posibles duplicados (mismo tipo + reference_*):');
        dups.forEach((r) => console.log(`   ${r.reference_type} ref ${r.reference_id}: ${r.n} veces, transaction_ids ${r.ids}`));
    } else if (!asCsv) {
        console.log('\n✅ No hay grupos duplicados reference_type+reference_id para esta cuenta.');
    }

    await closeDatabase();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

/**
 * El ajuste de Colombo reasignó otros ingresos a la cuenta guardada en el ingreso.
 * El saldo de pantalla es la suma de los movimientos, así que Juan quedó con plata
 * y Caja del Club con menos, sin que se borrara ningún movimiento.
 *
 * Este script busca los otros ingresos en pesos que están en Juan Castro Videla
 * y que explican todo su saldo actual. Si hay una sola combinación, los devuelve
 * a Caja del Club. No toca dólares ni borra filas.
 *
 * Desde la carpeta backend, en el servidor:
 *   node migrations/revert_misassigned_other_incomes.js 1
 *   node migrations/revert_misassigned_other_incomes.js 1 --apply
 */
import '../src/config/env.js';
import { initializeDatabase, executeQuery, closeDatabase } from '../src/config/database.js';

function cents(value) {
    return Math.round(Number(value || 0) * 100);
}

function pesos(c) {
    return (c / 100).toFixed(2);
}

function findUniqueSubset(amounts, target) {
    const n = amounts.length;
    if (target === 0) return { status: 'zero' };
    if (n === 0) return { status: 'none' };
    if (n > 40) return { status: 'too-many', n };

    const mid = Math.floor(n / 2);
    const enumerate = (items, offset) => {
        const out = [];
        const total = 1 << items.length;
        for (let mask = 0; mask < total; mask++) {
            let sum = 0;
            const indexes = [];
            for (let i = 0; i < items.length; i++) {
                if (mask & (1 << i)) {
                    sum += items[i];
                    indexes.push(offset + i);
                }
            }
            out.push({ sum, indexes });
        }
        return out;
    };

    const left = enumerate(amounts.slice(0, mid), 0);
    const right = enumerate(amounts.slice(mid), mid);
    const rightMap = new Map();
    for (const row of right) {
        const list = rightMap.get(row.sum);
        if (list) list.push(row.indexes);
        else rightMap.set(row.sum, [row.indexes]);
    }

    let found = null;
    let ways = 0;
    for (const row of left) {
        const hits = rightMap.get(target - row.sum);
        if (!hits) continue;
        for (const indexes of hits) {
            ways += 1;
            if (ways === 1) found = row.indexes.concat(indexes);
            if (ways > 1) return { status: 'many' };
        }
    }
    if (ways === 1) return { status: 'one', indexes: found };
    return { status: 'none' };
}

function addArs(map, accountId, deltaCents) {
    if (accountId == null) return;
    const id = Number(accountId);
    if (!Number.isFinite(id)) return;
    map.set(id, (map.get(id) || 0) + deltaCents);
}

async function main() {
    const apply = process.argv.includes('--apply');
    const clubId = parseInt(process.argv.slice(2).find((arg) => arg !== '--apply'), 10);
    if (!clubId || Number.isNaN(clubId)) {
        console.error('Uso: node migrations/revert_misassigned_other_incomes.js <club_id> [--apply]');
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
        console.error('No encontré la cuenta Juan Castro Videla o Caja del Club.');
        await closeDatabase();
        process.exit(1);
    }

    const { rows: txs } = await executeQuery(
        `SELECT transaction_id, transaction_type, transaction_date, amount, currency,
                from_account_id, to_account_id, description
         FROM account_transactions WHERE club_id = ?`,
        [clubId]
    );
    const { rows: exchanges } = await executeQuery(
        `SELECT from_account_id, to_account_id, from_currency, from_amount, to_currency, to_amount
         FROM currency_exchanges WHERE club_id = ?`,
        [clubId]
    );

    const ars = new Map();
    const usd = new Map();
    const add = (accountId, currency, deltaCents) => {
        if ((currency || 'ARS') === 'ARS') addArs(ars, accountId, deltaCents);
        else addArs(usd, accountId, deltaCents);
    };

    for (const tx of txs) {
        const amount = cents(tx.amount);
        const currency = tx.currency || 'ARS';
        const fromId = tx.from_account_id;
        const toId = tx.to_account_id;
        if (tx.transaction_type === 'income_tournament' || tx.transaction_type === 'income_other') {
            add(toId, currency, amount);
        } else if (tx.transaction_type === 'expense') {
            add(fromId, currency, -amount);
        } else if (tx.transaction_type === 'transfer') {
            add(fromId, currency, -amount);
            add(toId, currency, amount);
        }
    }
    for (const ex of exchanges) {
        add(ex.from_account_id, ex.from_currency || 'ARS', -cents(ex.from_amount));
        add(ex.to_account_id, ex.to_currency || 'ARS', cents(ex.to_amount));
    }

    const juanArs = ars.get(Number(juan.account_id)) || 0;
    const cajaArs = ars.get(Number(caja.account_id)) || 0;
    const juanUsd = usd.get(Number(juan.account_id)) || 0;
    console.log(`Juan Castro Videla: $${pesos(juanArs)}  US$${pesos(juanUsd)}`);
    console.log(`Caja del Club:      $${pesos(cajaArs)}`);

    const candidates = txs.filter((tx) =>
        tx.transaction_type === 'income_other'
        && Number(tx.to_account_id) === Number(juan.account_id)
        && (tx.currency || 'ARS') === 'ARS'
        && cents(tx.amount) > 0
    );
    console.log(`Otros ingresos en pesos hoy asignados a Juan: ${candidates.length}`);
    for (const tx of candidates) {
        const date = tx.transaction_date instanceof Date
            ? tx.transaction_date.toISOString().slice(0, 10)
            : String(tx.transaction_date).slice(0, 10);
        console.log(`  #${tx.transaction_id}  ${date}  $${Number(tx.amount).toFixed(2)}  ${tx.description || ''}`);
    }

    const subset = findUniqueSubset(candidates.map((tx) => cents(tx.amount)), juanArs);
    if (subset.status !== 'one') {
        console.log(`No hay una sola combinación de esos ingresos que sume el saldo de Juan (${subset.status}). No modifiqué nada.`);
        await closeDatabase();
        process.exit(subset.status === 'zero' ? 0 : 2);
    }

    const chosen = subset.indexes.map((index) => candidates[index]);
    const total = chosen.reduce((sum, tx) => sum + cents(tx.amount), 0);
    console.log(`Hay que devolver a Caja del Club ${chosen.length} ingresos, total $${pesos(total)}:`);
    for (const tx of chosen) {
        console.log(`  #${tx.transaction_id}  $${Number(tx.amount).toFixed(2)}  ${tx.description || ''}`);
    }

    if (!apply) {
        console.log('Sin cambios. Para aplicarlos: node migrations/revert_misassigned_other_incomes.js 1 --apply');
        await closeDatabase();
        return;
    }

    for (const tx of chosen) {
        const amount = Number(tx.amount);
        await executeQuery(
            `UPDATE account_transactions
             SET to_account_id = ?
             WHERE transaction_id = ? AND club_id = ? AND to_account_id = ?`,
            [caja.account_id, tx.transaction_id, clubId, juan.account_id]
        );
        await executeQuery(
            `UPDATE custodian_accounts
             SET current_balance_ars = current_balance_ars - ?
             WHERE account_id = ? AND club_id = ?`,
            [amount, juan.account_id, clubId]
        );
        await executeQuery(
            `UPDATE custodian_accounts
             SET current_balance_ars = current_balance_ars + ?
             WHERE account_id = ? AND club_id = ?`,
            [amount, caja.account_id, clubId]
        );
    }

    console.log('Listo. Esos ingresos volvieron a Caja del Club. Juan queda en $0 en pesos por esos movimientos.');
    await closeDatabase();
}

main().catch(async (error) => {
    console.error(error);
    try { await closeDatabase(); } catch (_e) { /* ya cerrado */ }
    process.exit(1);
});

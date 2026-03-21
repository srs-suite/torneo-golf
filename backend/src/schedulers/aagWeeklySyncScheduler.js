/**
 * Sync masivo AAG programado (solo producción + flag explícito).
 * Reutiliza syncAllHandicapsFromAag; no toca torneos ni históricos.
 */
import cron from 'node-cron';
import { syncAllHandicapsFromAag } from '../services/aagSync.js';
import { executeQuery } from '../config/database.js';

const DEFAULT_CRON = '0 6 * * 4';
const DEFAULT_CLUB_ID = 1;

/** Lock en system_settings (evita dos cron en paralelo) */
const LOCK_KEY = 'aag_sync_running';
const LOCK_IDLE = '0';
const LOCK_RUNNING = '1';

function affectedRows(result) {
    const r = result?.rows;
    if (r && typeof r.affectedRows === 'number') return r.affectedRows;
    return 0;
}

async function ensureAagSyncLockRow() {
    await executeQuery(
        `INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
         VALUES (?, ?, 'string', 'Lock: sincronización AAG masiva en curso')
         ON DUPLICATE KEY UPDATE updated_at = updated_at`,
        [LOCK_KEY, LOCK_IDLE]
    );
}

/**
 * Intenta marcar lock en '1'. Gana si estaba libre ('0') o el lock es viejo (> 2 h).
 * @returns {Promise<boolean>} true si affectedRows === 1
 */
async function acquireAagSyncLock() {
    const res = await executeQuery(
        `UPDATE system_settings
         SET setting_value = '1', updated_at = NOW()
         WHERE setting_key = ?
         AND (
           setting_value = '0'
           OR updated_at < NOW() - INTERVAL 2 HOUR
         )`,
        [LOCK_KEY]
    );
    return affectedRows(res) === 1;
}

async function releaseAagSyncLock() {
    await executeQuery(
        `UPDATE system_settings
         SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
         WHERE setting_key = ?`,
        [LOCK_IDLE, LOCK_KEY]
    );
}

function insertIdFromResult(result) {
    const id = result?.rows?.insertId;
    if (id == null || id === undefined) return null;
    return typeof id === 'bigint' ? Number(id) : id;
}

async function insertAagSyncLogStart(clubId) {
    const res = await executeQuery(
        `INSERT INTO aag_sync_logs (club_id, started_at) VALUES (?, NOW())`,
        [clubId]
    );
    return insertIdFromResult(res);
}

/**
 * @param {number} logId
 * @param {{ status: 'SUCCESS' | 'ERROR', total_processed: number | null, synced: number | null, errors: number | null }} payload
 */
async function finishAagSyncLog(logId, payload) {
    await executeQuery(
        `UPDATE aag_sync_logs SET
            finished_at = NOW(),
            total_processed = ?,
            synced = ?,
            errors = ?,
            status = ?
         WHERE id = ?`,
        [
            payload.total_processed,
            payload.synced,
            payload.errors,
            payload.status,
            logId
        ]
    );
}

async function safeFinishAagSyncLog(logId, payload) {
    try {
        await finishAagSyncLog(logId, payload);
    } catch (e) {
        console.error('[AAG weekly sync] Error actualizando aag_sync_logs:', e?.message || e);
    }
}

function parseClubId() {
    const raw = process.env.AAG_WEEKLY_SYNC_CLUB_ID;
    const n = parseInt(String(raw !== undefined && raw !== '' ? raw : DEFAULT_CLUB_ID), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Inicializa el cron. No lanza hacia arriba: errores solo en consola.
 */
export function startAagWeeklySyncScheduler() {
    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[AAG weekly sync] Omitido: NODE_ENV no es production');
            return;
        }

        if (String(process.env.AAG_WEEKLY_SYNC_ENABLED || '').toLowerCase() !== 'true') {
            console.log('[AAG weekly sync] Deshabilitado (AAG_WEEKLY_SYNC_ENABLED !== "true")');
            return;
        }

        const cronExpr = (process.env.AAG_WEEKLY_SYNC_CRON || DEFAULT_CRON).trim();
        const clubId = parseClubId();

        if (clubId == null) {
            console.error('[AAG weekly sync] AAG_WEEKLY_SYNC_CLUB_ID inválido; scheduler no iniciado');
            return;
        }

        if (typeof cron.validate === 'function' && !cron.validate(cronExpr)) {
            console.error('[AAG weekly sync] Expresión cron inválida:', cronExpr);
            return;
        }

        cron.schedule(cronExpr, async () => {
            console.log('[AAG weekly sync] Inicio job programado', { clubId, cron: cronExpr });

            let lockAcquired = false;
            try {
                await ensureAagSyncLockRow();
                lockAcquired = await acquireAagSyncLock();
                if (!lockAcquired) {
                    console.log('[AAG weekly sync] ya en ejecución');
                    return;
                }
            } catch (e) {
                console.error('[AAG weekly sync] Error obteniendo lock:', e?.message || e);
                return;
            }

            let logId = null;
            try {
                logId = await insertAagSyncLogStart(clubId);
                if (logId == null) {
                    throw new Error('insertId no disponible en aag_sync_logs');
                }
            } catch (e) {
                console.error('[AAG weekly sync] Error insertando aag_sync_logs:', e?.message || e);
            }

            if (logId != null) {
                try {
                    const result = await syncAllHandicapsFromAag(clubId);
                    if (result.success && result.data) {
                        const d = result.data;
                        console.log('[AAG weekly sync] Finalizado OK', d);
                        await safeFinishAagSyncLog(logId, {
                            status: 'SUCCESS',
                            total_processed: d.totalProcessed ?? null,
                            synced: d.synced ?? null,
                            errors: d.errors ?? null
                        });
                    } else {
                        console.error('[AAG weekly sync] Job sin éxito', result.error || result);
                        await safeFinishAagSyncLog(logId, {
                            status: 'ERROR',
                            total_processed: null,
                            synced: null,
                            errors: null
                        });
                    }
                } catch (e) {
                    console.error('[AAG weekly sync] Error en job:', e?.message || e);
                    await safeFinishAagSyncLog(logId, {
                        status: 'ERROR',
                        total_processed: null,
                        synced: null,
                        errors: null
                    });
                }
            }

            if (lockAcquired) {
                try {
                    await releaseAagSyncLock();
                } catch (e) {
                    console.error('[AAG weekly sync] Error liberando lock:', e?.message || e);
                }
            }
        });

        console.log('[AAG weekly sync] Scheduler activo (zona horaria del servidor)', {
            cron: cronExpr,
            clubId
        });
    } catch (e) {
        console.error('[AAG weekly sync] No se pudo inicializar scheduler:', e?.message || e);
    }
}

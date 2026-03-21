/**
 * Sincronización de handicap/index desde AAG hacia members / external_players.
 * No modifica tournament_participants, handicap_used ni handicap_index_used.
 * No modifica handicap_local.
 */
import { executeQuery } from '../config/database.js';
import { lookupAagHandicapByMemberNumber } from './aagProvider.js';

function truncateMsg(msg, max = 255) {
    const s = String(msg ?? '');
    return s.length <= max ? s : s.slice(0, max);
}

function isValidHandicapIndex(v) {
    if (v === null || v === undefined || v === '') return false;
    const x = Number(v);
    return Number.isFinite(x) && !Number.isNaN(x);
}

function normalizePreviousIndex(v) {
    if (v === null || v === undefined || v === '') return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
}

/**
 * Sincroniza el índice actual del jugador consultando el proveedor AAG (mock o real).
 *
 * @param {{ courseId: number, playerType: string, playerId: number }} params
 * @returns {Promise<{ success: boolean, data?: object, error?: object, httpStatus?: number }>}
 */
export async function syncPlayerHandicapFromAag({ courseId, playerType, playerId }) {
    const courseIdNum = parseInt(String(courseId), 10);
    const playerIdNum = parseInt(String(playerId), 10);
    const type = String(playerType || '').toLowerCase().trim();

    if (!Number.isFinite(courseIdNum) || courseIdNum <= 0) {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'INVALID_COURSE_ID', message: 'courseId inválido' }
        };
    }
    if (!Number.isFinite(playerIdNum) || playerIdNum <= 0) {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'INVALID_PLAYER_ID', message: 'playerId inválido' }
        };
    }
    if (type !== 'member' && type !== 'external') {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'INVALID_PLAYER_TYPE', message: 'playerType debe ser "member" o "external"' }
        };
    }

    let row;
    let updateTable;
    let idColumn;
    const idVal = playerIdNum;

    if (type === 'member') {
        const { rows } = await executeQuery(
            `SELECT member_id, member_number, handicap_index
             FROM members
             WHERE member_id = ? AND course_id = ?
             LIMIT 1`,
            [idVal, courseIdNum]
        );
        row = rows && rows[0];
        if (!row) {
            return {
                success: false,
                httpStatus: 404,
                error: { code: 'MEMBER_NOT_FOUND', message: 'Socio no encontrado en este club' }
            };
        }
        updateTable = 'members';
        idColumn = 'member_id';
    } else {
        const { rows } = await executeQuery(
            `SELECT external_id, member_number, handicap_index
             FROM external_players
             WHERE external_id = ?
             LIMIT 1`,
            [idVal]
        );
        row = rows && rows[0];
        if (!row) {
            return {
                success: false,
                httpStatus: 404,
                error: { code: 'EXTERNAL_NOT_FOUND', message: 'Jugador externo no encontrado' }
            };
        }
        updateTable = 'external_players';
        idColumn = 'external_id';
    }

    const memberNumberRaw = row.member_number != null ? String(row.member_number).trim() : '';
    const previousIndex = normalizePreviousIndex(row.handicap_index);
    const checkedAtIso = new Date().toISOString();

    if (!memberNumberRaw) {
        return {
            success: false,
            httpStatus: 400,
            error: {
                code: 'NO_MEMBER_NUMBER',
                message: 'El jugador no tiene matrícula (member_number) cargada para consultar AAG'
            },
            data: {
                playerType: type,
                playerId: idVal,
                memberNumber: null,
                previousIndex,
                newIndex: previousIndex,
                aagStatus: 'ERROR',
                message: 'Sin matrícula para consulta AAG',
                checkedAt: checkedAtIso
            }
        };
    }

    let lookup;
    try {
        lookup = await lookupAagHandicapByMemberNumber(memberNumberRaw);
    } catch (e) {
        lookup = {
            found: false,
            handicapIndex: null,
            status: 'ERROR',
            message: e?.message || 'Error en proveedor AAG'
        };
    }

    const aagStatus = lookup.status || 'ERROR';
    const msg = truncateMsg(lookup.message || '');

    const shouldSetIndex =
        aagStatus === 'SYNCED' && isValidHandicapIndex(lookup.handicapIndex);

    let newIndex = previousIndex;

    try {
        if (shouldSetIndex) {
            newIndex = Number(lookup.handicapIndex);
            if (type === 'member') {
                await executeQuery(
                    `UPDATE members SET
                        handicap_index = ?,
                        aag_last_check_at = CURRENT_TIMESTAMP,
                        aag_sync_status = ?,
                        aag_sync_message = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE member_id = ? AND course_id = ?`,
                    [newIndex, aagStatus, msg, idVal, courseIdNum]
                );
            } else {
                await executeQuery(
                    `UPDATE external_players SET
                        handicap_index = ?,
                        aag_last_check_at = CURRENT_TIMESTAMP,
                        aag_sync_status = ?,
                        aag_sync_message = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE external_id = ?`,
                    [newIndex, aagStatus, msg, idVal]
                );
            }
        } else {
            if (type === 'member') {
                await executeQuery(
                    `UPDATE members SET
                        aag_last_check_at = CURRENT_TIMESTAMP,
                        aag_sync_status = ?,
                        aag_sync_message = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE member_id = ? AND course_id = ?`,
                    [aagStatus, msg, idVal, courseIdNum]
                );
            } else {
                await executeQuery(
                    `UPDATE external_players SET
                        aag_last_check_at = CURRENT_TIMESTAMP,
                        aag_sync_status = ?,
                        aag_sync_message = ?,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE external_id = ?`,
                    [aagStatus, msg, idVal]
                );
            }
        }
    } catch (e) {
        if (e && e.code === 'ER_BAD_FIELD_ERROR') {
            return {
                success: false,
                httpStatus: 500,
                error: {
                    code: 'AAG_COLUMNS_MISSING',
                    message:
                        'Faltan columnas AAG en la base (aag_last_check_at / aag_sync_status / aag_sync_message). Ejecutá los ALTER indicados.'
                }
            };
        }
        throw e;
    }

    const userMessage =
        aagStatus === 'SYNCED' && shouldSetIndex
            ? 'Index actualizado correctamente'
            : msg || `Estado AAG: ${aagStatus}`;

    return {
        success: true,
        data: {
            playerType: type,
            playerId: idVal,
            memberNumber: memberNumberRaw,
            previousIndex,
            newIndex,
            aagStatus,
            message: userMessage,
            checkedAt: checkedAtIso
        }
    };
}

/**
 * Sincronización masiva AAG para un club: todos los socios con matrícula y todos los externos con matrícula.
 * Reutiliza syncPlayerHandicapFromAag por jugador (secuencial). No toca torneos ni handicap_local.
 *
 * @param {number} courseId clubId / course_id
 * @returns {Promise<{ success: boolean, data?: object, error?: object, httpStatus?: number }>}
 */
export async function syncAllHandicapsFromAag(courseId) {
    const courseIdNum = parseInt(String(courseId), 10);
    if (!Number.isFinite(courseIdNum) || courseIdNum <= 0) {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'INVALID_COURSE_ID', message: 'courseId inválido' }
        };
    }

    console.log('AAG mass sync started', { courseId: courseIdNum });

    const summary = {
        membersProcessed: 0,
        externalsProcessed: 0,
        totalProcessed: 0,
        synced: 0,
        noIndex: 0,
        notFound: 0,
        errors: 0,
        skippedNoMemberNumber: 0
    };

    const countSkippedMembers = await executeQuery(
        `SELECT COUNT(*) AS c FROM members
         WHERE course_id = ?
           AND (member_number IS NULL OR TRIM(member_number) = '')`,
        [courseIdNum]
    );
    const countSkippedExt = await executeQuery(
        `SELECT COUNT(*) AS c FROM external_players
         WHERE member_number IS NULL OR TRIM(member_number) = ''`,
        []
    );
    summary.skippedNoMemberNumber =
        Number(countSkippedMembers.rows?.[0]?.c || 0) + Number(countSkippedExt.rows?.[0]?.c || 0);

    const { rows: memberRows } = await executeQuery(
        `SELECT member_id FROM members
         WHERE course_id = ?
           AND member_number IS NOT NULL
           AND TRIM(member_number) <> ''
         ORDER BY member_id`,
        [courseIdNum]
    );

    const { rows: externalRows } = await executeQuery(
        `SELECT external_id FROM external_players
         WHERE member_number IS NOT NULL
           AND TRIM(member_number) <> ''
         ORDER BY external_id`,
        []
    );

    const classify = (result) => {
        if (!result.success) {
            if (result.error?.code === 'NO_MEMBER_NUMBER') {
                summary.skippedNoMemberNumber += 1;
            } else {
                summary.errors += 1;
            }
            return;
        }
        const st = result.data?.aagStatus;
        if (st === 'SYNCED') summary.synced += 1;
        else if (st === 'NO_INDEX') summary.noIndex += 1;
        else if (st === 'NOT_FOUND') summary.notFound += 1;
        else if (st === 'ERROR') summary.errors += 1;
        else summary.errors += 1;
    };

    for (const r of memberRows || []) {
        const id = r.member_id;
        if (id == null) continue;
        summary.membersProcessed += 1;
        try {
            const result = await syncPlayerHandicapFromAag({
                courseId: courseIdNum,
                playerType: 'member',
                playerId: id
            });
            classify(result);
        } catch (e) {
            console.error('AAG mass sync member error', { memberId: id, message: e?.message });
            summary.errors += 1;
        }
    }

    for (const r of externalRows || []) {
        const id = r.external_id;
        if (id == null) continue;
        summary.externalsProcessed += 1;
        try {
            const result = await syncPlayerHandicapFromAag({
                courseId: courseIdNum,
                playerType: 'external',
                playerId: id
            });
            classify(result);
        } catch (e) {
            console.error('AAG mass sync external error', { externalId: id, message: e?.message });
            summary.errors += 1;
        }
    }

    summary.totalProcessed = summary.membersProcessed + summary.externalsProcessed;

    console.log('AAG mass sync finished', {
        courseId: courseIdNum,
        totalProcessed: summary.totalProcessed,
        synced: summary.synced,
        errors: summary.errors
    });

    return { success: true, data: summary };
}

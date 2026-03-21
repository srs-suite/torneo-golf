/**
 * Lookup AAG por matrícula para formularios (alta/edición sin playerId).
 * Solo consulta el proveedor; no persiste en DB.
 */
import { lookupAagHandicapByMemberNumber } from './aagProvider.js';
import { getClubById } from './database.js';

/**
 * @param {{ courseId: number, playerType: string, memberNumber: string }} params
 * @returns {Promise<{ success: boolean, data?: object, error?: object, httpStatus?: number }>}
 */
export async function lookupAagByMemberNumberForForm({ courseId, playerType, memberNumber }) {
    const courseIdNum = parseInt(String(courseId), 10);
    if (!Number.isFinite(courseIdNum) || courseIdNum <= 0) {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'INVALID_COURSE_ID', message: 'courseId inválido' }
        };
    }

    const type = String(playerType || '').toLowerCase().trim();
    if (type !== 'member' && type !== 'external') {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'INVALID_PLAYER_TYPE', message: 'playerType debe ser "member" o "external"' }
        };
    }

    const mn = String(memberNumber ?? '').trim();
    if (!mn) {
        return {
            success: false,
            httpStatus: 400,
            error: { code: 'MEMBER_NUMBER_REQUIRED', message: 'memberNumber es requerido' }
        };
    }

    const club = await getClubById(courseIdNum);
    if (!club) {
        return {
            success: false,
            httpStatus: 404,
            error: { code: 'CLUB_NOT_FOUND', message: 'Club no encontrado' }
        };
    }

    let lookup;
    try {
        lookup = await lookupAagHandicapByMemberNumber(mn);
    } catch (e) {
        lookup = {
            found: false,
            handicapIndex: null,
            status: 'ERROR',
            message: e?.message || 'Error en proveedor AAG'
        };
    }

    const aagStatus = lookup.status || 'ERROR';
    let handicapIndex = null;
    if (lookup.handicapIndex != null && Number.isFinite(Number(lookup.handicapIndex))) {
        handicapIndex = Number(lookup.handicapIndex);
    }

    const hasIndex = aagStatus === 'SYNCED' && handicapIndex != null
        && !Number.isNaN(handicapIndex);

    const friendlyMessage =
        hasIndex
            ? (lookup.message || 'Index encontrado')
            : (lookup.message || '');

    return {
        success: true,
        data: {
            memberNumber: mn,
            found: hasIndex,
            handicapIndex: hasIndex ? handicapIndex : null,
            aagStatus,
            message: friendlyMessage
        }
    };
}

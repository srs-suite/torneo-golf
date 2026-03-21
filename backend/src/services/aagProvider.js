/**
 * Proveedor AAG (Asociación Argentina de Golf) — capa desacoplada.
 *
 * HOY: implementación MOCK sin HTTP ni credenciales (solo si AAG_MOCK_ENABLED=true en .env).
 * MAÑANA: reemplazar el cuerpo de `lookupAagHandicapByMemberNumber` por:
 *   - fetch/axios al endpoint oficial con auth según documentación AAG
 *   - mapear la respuesta real a la misma forma `{ found, handicapIndex, status, message }`
 *
 * No importar este mock desde lógica de negocio directamente para tests de integración;
 * la sincronización usa solo esta función como punto único de acceso a AAG.
 */

/**
 * @typedef {Object} AagLookupResult
 * @property {boolean} found
 * @property {number|null} handicapIndex  Índice de juego (decimal permitido en app)
 * @property {'SYNCED'|'NOT_FOUND'|'NO_INDEX'|'ERROR'} status
 * @property {string} message
 */

/**
 * Consulta individual del índice en AAG por matrícula federativa / número usado como ID AAG.
 * Por ahora no llama a internet.
 *
 * Valores especiales de prueba (mock):
 * - MOCK_NOT_FOUND → NOT_FOUND
 * - MOCK_NO_INDEX  → NO_INDEX (encontrado pero sin índice)
 * - MOCK_ERROR     → ERROR
 *
 * @param {string} memberNumber
 * @returns {Promise<AagLookupResult>}
 */
export async function lookupAagHandicapByMemberNumber(memberNumber) {
    const mockEnabled = String(process.env.AAG_MOCK_ENABLED || '').toLowerCase() === 'true';

    if (!mockEnabled) {
        return {
            found: false,
            handicapIndex: null,
            status: 'ERROR',
            message: 'AAG mock deshabilitado'
        };
    }

    const n = String(memberNumber ?? '').trim();
    if (!n) {
        return {
            found: false,
            handicapIndex: null,
            status: 'ERROR',
            message: 'Matrícula vacía'
        };
    }

    if (n === 'MOCK_NOT_FOUND') {
        return {
            found: false,
            handicapIndex: null,
            status: 'NOT_FOUND',
            message: 'Jugador no encontrado en AAG (mock)'
        };
    }
    if (n === 'MOCK_NO_INDEX') {
        return {
            found: true,
            handicapIndex: null,
            status: 'NO_INDEX',
            message: 'Sin índice registrado en AAG (mock)'
        };
    }
    if (n === 'MOCK_ERROR') {
        return {
            found: false,
            handicapIndex: null,
            status: 'ERROR',
            message: 'Error simulado del servicio AAG (mock)'
        };
    }

    // Índice ficticio determinista para desarrollo (reemplazar por respuesta real)
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
        hash = (hash * 31 + n.charCodeAt(i)) >>> 0;
    }
    const fake = Math.round(((hash % 370) / 10) * 10) / 10;
    const handicapIndex = Math.min(54, Math.max(0, fake));

    return {
        found: true,
        handicapIndex,
        status: 'SYNCED',
        message: 'Consulta mock AAG OK (reemplazar por API real)'
    };
}

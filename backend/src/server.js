// Servidor con Base de Datos Real - TeeTracker Pro (MANUAL ONLY)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import './config/env.js';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database functions (using real exports)
import {
    // Club functions
    getAllClubs, getClubById, createClub, updateClub, deleteClub,
    
    // Administrator functions  
    getAllAdministrators, authenticateAdmin,
    getClubUsers, createClubUser, updateUserInfo, updateUserPermissions, deleteClubUser,
    
    // Member functions
    getAllMembers, getMemberById, createMember, updateMember, deleteMember, updateMemberStatus,
    getMemberTournaments, getMemberScorecards, getMemberHandicapHistory, getMemberContributions,
    verifyMemberPhone, verifyMemberByMatricula, verifyReportToken,
    isMemberTournamentParticipant, getMemberPortalTournaments, getAnnualRankingsForMemberPortal,
    getTournamentResultsDataForMemberPortal,
    getTournamentForPublicInscription, getTournamentForPublicInscriptionUnfiltered, getTournamentGroupsForInscription, getTournamentParticipantsWithoutGroup, addPublicInscription, checkPublicInscriptionStatus,
    
    // Tournament functions
    getAllTournaments, getTournamentById, createTournament, updateTournament, deleteTournament,
    getTournamentParticipants, getTournamentParticipantsById, addTournamentParticipant, removeTournamentParticipant, getParticipantForPhysicalPrint, getMemberPhysicalPrintPreview, getExternalPhysicalPrintPreview, getMemberPhysicalPrintClubListing, getExternalPhysicalPrintClubListing,
    updateParticipantHandicap, updateParticipantTeePreference, updateParticipantPayment,
    getExternalPlayers, getExternalPlayersRegistry, createExternalPlayer, updateExternalPlayer, deleteExternalPlayer, findDuplicateExternalPlayers,
    // Tee time and groups functions
    getTournamentGroups, generateTournamentGroups, assignTeeTimesToGroups, rebalanceGroupsByHcp,
    movePlayerToGroup, moveGroupToHole, swapGroupNumbers, createEmptyGroup, deleteEmptyGroup, clearTournamentGroups,
    
    // Scorecard functions
    saveScorecard, getScorecardsByTournament, getScorecardByPlayer, updateScorecard, deleteScorecard, getScorecardForPrint,
    
    // Course functions
    getCourseHoles, updateCourseHole, getCourseStatistics,
    
    // Rankings functions
    getAnnualRankings, getTournamentRanking,
    getAnnualRankingCandidates, getAnnualRankingTournamentPicks, setAnnualRankingTournamentPicks,
    
    // Payments and accounting functions
    getPaymentsSummary, getExpenses, addExpense, updateExpense, deleteExpense,
    getOtherIncomes, addOtherIncome, updateOtherIncome, deleteOtherIncome,
    getCurrencyExchanges, addCurrencyExchange, updateCurrencyExchange, deleteCurrencyExchange,
    getCurrencyBalance, getCustodians,
    
    // Custodian accounts functions
    getAccounts, createAccount, updateAccount, deleteAccount, getTransactions, createTransaction, syncMissingTournamentPaymentTransactions, getAccountBalanceBreakdown,
    
    // System functions
    getSystemStats, getRecentActivity
} from './services/database.js';

import { syncPlayerHandicapFromAag, syncAllHandicapsFromAag } from './services/aagSync.js';
import { lookupAagByMemberNumberForForm } from './services/aagFormLookup.js';
import { startAagWeeklySyncScheduler } from './schedulers/aagWeeklySyncScheduler.js';

// WhatsApp service
import {
    generatePaymentReceiptMessage,
    generateInscriptionConfirmationMessage,
    generateInscriptionPaymentMessage,
    generateWhatsAppUrl,
    isValidPhoneNumber
} from './services/whatsapp.js';

const PORT = parseInt(process.env.PORT || '8000', 10);

// Tokens temporales para cobros móvil (sin login admin en teléfono)
const MOBILE_ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutos para abrir (compat. link viejo)
const MOBILE_SESSION_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas de uso
const MOBILE_PIN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // PIN válido 30 días (mismo QR; se rota al regenerar)
const ADMIN_LOGIN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // token Bearer post-login

const mobileAccessTokens = new Map(); // accessToken -> { clubId, tournamentId, used, expiresAt }
const mobileSessionTokens = new Map(); // sessionToken -> { clubId, tournamentId, expiresAt }
const adminLoginTokens = new Map(); // Bearer token -> { adminId, clubId, role, expiresAt }
const mobilePinByTournament = new Map(); // "clubId:tournamentId" -> { pin, expiresAt }
const mobilePinLookup = new Map(); // pin string -> { clubId, tournamentId, expiresAt }

function cleanupMobileTokens() {
    const now = Date.now();
    for (const [token, data] of mobileAccessTokens.entries()) {
        if (!data || data.expiresAt <= now) mobileAccessTokens.delete(token);
    }
    for (const [token, data] of mobileSessionTokens.entries()) {
        if (!data || data.expiresAt <= now) mobileSessionTokens.delete(token);
    }
}

function cleanupAdminLoginTokens() {
    const now = Date.now();
    for (const [token, data] of adminLoginTokens.entries()) {
        if (!data || data.expiresAt <= now) adminLoginTokens.delete(token);
    }
}

function cleanupMobilePins() {
    const now = Date.now();
    for (const [key, data] of mobilePinByTournament.entries()) {
        if (!data || data.expiresAt <= now) {
            if (data?.pin) mobilePinLookup.delete(String(data.pin));
            mobilePinByTournament.delete(key);
        }
    }
    for (const [pin, data] of mobilePinLookup.entries()) {
        if (!data || data.expiresAt <= now) mobilePinLookup.delete(pin);
    }
}

function validateAdminBearer(req, requestedClubId) {
    cleanupAdminLoginTokens();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return { ok: false, message: 'Sesión requerida' };
    const token = auth.slice(7).trim();
    const sess = adminLoginTokens.get(token);
    if (!sess || sess.expiresAt <= Date.now()) return { ok: false, message: 'Sesión inválida o vencida' };
    const cid = parseInt(requestedClubId, 10);
    if (sess.role === 'system_admin') return { ok: true, session: sess };
    if (sess.clubId != null && Number(sess.clubId) === cid) return { ok: true, session: sess };
    return { ok: false, message: 'No autorizado para este club' };
}

function generateMobilePaymentPin(clubId, tournamentId) {
    cleanupMobilePins();
    const key = `${parseInt(clubId, 10)}:${parseInt(tournamentId, 10)}`;
    const prev = mobilePinByTournament.get(key);
    if (prev?.pin) mobilePinLookup.delete(String(prev.pin));

    let pin;
    do {
        pin = String(Math.floor(100000 + Math.random() * 900000));
    } while (mobilePinLookup.has(pin));

    const expiresAt = Date.now() + MOBILE_PIN_TTL_MS;
    mobilePinByTournament.set(key, { pin, expiresAt });
    mobilePinLookup.set(pin, { clubId: parseInt(clubId, 10), tournamentId: parseInt(tournamentId, 10), expiresAt });
    return { pin, expiresAt };
}

function verifyMobilePaymentPin(pinRaw, clubId, tournamentId) {
    cleanupMobilePins();
    const pin = String(pinRaw || '').replace(/\D/g, '').slice(0, 6);
    if (pin.length !== 6) return { ok: false, message: 'Código inválido' };
    const data = mobilePinLookup.get(pin);
    if (!data) return { ok: false, message: 'Código incorrecto' };
    if (data.clubId !== parseInt(clubId, 10) || data.tournamentId !== parseInt(tournamentId, 10)) {
        return { ok: false, message: 'Código no corresponde a este torneo' };
    }
    if (data.expiresAt <= Date.now()) {
        mobilePinLookup.delete(pin);
        return { ok: false, message: 'Código vencido' };
    }
    return { ok: true };
}

function createMobileAccessToken(clubId, tournamentId) {
    cleanupMobileTokens();
    const accessToken = crypto.randomBytes(24).toString('hex');
    mobileAccessTokens.set(accessToken, {
        clubId: parseInt(clubId, 10),
        tournamentId: parseInt(tournamentId, 10),
        used: false,
        expiresAt: Date.now() + MOBILE_ACCESS_TOKEN_TTL_MS
    });
    return accessToken;
}

function exchangeMobileAccessToken(accessToken, clubId, tournamentId) {
    cleanupMobileTokens();
    const data = mobileAccessTokens.get(accessToken);
    if (!data) return { ok: false, message: 'Token inválido o vencido' };
    if (data.used) return { ok: false, message: 'Este QR/link ya fue utilizado' };
    if (data.clubId !== parseInt(clubId, 10) || data.tournamentId !== parseInt(tournamentId, 10)) {
        return { ok: false, message: 'Token no corresponde a este torneo' };
    }
    if (data.expiresAt <= Date.now()) {
        mobileAccessTokens.delete(accessToken);
        return { ok: false, message: 'Token vencido' };
    }
    data.used = true;
    mobileAccessTokens.set(accessToken, data);

    const sessionToken = issueMobileSessionToken(data.clubId, data.tournamentId);
    return { ok: true, sessionToken };
}

function issueMobileSessionToken(clubId, tournamentId) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    mobileSessionTokens.set(sessionToken, {
        clubId: parseInt(clubId, 10),
        tournamentId: parseInt(tournamentId, 10),
        expiresAt: Date.now() + MOBILE_SESSION_TOKEN_TTL_MS
    });
    return sessionToken;
}

function verifyMobileSessionToken(sessionToken, clubId, tournamentId) {
    cleanupMobileTokens();
    const data = mobileSessionTokens.get(sessionToken);
    if (!data) return { ok: false, message: 'Sesión inválida o vencida' };
    if (data.expiresAt <= Date.now()) {
        mobileSessionTokens.delete(sessionToken);
        return { ok: false, message: 'Sesión vencida' };
    }
    if (data.clubId !== parseInt(clubId, 10) || data.tournamentId !== parseInt(tournamentId, 10)) {
        return { ok: false, message: 'Sesión no válida para este torneo' };
    }
    return { ok: true };
}

function getPublicFrontendBaseUrl(req) {
    const envUrl = process.env.FRONTEND_PUBLIC_URL || process.env.FRONTEND_URL;
    if (envUrl && !/localhost|127\.0\.0\.1/i.test(envUrl)) return envUrl.replace(/\/$/, '');

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.headers.host;
    if (host && !/localhost|127\.0\.0\.1/i.test(host)) return `${proto}://${host}`.replace(/\/$/, '');

    const origin = req.headers.origin;
    if (origin && !/localhost|127\.0\.0\.1/i.test(origin)) return origin.replace(/\/$/, '');

    const referer = req.headers.referer;
    if (referer) {
        try {
            const u = new URL(referer);
            if (!/localhost|127\.0\.0\.1/i.test(u.host)) return `${u.protocol}//${u.host}`.replace(/\/$/, '');
        } catch (_) {}
    }

    return 'https://torneogolf.retailsolutionstimetracker.com';
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': 86400
};

function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        ...corsHeaders
    });
    res.end(JSON.stringify(data));
}

function sendError(res, message, statusCode = 500) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        ...corsHeaders
    });
    res.end(JSON.stringify({ error: message }));
}

async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // Si el body está vacío, retornar objeto vacío
                if (!body || body.trim() === '') {
                    resolve({});
                    return;
                }
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
    });
}

// Auth API handler
async function handleAuthAPI(req, res, pathParts) {
    const method = req.method;
    const endpoint = pathParts[2];

    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    try {
        switch (endpoint) {
            case 'login':
                if (method === 'POST') {
                    console.log('📥 Intento de login recibido');
                    const loginData = await parseBody(req);
                    console.log('👤 Usuario:', loginData.username);
                    
                    if (!loginData.username || !loginData.password) {
                        console.log('❌ Faltan credenciales');
                        sendError(res, 'Usuario y contraseña son requeridos', 400);
                        return;
                    }

                    console.log('🔍 Autenticando...');
                    const admin = await authenticateAdmin(loginData.username, loginData.password);
                    console.log('🔑 Resultado autenticación:', admin ? 'SUCCESS' : 'FAIL');
                    
                    if (!admin) {
                        console.log('❌ Credenciales inválidas');
                        sendError(res, 'Credenciales inválidas', 401);
                        return;
                    }

                    const token = crypto.randomBytes(32).toString('hex');
                    adminLoginTokens.set(token, {
                        adminId: admin.admin_id,
                        clubId: admin.course_id != null ? Number(admin.course_id) : null,
                        role: admin.role || 'club_admin',
                        expiresAt: Date.now() + ADMIN_LOGIN_TOKEN_TTL_MS
                    });
                    console.log('✅ Login exitoso para:', admin.username);
                    
                    sendJSON(res, {
                        success: true,
                        token: token,
                        admin: {
                            id: admin.admin_id,
                            username: admin.username,
                            name: admin.full_name,
                            email: admin.email,
                            role: admin.role || 'club_admin',
                            club_id: admin.course_id
                        }
                    });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
                break;
            default:
                sendError(res, 'Endpoint no encontrado', 404);
        }
    } catch (error) {
        console.error('Error en Auth API:', error);
        sendError(res, error.message, 500);
    }
}

// System API handler
async function handleSystemAPI(req, res, pathParts) {
    const method = req.method;
    const action = pathParts[2];

    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    try {
        switch (action) {
            case 'clubs':
                if (method === 'GET') {
                    const clubs = await getAllClubs();
                    sendJSON(res, { data: clubs });
                } else if (method === 'POST') {
                    const clubData = await parseBody(req);
                    const newClub = await createClub(clubData);
                    sendJSON(res, { data: newClub, message: 'Club creado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
                break;
            case 'administrators':
                if (method === 'GET') {
                    const admins = await getAllAdministrators();
                    sendJSON(res, { data: admins });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
                break;
            case 'stats':
                if (method === 'GET') {
                    const stats = await getSystemStats();
                    sendJSON(res, { data: stats });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
                break;
            case 'recent':
                if (method === 'GET') {
                    const limit = parseInt(new URL(req.url, `http://${req.headers.host}`).searchParams.get('limit')) || 10;
                    const activity = await getRecentActivity(limit);
                    sendJSON(res, { data: activity });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
                break;
            default:
                sendError(res, 'Endpoint no encontrado', 404);
        }
    } catch (error) {
        console.error('Error en System API:', error);
        sendError(res, error.message || 'Error interno del servidor', 500);
    }
}

// Club API handler
async function handleClubAPI(req, res, pathParts) {
    const method = req.method;
    const clubId = pathParts[2];
    const resource = pathParts[3];
    const resourceId = pathParts[4];
    const subResource = pathParts[5];

    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    try {
        // Club basic operations
        if (!resource) {
            if (method === 'GET') {
                const club = await getClubById(parseInt(clubId));
                sendJSON(res, { success: true, data: club });
            } else {
                sendError(res, 'Método no permitido', 405);
            }
            return;
        }

        // AAG: sincronización manual de índice (proveedor mock / futuro API real)
        // POST /api/club/:clubId/aag/sync-player-handicap
        if (resource === 'aag' && resourceId === 'sync-player-handicap') {
            if (method === 'POST') {
                const body = await parseBody(req);
                const result = await syncPlayerHandicapFromAag({
                    courseId: parseInt(clubId, 10),
                    playerType: body.playerType,
                    playerId: body.playerId
                });
                const status = result.httpStatus || (result.success ? 200 : 400);
                sendJSON(res, result, status);
            } else {
                sendError(res, 'Método no permitido', 405);
            }
            return;
        }

        // POST /api/club/:clubId/aag/lookup-by-member-number
        if (resource === 'aag' && resourceId === 'lookup-by-member-number') {
            if (method === 'POST') {
                const body = await parseBody(req);
                const result = await lookupAagByMemberNumberForForm({
                    courseId: parseInt(clubId, 10),
                    playerType: body.playerType,
                    memberNumber: body.memberNumber
                });
                const status = result.httpStatus || (result.success ? 200 : 400);
                sendJSON(res, result.success ? { success: true, data: result.data } : { success: false, error: result.error }, status);
            } else {
                sendError(res, 'Método no permitido', 405);
            }
            return;
        }

        // POST /api/club/:clubId/aag/sync-all-handicaps
        if (resource === 'aag' && resourceId === 'sync-all-handicaps') {
            if (method === 'POST') {
                const result = await syncAllHandicapsFromAag(parseInt(clubId, 10));
                if (!result.success) {
                    const status = result.httpStatus || 400;
                    sendJSON(res, { success: false, error: result.error }, status);
                } else {
                    sendJSON(res, { success: true, data: result.data });
                }
            } else {
                sendError(res, 'Método no permitido', 405);
            }
            return;
        }

        // Members
        if (resource === 'members') {
            if (!resourceId) {
                if (method === 'GET') {
                    const members = await getAllMembers(parseInt(clubId));
                    sendJSON(res, { success: true, data: members });
                } else if (method === 'POST') {
                    const memberData = await parseBody(req);
                    const newMember = await createMember({ ...memberData, course_id: parseInt(clubId) });
                    sendJSON(res, { success: true, data: newMember, message: 'Miembro creado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } else {
                if (resourceId === 'physical-print-club-listing' && method === 'GET') {
                    const urlObj = new URL(req.url, `http://${req.headers.host}`);
                    const memberIdRaw = urlObj.searchParams.get('memberId');
                    const memberIdNum = memberIdRaw != null && memberIdRaw !== '' ? parseInt(memberIdRaw, 10) : NaN;
                    if (!Number.isFinite(memberIdNum) || memberIdNum <= 0) {
                        sendError(res, 'memberId es requerido', 400);
                        return;
                    }
                    try {
                        const row = await getMemberPhysicalPrintClubListing(parseInt(clubId, 10), memberIdNum);
                        sendJSON(res, { success: true, data: row });
                    } catch (e) {
                        sendError(res, e.message || 'Error al obtener datos', 404);
                    }
                    return;
                }

                const subAction = pathParts[5]; // tournaments, scorecards, handicap-history
                
                console.log('🔍 Member details request:', { clubId, resourceId, subAction, pathParts });
                
                if (!subAction) {
                    // Basic member operations
                    if (method === 'GET') {
                        const member = await getMemberById(parseInt(clubId), parseInt(resourceId));
                        sendJSON(res, { success: true, data: member });
                    } else if (method === 'PUT') {
                        const memberData = await parseBody(req);
                        const updatedMember = await updateMember(parseInt(resourceId), memberData);
                        sendJSON(res, { success: true, data: updatedMember, message: 'Miembro actualizado exitosamente' });
                    } else if (method === 'DELETE') {
                        await deleteMember(parseInt(resourceId));
                        sendJSON(res, { success: true, message: 'Miembro eliminado exitosamente' });
                    } else {
                        sendError(res, 'Método no permitido', 405);
                    }
                } else if (subAction === 'tournaments' && method === 'GET') {
                    // Get member tournaments
                    const tournaments = await getMemberTournaments(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: tournaments });
                } else if (subAction === 'scorecards' && method === 'GET') {
                    // Get member scorecards
                    const scorecards = await getMemberScorecards(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: scorecards });
                } else if (subAction === 'handicap-history' && method === 'GET') {
                    // Get member handicap history
                    const history = await getMemberHandicapHistory(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: history });
                } else if (subAction === 'contributions' && method === 'GET') {
                    // Get member contributions
                    const contributions = await getMemberContributions(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: contributions });
                } else if (subAction === 'status' && method === 'PUT') {
                    // Update member status
                    const { status } = await parseBody(req);
                    await updateMemberStatus(parseInt(resourceId), status);
                    sendJSON(res, { success: true, message: 'Estado del miembro actualizado exitosamente' });
                } else {
                    sendError(res, 'Recurso no encontrado', 404);
                }
            }
        }

        // Tournaments
        else if (resource === 'tournaments') {
            if (!resourceId) {
                if (method === 'GET') {
                    const tournaments = await getAllTournaments(parseInt(clubId));
                    sendJSON(res, { success: true, data: tournaments });
                } else if (method === 'POST') {
                    const tournamentData = await parseBody(req);
                    const newTournament = await createTournament(parseInt(clubId), tournamentData);
                    sendJSON(res, { success: true, data: newTournament, message: 'Torneo creado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } else if (subResource === 'flyer-upload' && method === 'POST') {
                // Subir flyer (imagen) del torneo; manejado primero para que no sea capturado por otras rutas
                try {
                    const body = await parseBody(req);
                    const dataUrl = body?.image;
                    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
                        sendError(res, 'Se requiere una imagen en formato data URL (data:image/...)', 400);
                        return;
                    }
                    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (!match) {
                        sendError(res, 'Formato de imagen no válido', 400);
                        return;
                    }
                    const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
                    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                        sendError(res, 'Formato de imagen no permitido. Usá PNG, JPG, GIF o WebP.', 400);
                        return;
                    }
                    const base64Data = match[2];
                    const uploadsDir = path.join(__dirname, 'uploads', 'tournaments');
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                    }
                    const fileName = `${resourceId}_flyer.${ext}`;
                    const filePath = path.join(uploadsDir, fileName);
                    const buf = Buffer.from(base64Data, 'base64');
                    if (buf.length > 5 * 1024 * 1024) {
                        sendError(res, 'La imagen no debe superar 5 MB', 400);
                        return;
                    }
                    fs.writeFileSync(filePath, buf);
                    const url = `/uploads/tournaments/${fileName}`;
                    sendJSON(res, { success: true, url });
                    return;
                } catch (err) {
                    console.error('Flyer upload error:', err);
                    sendError(res, err.message || 'Error al subir la imagen', 500);
                    return;
                }
            } else if (method === 'GET' && !subResource) {
                const tournament = await getTournamentById(parseInt(clubId), parseInt(resourceId));
                sendJSON(res, { success: true, data: tournament });
            }
            // Tournament groups and tee times management
            else if (subResource === 'groups') {
                if (method === 'GET') {
                    const groups = await getTournamentGroups(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: groups });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'generate-groups') {
                if (method === 'POST') {
                    const options = await parseBody(req);
                    const groups = await generateTournamentGroups(parseInt(clubId), parseInt(resourceId), options || {});
                    sendJSON(res, { success: true, data: groups, message: 'Grupos generados exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'assign-tee-times') {
                if (method === 'POST') {
                    const teeTimeData = await parseBody(req);
                    const groups = await assignTeeTimesToGroups(parseInt(clubId), parseInt(resourceId), teeTimeData);
                    sendJSON(res, { success: true, data: groups, message: 'Horarios de salida asignados exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'rebalance-groups-by-hcp') {
                if (method === 'POST') {
                    const result = await rebalanceGroupsByHcp(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: result, message: result.moved > 0 ? `Reacomodados ${result.moved} participante(s) por HCP` : (result.message || 'Nada que reacomodar') });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'move-player') {
                if (method === 'POST') {
                    const { participationId, newGroupNumber } = await parseBody(req);
                    await movePlayerToGroup(parseInt(clubId), parseInt(resourceId), participationId, newGroupNumber);
                    sendJSON(res, { success: true, message: 'Jugador movido exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'move-group') {
                if (method === 'POST') {
                    const { groupNumber, newStartingHole, newTeeTime, preferredSession } = await parseBody(req);
                    await moveGroupToHole(parseInt(clubId), parseInt(resourceId), groupNumber, newStartingHole, newTeeTime, preferredSession);
                    sendJSON(res, { success: true, message: 'Grupo movido exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'swap-group-numbers') {
                if (method === 'POST') {
                    const { groupNumber1, groupNumber2 } = await parseBody(req);
                    await swapGroupNumbers(parseInt(clubId), parseInt(resourceId), groupNumber1, groupNumber2);
                    sendJSON(res, { success: true, message: 'Grupos renumerados exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'create-empty-group') {
                if (method === 'POST') {
                    const config = await parseBody(req);
                    const group = await createEmptyGroup(parseInt(resourceId), config || {});
                    sendJSON(res, { success: true, data: group, message: 'Grupo vacío creado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'delete-empty-group') {
                if (method === 'DELETE') {
                    let body = {};
                    try { body = await parseBody(req); } catch (e) {}
                    const { groupNumber } = body || {};
                    await deleteEmptyGroup(parseInt(resourceId), groupNumber);
                    sendJSON(res, { success: true, message: 'Grupo vacío eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'clear-groups') {
                if (method === 'POST') {
                    await clearTournamentGroups(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, message: 'Grupos desarmados exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Cobros móvil: PIN fijo por torneo (QR siempre igual) + verificación
            else if (subResource === 'mobile-payments-pin' && pathParts[6] === 'verify' && method === 'POST') {
                const body = await parseBody(req);
                const pin = body?.pin ?? body?.code;
                const vr = verifyMobilePaymentPin(pin, clubId, resourceId);
                if (!vr.ok) {
                    sendError(res, vr.message, 401);
                    return;
                }
                const sessionToken = issueMobileSessionToken(clubId, resourceId);
                sendJSON(res, {
                    success: true,
                    sessionToken,
                    expiresInSeconds: Math.floor(MOBILE_SESSION_TOKEN_TTL_MS / 1000)
                });
            }
            else if (subResource === 'mobile-payments-pin' && !pathParts[6] && method === 'POST') {
                const auth = validateAdminBearer(req, clubId);
                if (!auth.ok) {
                    sendError(res, auth.message || 'No autorizado', 401);
                    return;
                }
                const { pin, expiresAt } = generateMobilePaymentPin(clubId, resourceId);
                sendJSON(res, {
                    success: true,
                    pin,
                    expiresInSeconds: Math.floor(MOBILE_PIN_TTL_MS / 1000),
                    expiresAt: new Date(expiresAt).toISOString()
                });
            }
            // Mobile payments secure access (one-time token -> temporary session)
            else if (subResource === 'mobile-payments-access') {
                if (method === 'POST') {
                    const accessToken = createMobileAccessToken(clubId, resourceId);
                    const cleanBase = getPublicFrontendBaseUrl(req);
                    const accessUrl = `${cleanBase}/club/${clubId}/tournaments/${resourceId}/mobile-payments?access=${encodeURIComponent(accessToken)}`;
                    sendJSON(res, {
                        success: true,
                        accessToken,
                        accessUrl,
                        expiresInSeconds: Math.floor(MOBILE_ACCESS_TOKEN_TTL_MS / 1000)
                    });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'mobile-payments-session') {
                if (method === 'POST') {
                    const body = await parseBody(req);
                    const accessToken = body?.accessToken;
                    if (!accessToken) {
                        sendError(res, 'accessToken es requerido', 400);
                        return;
                    }
                    const result = exchangeMobileAccessToken(accessToken, clubId, resourceId);
                    if (!result.ok) {
                        sendError(res, result.message, 401);
                        return;
                    }
                    sendJSON(res, {
                        success: true,
                        sessionToken: result.sessionToken,
                        expiresInSeconds: Math.floor(MOBILE_SESSION_TOKEN_TTL_MS / 1000)
                    });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (subResource === 'mobile-payments-participants') {
                const mobileParticipantId = pathParts[6];
                const mobileAction = pathParts[7];
                const urlObj = new URL(req.url, `http://${req.headers.host}`);
                const sessionToken = urlObj.searchParams.get('session');
                if (!sessionToken) {
                    sendError(res, 'session es requerido', 401);
                    return;
                }
                const sessionCheck = verifyMobileSessionToken(sessionToken, clubId, resourceId);
                if (!sessionCheck.ok) {
                    sendError(res, sessionCheck.message, 401);
                    return;
                }

                if (method === 'GET' && !mobileParticipantId) {
                    const participants = await getTournamentParticipants(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: participants });
                } else if (method === 'PUT' && mobileParticipantId && mobileAction === 'payment') {
                    const paymentData = await parseBody(req);
                    await updateParticipantPayment(
                        parseInt(clubId),
                        parseInt(resourceId),
                        parseInt(mobileParticipantId),
                        paymentData
                    );
                    sendJSON(res, { success: true, message: 'Pago actualizado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            else if (method === 'PUT' && !subResource) {
                try {
                    const tournamentData = await parseBody(req);
                    const updatedTournament = await updateTournament(parseInt(clubId), parseInt(resourceId), tournamentData);
                    sendJSON(res, { success: true, data: updatedTournament, message: 'Torneo actualizado exitosamente' });
                } catch (tournamentUpdateErr) {
                    const msg = tournamentUpdateErr?.message || 'Error al actualizar el torneo';
                    const code = typeof msg === 'string' && (msg.includes('cerrado') || msg.includes('sellados')) ? 400 : 500;
                    sendError(res, msg, code);
                }
            } else if (method === 'DELETE' && !subResource) {
                await deleteTournament(parseInt(clubId), parseInt(resourceId));
                sendJSON(res, { success: true, message: 'Torneo eliminado exitosamente' });
            }
            // GET .../physical-print-preview?memberId= | externalPlayerId=  (plancha sin fila tournament_participants)
            else if (subResource === 'physical-print-preview' && method === 'GET') {
                const urlObj = new URL(req.url, `http://${req.headers.host}`);
                const memberIdRaw = urlObj.searchParams.get('memberId');
                const externalIdRaw = urlObj.searchParams.get('externalPlayerId');
                const memberIdNum = memberIdRaw != null && memberIdRaw !== '' ? parseInt(memberIdRaw, 10) : NaN;
                const externalIdNum = externalIdRaw != null && externalIdRaw !== '' ? parseInt(externalIdRaw, 10) : NaN;
                const hasMember = Number.isFinite(memberIdNum) && memberIdNum > 0;
                const hasExternal = Number.isFinite(externalIdNum) && externalIdNum > 0;
                if (hasMember === hasExternal) {
                    sendError(res, 'Indicá exactamente uno: memberId o externalPlayerId', 400);
                    return;
                }
                try {
                    const clubIdNum = parseInt(clubId, 10);
                    const tournamentIdNum = parseInt(resourceId, 10);
                    const row = hasMember
                        ? await getMemberPhysicalPrintPreview(clubIdNum, tournamentIdNum, memberIdNum)
                        : await getExternalPhysicalPrintPreview(clubIdNum, tournamentIdNum, externalIdNum);
                    sendJSON(res, { success: true, data: row });
                } catch (e) {
                    sendError(res, e.message || 'Error al obtener datos', 404);
                }
                return;
            }
            
            // Tournament participants
            else if (subResource === 'participants') {
                const participantId = pathParts[6];
                const action = pathParts[7]; // 'payment' o nada
                
                // Update participant payment: PUT /participants/{id}/payment
                if (method === 'PUT' && participantId && action === 'payment') {
                    try {
                        const paymentData = await parseBody(req);
                        const ok = await updateParticipantPayment(
                            parseInt(clubId),
                            parseInt(resourceId),
                            parseInt(participantId),
                            paymentData
                        );
                        if (!ok) {
                            sendError(res, 'No se pudo actualizar el pago (¿participante inexistente?)', 400);
                            return;
                        }
                        sendJSON(res, { success: true, message: 'Pago actualizado exitosamente' });
                    } catch (payErr) {
                        console.error('updateParticipantPayment:', payErr);
                        sendError(res, payErr.message || 'Error al registrar el pago', 500);
                    }
                    return;
                }
                // Update participant: PUT /participants/{id} with body { handicap_index?, handicap_local?, preferred_session? }
                else if (method === 'PUT' && participantId && !action) {
                    const body = await parseBody(req);
                    const clubIdNum = parseInt(clubId);
                    const tournamentIdNum = parseInt(resourceId);
                    const participantIdNum = parseInt(participantId);
                    if (body.handicap_index !== undefined || body.handicap_local !== undefined) {
                        await updateParticipantHandicap(clubIdNum, tournamentIdNum, participantIdNum, { handicap_index: body.handicap_index, handicap_local: body.handicap_local });
                    }
                    if (body.preferred_session !== undefined || body.tee_time_preference !== undefined) {
                        await updateParticipantTeePreference(clubIdNum, tournamentIdNum, participantIdNum, { preferred_session: body.preferred_session, tee_time_preference: body.tee_time_preference });
                    }
                    const participants = await getTournamentParticipants(clubIdNum, tournamentIdNum);
                    sendJSON(res, { success: true, data: participants, message: 'Participante actualizado' });
                }
                // GET .../participants/:id/whatsapp-inscription -> URL para enviar confirmación de inscripción
                else if (method === 'GET' && participantId && action === 'whatsapp-inscription') {
                    const participants = await getTournamentParticipants(parseInt(clubId), parseInt(resourceId));
                    const participant = participants.find(p => String(p.participation_id) === String(participantId));
                    if (!participant) return sendError(res, 'Participante no encontrado', 404);
                    const phone = participant.player_phone || participant.phone;
                    if (!phone) return sendError(res, 'El participante no tiene teléfono cargado', 400);
                    const tournament = await getTournamentById(parseInt(clubId), parseInt(resourceId));
                    const playerName = participant.player_name || 'Jugador/a';
                    const message = generateInscriptionConfirmationMessage(
                        tournament?.tournament_name || 'Torneo',
                        tournament?.tournament_date,
                        playerName,
                        { startTime: tournament?.start_time, groupNumber: participant.group_number }
                    );
                    const result = generateWhatsAppUrl(phone, message);
                    if (!result.success || !result.url) return sendError(res, result.error || 'Error al generar enlace', 500);
                    sendJSON(res, { success: true, whatsappUrl: result.url });
                    return;
                }
                // GET .../participants/:id/whatsapp-payment -> URL para enviar confirmación de pago
                else if (method === 'GET' && participantId && action === 'whatsapp-payment') {
                    const participants = await getTournamentParticipants(parseInt(clubId), parseInt(resourceId));
                    const participant = participants.find(p => String(p.participation_id) === String(participantId));
                    if (!participant) return sendError(res, 'Participante no encontrado', 404);
                    const phone = participant.player_phone || participant.phone;
                    if (!phone) return sendError(res, 'El participante no tiene teléfono cargado', 400);
                    const tournament = await getTournamentById(parseInt(clubId), parseInt(resourceId));
                    const playerName = participant.player_name || 'Jugador/a';
                    const amount = Number(participant.paid_amount ?? participant.fee_amount ?? tournament?.entry_fee ?? 0);
                    const currency = (participant.currency || 'ARS').toUpperCase();
                    const message = generateInscriptionPaymentMessage(
                        tournament?.tournament_name || 'Torneo',
                        tournament?.tournament_date,
                        playerName,
                        amount,
                        currency
                    );
                    const result = generateWhatsAppUrl(phone, message);
                    if (!result.success || !result.url) return sendError(res, result.error || 'Error al generar enlace', 500);
                    sendJSON(res, { success: true, whatsappUrl: result.url });
                    return;
                }
                // GET .../participants/:id/physical-print -> JSON para overlay de plancha (sin scorecard)
                else if (method === 'GET' && participantId && action === 'physical-print') {
                    try {
                        const row = await getParticipantForPhysicalPrint(
                            parseInt(clubId),
                            parseInt(resourceId),
                            parseInt(participantId)
                        );
                        sendJSON(res, { success: true, data: row });
                    } catch (e) {
                        sendError(res, e.message || 'Error al obtener datos', 404);
                    }
                    return;
                }
                // Get all participants
                else if (method === 'GET' && !participantId) {
                    const participants = await getTournamentParticipants(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: participants });
                } 
                // Add participant
                else if (method === 'POST' && !participantId) {
                    const participantData = await parseBody(req);
                    const newParticipant = await addTournamentParticipant(parseInt(clubId), parseInt(resourceId), participantData);
                    sendJSON(res, { success: true, data: newParticipant, message: 'Participante agregado exitosamente' });
                } 
                // Delete participant
                else if (method === 'DELETE') {
                    // Aceptar tanto DELETE /participants/:id como DELETE /participants con body { participantId }
                    let participantIdToDelete = participantId ? parseInt(participantId) : null;
                    
                    // Si no vino en la URL, intentar desde el body
                    if (!participantIdToDelete || Number.isNaN(participantIdToDelete)) {
                        try {
                            const participantData = await parseBody(req);
                            participantIdToDelete = parseInt(participantData.participantId || participantData.id);
                        } catch (_) {}
                    }
                    if (!participantIdToDelete || Number.isNaN(participantIdToDelete)) {
                        sendError(res, 'participantId es requerido', 400);
                        return;
                    }
                    await removeTournamentParticipant(parseInt(clubId), parseInt(resourceId), participantIdToDelete);
                    sendJSON(res, { success: true, message: 'Participante eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            
            // Scorecards
            else if (subResource === 'scorecards') {
                if (method === 'GET') {
                    // Obtener parámetro includeAll para mostrar también los que no presentaron
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const includeAll = url.searchParams.get('includeAll') === 'true';
                    
                    const scorecards = await getScorecardsByTournament(parseInt(clubId), parseInt(resourceId), includeAll);
                    sendJSON(res, { success: true, data: scorecards });
                } else if (method === 'POST') {
                    const scorecardData = await parseBody(req);
                    const savedScorecard = await saveScorecard(parseInt(clubId), parseInt(resourceId), scorecardData);
                    sendJSON(res, { success: true, data: savedScorecard, message: 'Tarjeta guardada exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            
            // Scorecard by player
            else if (subResource === 'scorecard' && pathParts[6] && pathParts[6] !== 'print') {
                const scorecardId = pathParts[6];
                if (method === 'GET') {
                    const scorecardDetails = await getScorecardForPrint(parseInt(clubId), parseInt(resourceId), parseInt(scorecardId));
                    sendJSON(res, { success: true, data: scorecardDetails });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            
            // Printable scorecard
            else if (subResource === 'scorecard' && pathParts[6] && pathParts[7] === 'print') {
                const scorecardId = pathParts[6];
                if (method === 'GET') {
                    const scorecardDetails = await getScorecardForPrint(parseInt(clubId), parseInt(resourceId), parseInt(scorecardId));
                    
                    // Serve the frontend's PrintableScorecard component
                    res.writeHead(302, { Location: `http://localhost:5173/club/${clubId}/tournaments/${resourceId}/scorecard/${scorecardId}/print${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}` });
                    res.end();
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            
            // Course holes
            else if (subResource === 'holes') {
                if (method === 'GET') {
                    const holes = await getCourseHoles(parseInt(clubId));
                    sendJSON(res, { success: true, data: holes });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            
            else {
                sendError(res, 'Recurso no encontrado', 404);
            }
        }
        
        // Rankings — /rankings/annual/:year | /rankings/annual/:year/candidates | /rankings/annual/:year/selection
        else if (resource === 'rankings') {
            const rankingType = pathParts[4]; // 'annual' | 'tournament'
            const identifier = pathParts[5]; // año o tournament_id
            const rankingSub = pathParts[6]; // 'candidates' | 'selection' | undefined

            if (rankingType === 'annual' && identifier) {
                const year = parseInt(identifier, 10);
                if (rankingSub === 'candidates' && method === 'GET') {
                    const list = await getAnnualRankingCandidates(parseInt(clubId, 10), year);
                    sendJSON(res, { success: true, data: list });
                    return;
                }
                if (rankingSub === 'selection' && method === 'GET') {
                    const state = await getAnnualRankingTournamentPicks(parseInt(clubId, 10), year);
                    sendJSON(res, { success: true, data: state });
                    return;
                }
                if (rankingSub === 'selection' && method === 'PUT') {
                    const auth = validateAdminBearer(req, clubId);
                    if (!auth.ok) {
                        sendError(res, auth.message || 'No autorizado', 401);
                        return;
                    }
                    const body = await parseBody(req);
                    const ids = Array.isArray(body.tournament_ids) ? body.tournament_ids : [];
                    try {
                        const state = await setAnnualRankingTournamentPicks(parseInt(clubId, 10), year, ids);
                        sendJSON(res, { success: true, data: state });
                    } catch (e) {
                        sendError(res, e.message || 'Error al guardar selección', 400);
                    }
                    return;
                }
                if (!rankingSub && method === 'GET') {
                    const rankings = await getAnnualRankings(parseInt(clubId, 10), year);
                    sendJSON(res, { success: true, data: rankings });
                    return;
                }
                sendError(res, 'Método no permitido', 405);
                return;
            } else if (rankingType === 'tournament' && identifier) {
                if (method === 'GET') {
                    const tournamentId = parseInt(identifier);
                    const rankings = await getTournamentRanking(parseInt(clubId), tournamentId);
                    sendJSON(res, { success: true, data: rankings });
                    return;
                }
                sendError(res, 'Método no permitido', 405);
                return;
            } else {
                sendError(res, 'Recurso no encontrado', 404);
            }
        }
        
        // Payments
        else if (resource === 'payments') {
            if (method === 'GET') {
                const url = new URL(req.url, `http://${req.headers.host}`);
                const from = url.searchParams.get('from');
                const to = url.searchParams.get('to');
                const summary = await getPaymentsSummary(parseInt(clubId), from, to);
                sendJSON(res, { success: true, data: summary });
            } else {
                sendError(res, 'Método no permitido', 405);
            }
        }
        
        // QR Code generation for financial report
        else if (resource === 'qr-code') {
            if (method === 'GET') {
                try {
                    // Dynamic import for CommonJS module
                    const QRCode = (await import('qrcode')).default;
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const frontendUrlParam = url.searchParams.get('url');
                    let reportUrl;

                    if (frontendUrlParam) {
                        // URL absoluta que pide el front (ej. cobros móvil); codificarla tal cual en el QR
                        reportUrl = frontendUrlParam;
                    } else {
                        let frontendBase;
                        if (process.env.FRONTEND_URL) {
                            frontendBase = process.env.FRONTEND_URL.replace(/\/$/, '');
                        } else {
                            const referer = req.headers.referer;
                            if (referer) {
                                try {
                                    const refererUrl = new URL(referer);
                                    frontendBase = `${refererUrl.protocol}//${refererUrl.host}`;
                                } catch (e) {
                                    frontendBase = 'http://localhost:5173';
                                }
                            } else {
                                frontendBase = 'http://localhost:5173';
                            }
                        }
                        reportUrl = `${frontendBase}/club/${clubId}/informe-contable`;
                    }
                    console.log('📱 Generando QR code para:', reportUrl);
                    
                    const qrDataUrl = await QRCode.toDataURL(reportUrl, {
                        width: 300,
                        margin: 2,
                        errorCorrectionLevel: 'M'
                    });
                    
                    // Convertir data URL a buffer
                    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    
                    res.writeHead(200, {
                        'Content-Type': 'image/png',
                        'Cache-Control': 'public, max-age=3600',
                        ...corsHeaders
                    });
                    res.end(imageBuffer);
                } catch (error) {
                    console.error('❌ Error generando QR code:', error);
                    sendError(res, 'Error generando QR code', 500);
                }
            } else {
                sendError(res, 'Método no permitido', 405);
            }
        }
        
        // Accounting (expenses)
        else if (resource === 'accounting') {
            // pathParts después de filter: ['api', 'club', '1', 'accounting', 'transactions']
            // pathParts[4] es 'transactions'
            const action = pathParts[4]; // action is the element after 'accounting' in the path
            console.log('🔍 Accounting action:', { action, pathParts, url: req.url });
            
            if (action === 'expenses') {
                if (method === 'GET') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const from = url.searchParams.get('from');
                    const to = url.searchParams.get('to');
                    const expenses = await getExpenses(parseInt(clubId), from, to);
                    sendJSON(res, { success: true, data: expenses });
                } else if (method === 'POST') {
                    const expenseData = await parseBody(req);
                    const newExpense = await addExpense(parseInt(clubId), expenseData);
                    sendJSON(res, { success: true, data: newExpense, message: 'Gasto agregado exitosamente' });
                } else if (method === 'PUT') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const expenseId = parseInt(url.searchParams.get('id'));
                    const expenseData = await parseBody(req);
                    await updateExpense(parseInt(clubId), expenseId, expenseData);
                    sendJSON(res, { success: true, message: 'Gasto actualizado exitosamente' });
                } else if (method === 'DELETE') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const expenseId = parseInt(url.searchParams.get('id'));
                    await deleteExpense(parseInt(clubId), expenseId);
                    sendJSON(res, { success: true, message: 'Gasto eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } 
            // Other incomes (non-tournament incomes)
            else if (action === 'incomes') {
                // Get income by ID and send WhatsApp receipt - Handle path like /api/club/1/accounting/incomes/123/send-whatsapp
                const url = new URL(req.url, `http://${req.headers.host}`);
                const pathParts = url.pathname.split('/');
                // pathParts: ['', 'api', 'club', '1', 'accounting', 'incomes', '5', 'send-whatsapp']
                const incomeIdInPath = pathParts[6]; // The income ID
                const subAction = pathParts[7]; // 'send-whatsapp' or undefined
                
                if (subAction === 'send-whatsapp' && method === 'POST') {
                    try {
                        const incomeId = parseInt(incomeIdInPath);
                        
                        // Get the income details
                        const incomes = await getOtherIncomes(parseInt(clubId), null, null);
                        const income = incomes.find(i => i.income_id === incomeId);
                        
                        if (!income) {
                            return sendError(res, 'Ingreso no encontrado', 404);
                        }
                        
                        // Check if income has a member associated
                        if (!income.member_id) {
                            return sendError(res, 'Este ingreso no tiene un socio asociado', 400);
                        }
                        
                        // Get member details
                        const member = await getMemberById(income.member_id);
                        
                        if (!member) {
                            return sendError(res, 'Socio no encontrado', 404);
                        }
                        
                        // Check if member has phone number
                        if (!member.phone) {
                            return sendError(res, 'El socio no tiene teléfono registrado', 400);
                        }
                        
                        // Validate phone number
                        if (!isValidPhoneNumber(member.phone)) {
                            return sendError(res, 'El número de teléfono del socio no es válido', 400);
                        }
                        
                        // Get club details
                        const club = await getClubById(parseInt(clubId));
                        const clubName = club?.course_name || 'Club de Golf';
                        const memberName = `${member.first_name} ${member.last_name}`;
                        
                        // Generate WhatsApp message
                        const message = generatePaymentReceiptMessage(clubName, memberName, income);
                        
                        // Generate WhatsApp URL
                        const result = generateWhatsAppUrl(member.phone, message);
                        
                        if (result.success) {
                            sendJSON(res, {
                                success: true,
                                message: 'Enlace de WhatsApp generado',
                                whatsappUrl: result.url
                            });
                        } else {
                            sendError(res, result.error || 'Error al generar enlace de WhatsApp', 500);
                        }
                    } catch (error) {
                        console.error('Error al procesar WhatsApp:', error);
                        sendError(res, 'Error al procesar solicitud de WhatsApp', 500);
                    }
                } else if (method === 'GET') {
                    const from = url.searchParams.get('from');
                    const to = url.searchParams.get('to');
                    const incomes = await getOtherIncomes(parseInt(clubId), from, to);
                    sendJSON(res, { success: true, data: incomes });
                } else if (method === 'POST' && !subAction) {
                    const incomeData = await parseBody(req);
                    const newIncome = await addOtherIncome(parseInt(clubId), incomeData);
                    sendJSON(res, { success: true, data: newIncome, message: 'Ingreso agregado exitosamente' });
                } else if (method === 'PUT') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const incomeId = parseInt(url.searchParams.get('id'));
                    const incomeData = await parseBody(req);
                    await updateOtherIncome(parseInt(clubId), incomeId, incomeData);
                    sendJSON(res, { success: true, message: 'Ingreso actualizado exitosamente' });
                } else if (method === 'DELETE') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const incomeId = parseInt(url.searchParams.get('id'));
                    await deleteOtherIncome(parseInt(clubId), incomeId);
                    sendJSON(res, { success: true, message: 'Ingreso eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Currency exchanges
            else if (action === 'exchanges') {
                if (method === 'GET') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const from = url.searchParams.get('from');
                    const to = url.searchParams.get('to');
                    const exchanges = await getCurrencyExchanges(parseInt(clubId), from, to);
                    sendJSON(res, { success: true, data: exchanges });
                } else if (method === 'POST') {
                    const exchangeData = await parseBody(req);
                    const newExchange = await addCurrencyExchange(parseInt(clubId), exchangeData);
                    sendJSON(res, { success: true, data: newExchange, message: 'Conversión registrada exitosamente' });
                } else if (method === 'PUT') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const exchangeId = parseInt(url.searchParams.get('id'));
                    const exchangeData = await parseBody(req);
                    await updateCurrencyExchange(parseInt(clubId), exchangeId, exchangeData);
                    sendJSON(res, { success: true, message: 'Conversión actualizada exitosamente' });
                } else if (method === 'DELETE') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const exchangeId = parseInt(url.searchParams.get('id'));
                    await deleteCurrencyExchange(parseInt(clubId), exchangeId);
                    sendJSON(res, { success: true, message: 'Conversión eliminada exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Currency balance
            else if (action === 'balance') {
                if (method === 'GET') {
                    const balance = await getCurrencyBalance(parseInt(clubId));
                    sendJSON(res, { success: true, data: balance });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Custodians (for autocomplete)
            else if (action === 'custodians') {
                if (method === 'GET') {
                    const custodians = await getCustodians(parseInt(clubId));
                    sendJSON(res, { success: true, data: custodians });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Accounts (fondos/cuentas)
            else if (action === 'accounts') {
                if (method === 'GET') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const includeInactive = url.searchParams.get('includeInactive') === 'true';
                    const accounts = await getAccounts(parseInt(clubId), includeInactive);
                    sendJSON(res, { success: true, data: accounts });
                } else if (method === 'POST') {
                    const accountData = await parseBody(req);
                    const newAccount = await createAccount(parseInt(clubId), accountData);
                    sendJSON(res, { success: true, data: newAccount, message: 'Cuenta creada exitosamente' });
                } else if (method === 'PUT') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const accountId = parseInt(url.searchParams.get('id'));
                    const accountData = await parseBody(req);
                    await updateAccount(parseInt(clubId), accountId, accountData);
                    sendJSON(res, { success: true, message: 'Cuenta actualizada exitosamente' });
                } else if (method === 'DELETE') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const accountId = parseInt(url.searchParams.get('id'));
                    await deleteAccount(parseInt(clubId), accountId);
                    sendJSON(res, { success: true, message: 'Cuenta desactivada exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Transactions (historial de movimientos)
            else if (action === 'transactions') {
                if (method === 'GET') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const from = url.searchParams.get('from');
                    const to = url.searchParams.get('to');
                    const transactions = await getTransactions(parseInt(clubId), from, to);
                    sendJSON(res, { success: true, data: transactions });
                } else if (method === 'POST') {
                    const transactionData = await parseBody(req);
                    const newTransaction = await createTransaction(parseInt(clubId), transactionData);
                    sendJSON(res, { success: true, data: newTransaction, message: 'Transacción creada exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            // Sincronizar cobros de torneo (participantes pagados) → movimientos en caja
            else if (action === 'sync-tournament-payments' && method === 'POST') {
                try {
                    const body = await parseBody(req);
                    const tournamentId = body?.tournament_id != null ? parseInt(body.tournament_id, 10) : null;
                    const result = await syncMissingTournamentPaymentTransactions(
                        parseInt(clubId),
                        Number.isFinite(tournamentId) && tournamentId > 0 ? tournamentId : null
                    );
                    sendJSON(res, {
                        success: true,
                        data: result,
                        message: `Sincronización: ${result.created} movimientos creados, ${result.skipped_existing} ya registrados`
                    });
                } catch (err) {
                    console.error('sync-tournament-payments:', err);
                    const detail =
                        err.sqlMessage ||
                        err.message ||
                        'Error al sincronizar cobros de torneo';
                    sendError(res, detail, 500);
                }
            }
            // Account balance breakdown (for debugging)
            else if (action === 'account-balance-breakdown') {
                if (method === 'GET') {
                    try {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        const accountName = url.searchParams.get('accountName');
                        console.log('🔍 Account balance breakdown request:', { clubId, accountName, url: req.url });
                        if (!accountName) {
                            sendError(res, 'accountName es requerido', 400);
                            return;
                        }
                        const breakdown = await getAccountBalanceBreakdown(parseInt(clubId), accountName);
                        sendJSON(res, { success: true, data: breakdown });
                    } catch (error) {
                        console.error('❌ Error en account-balance-breakdown:', error);
                        sendError(res, error.message || 'Error al obtener el desglose del balance', 500);
                    }
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } else {
                sendError(res, 'Recurso no encontrado', 404);
            }
        }
        
        // User management
        else if (resource === 'users') {
            if (method === 'GET') {
                // Get all users for the club
                const users = await getClubUsers(parseInt(clubId));
                sendJSON(res, { success: true, data: users });
            } else if (method === 'POST') {
                // Create new user
                const userData = await parseBody(req);
                const newUserId = await createClubUser(parseInt(clubId), userData);
                sendJSON(res, { success: true, data: { userId: newUserId }, message: 'Usuario creado exitosamente' });
            } else if (method === 'PUT' && resourceId) {
                // Update user permissions
                const permissions = await parseBody(req);
                await updateUserPermissions(parseInt(resourceId), permissions);
                sendJSON(res, { success: true, message: 'Permisos actualizados exitosamente' });
            } else if (method === 'DELETE' && resourceId) {
                // Delete user
                await deleteClubUser(parseInt(resourceId));
                sendJSON(res, { success: true, message: 'Usuario eliminado exitosamente' });
            } else {
                sendError(res, 'Método no permitido', 405);
            }
        }

        else if (resource === 'external-players') {
            const cId = parseInt(clubId);
            if (method === 'GET' && resourceId === 'physical-print-club-listing') {
                const urlObj = new URL(req.url, `http://${req.headers.host}`);
                const extRaw = urlObj.searchParams.get('externalPlayerId');
                const extNum = extRaw != null && extRaw !== '' ? parseInt(extRaw, 10) : NaN;
                if (!Number.isFinite(extNum) || extNum <= 0) {
                    sendError(res, 'externalPlayerId es requerido', 400);
                    return;
                }
                try {
                    const row = await getExternalPhysicalPrintClubListing(cId, extNum);
                    sendJSON(res, { success: true, data: row });
                } catch (e) {
                    sendError(res, e.message || 'Error al obtener datos', 404);
                }
                return;
            }
            if (method === 'GET' && resourceId === 'registry') {
                const list = await getExternalPlayersRegistry(cId);
                sendJSON(res, { success: true, data: list });
            } else if (method === 'GET' && !resourceId) {
                const list = await getExternalPlayers(cId);
                sendJSON(res, { success: true, data: list });
            } else if (method === 'POST' && resourceId === 'check-duplicates') {
                const body = await parseBody(req);
                const duplicates = await findDuplicateExternalPlayers(body);
                sendJSON(res, { success: true, data: duplicates });
            } else if (method === 'POST' && !resourceId) {
                const body = await parseBody(req);
                const newPlayer = await createExternalPlayer(body);
                sendJSON(res, { success: true, data: newPlayer });
            } else if (method === 'PUT' && resourceId) {
                const body = await parseBody(req);
                await updateExternalPlayer(parseInt(resourceId), body);
                sendJSON(res, { success: true });
            } else if (method === 'DELETE' && resourceId) {
                await deleteExternalPlayer(parseInt(resourceId));
                sendJSON(res, { success: true });
            } else {
                sendError(res, 'Método no permitido', 405);
            }
        }
        
        else {
            sendError(res, 'Recurso no encontrado', 404);
        }

    } catch (error) {
        console.error('Error en Club API:', error);
        sendError(res, error.message, 500);
    }
}

// Public Report API handler (for members - phone verification)
async function handlePublicReportAPI(req, res, pathParts) {
    console.log('📱 handlePublicReportAPI called');
    console.log('📋 pathParts:', pathParts);
    
    const method = req.method;
    const clubId = pathParts[3]; // /api/public/report/1/...
    const action = pathParts[4]; // verify or data
    
    console.log('🔑 method:', method, 'clubId:', clubId, 'action:', action);
    
    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    try {
        // Verify phone endpoint
        if (action === 'verify' && method === 'POST') {
            console.log('✅ Entering verify endpoint');
            const body = await parseBody(req);
            console.log('📦 Body received:', body);
            const { phone } = body;
            
            if (!phone) {
                console.log('❌ No phone in body');
                return sendError(res, 'Número de teléfono requerido', 400);
            }
            
            console.log('📞 Calling verifyMemberPhone with:', parseInt(clubId), phone);
            const result = await verifyMemberPhone(parseInt(clubId), phone);
            console.log('📊 verifyMemberPhone result:', result);
            
            if (result.success) {
                sendJSON(res, {
                    success: true,
                    token: result.token,
                    memberName: result.memberName
                });
            } else {
                sendError(res, result.message, 404);
            }
        }
        // Get financial data endpoint
        else if (action === 'data' && method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            
            if (!token) {
                return sendError(res, 'Token requerido', 400);
            }
            
            // Verify token
            const verification = await verifyReportToken(parseInt(clubId), token);
            
            if (!verification.success) {
                return sendError(res, verification.message, 401);
            }
            
            // Get date filters from query params
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');

            // Get financial data
            const [
                expenses,
                otherIncomes,
                tournaments,
                accounts,
                exchanges
            ] = await Promise.all([
                getExpenses(parseInt(clubId), from, to),
                getOtherIncomes(parseInt(clubId), from, to),
                getAllTournaments(parseInt(clubId)),
                getAccounts(parseInt(clubId)),
                getCurrencyExchanges(parseInt(clubId), from, to)
            ]);

            // Calculate incomes and expenses by currency
            let incomeARS = 0, incomeUSD = 0;
            let expenseARS = 0, expenseUSD = 0;
            let totalIncome = 0;
            
            // Tournament incomes by currency (assumed ARS unless specified)
            tournaments.forEach(tournament => {
                const paid = tournament.paid_participants_count || 0;
                const fee = parseFloat(tournament.entry_fee || 0);
                const income = paid * fee;
                totalIncome += income;
                incomeARS += income;
            });
            
            // Other incomes by currency
            otherIncomes.forEach(income => {
                const amount = parseFloat(income.amount || 0);
                totalIncome += amount;
                if (income.currency === 'USD') {
                    incomeUSD += amount;
                } else {
                    incomeARS += amount;
                }
            });
            
            // Expenses by currency
            expenses.forEach(expense => {
                const amount = parseFloat(expense.amount || 0);
                if (expense.currency === 'USD') {
                    expenseUSD += amount;
                } else {
                    expenseARS += amount;
                }
            });
            
            // Calculate real balance from accounts (sum of all account balances)
            let totalBalanceARS = 0;
            let totalBalanceUSD = 0;
            
            if (accounts && accounts.length > 0) {
                accounts.forEach(account => {
                    totalBalanceARS += parseFloat(account.current_balance_ars || 0);
                    totalBalanceUSD += parseFloat(account.current_balance_usd || 0);
                });
            }
            
            // Also calculate balance from transactions for reference
            const balanceFromTransactionsARS = incomeARS - expenseARS;
            const balanceFromTransactionsUSD = incomeUSD - expenseUSD;
            
            console.log('💰 Total Income:', totalIncome);
            console.log('💰 Income ARS:', incomeARS, 'USD:', incomeUSD);
            console.log('💰 Expense ARS:', expenseARS, 'USD:', expenseUSD);
            console.log('💰 Balance from transactions ARS:', balanceFromTransactionsARS, 'USD:', balanceFromTransactionsUSD);
            console.log('💰 Balance from accounts ARS:', totalBalanceARS, 'USD:', totalBalanceUSD);
            console.log('💰 Exchanges count:', exchanges.length);

            // Combine all incomes (tournaments + other incomes) into a single list
            const allIncomes = [];
            
            // Add tournament incomes
            tournaments.forEach(tournament => {
                const paid = tournament.paid_participants_count || 0;
                const fee = parseFloat(tournament.entry_fee || 0);
                const income = paid * fee;
                if (income > 0) {
                    allIncomes.push({
                        date: tournament.tournament_date,
                        concept: tournament.tournament_name || 'Torneo',
                        amount: income,
                        currency: 'ARS', // Tournaments are assumed ARS
                        payment_method: 'torneo',
                        member_name: null,
                        custodian: null,
                        created_at: tournament.created_at,
                        type: 'tournament'
                    });
                }
            });
            
            // Add other incomes
            otherIncomes.forEach(income => {
                allIncomes.push({
                    date: income.income_date,
                    concept: income.description || 'Ingreso',
                    amount: parseFloat(income.amount),
                    currency: income.currency || 'ARS',
                    payment_method: income.payment_type,
                    member_name: income.member_name,
                    custodian: income.account_name || income.custodian || 'Sin asignar',
                    created_at: income.created_at,
                    type: 'other'
                });
            });
            
            // Sort all incomes by date (newest first)
            allIncomes.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });

            // Map expenses to frontend format
            const mappedExpenses = expenses.map(expense => ({
                date: expense.expense_date,
                concept: expense.detail || 'Gasto',
                amount: parseFloat(expense.amount),
                currency: expense.currency,
                receipt_number: expense.receipt_number,
                custodian: expense.account_name || expense.custodian || 'Sin asignar',
                receipt_photo_path: expense.receipt_photo_path,
                created_at: expense.created_at
            }));

            sendJSON(res, {
                success: true,
                data: {
                    summary: {
                        incomeARS: incomeARS,
                        incomeUSD: incomeUSD,
                        expenseARS: expenseARS,
                        expenseUSD: expenseUSD,
                        balanceARS: totalBalanceARS, // Use real account balance
                        balanceUSD: totalBalanceUSD, // Use real account balance
                        totalIncomes: incomeARS + incomeUSD,
                        totalExpenses: expenseARS + expenseUSD,
                        balance: totalBalanceARS // Use real account balance
                    },
                    incomes: allIncomes,
                    expenses: mappedExpenses,
                    accounts: accounts || [],
                    memberName: verification.memberName
                }
            });
        }
        // Get account transactions endpoint
        // URL: /api/public/report/1/account/2/transactions
        // pathParts: ['api', 'public', 'report', '1', 'account', '2', 'transactions']
        else if (action === 'account' && pathParts.length >= 7 && pathParts[6] === 'transactions' && method === 'GET') {
            const accountId = parseInt(pathParts[5]); // pathParts[5] es el accountId
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            
            console.log('📊 Account transactions request:', { clubId, accountId, pathParts });
            
            if (!token) {
                return sendError(res, 'Token requerido', 400);
            }
            
            if (!accountId || isNaN(accountId)) {
                return sendError(res, 'ID de cuenta inválido', 400);
            }
            
            // Verify token
            const verification = await verifyReportToken(parseInt(clubId), token);
            
            if (!verification.success) {
                return sendError(res, verification.message, 401);
            }
            
            // Get transactions for this account
            const allTransactions = await getTransactions(parseInt(clubId));
            const aid = Number(accountId);
            const accountTransactions = allTransactions.filter(tx =>
                Number(tx.from_account_id) === aid || Number(tx.to_account_id) === aid
            );
            
            console.log(`📊 Found ${accountTransactions.length} transactions for account ${accountId}`);
            
            sendJSON(res, {
                success: true,
                data: accountTransactions
            });
        } else {
            console.log('❌ Public Report API: Recurso no encontrado', { action, pathParts, method });
            sendError(res, 'Recurso no encontrado', 404);
        }
    } catch (error) {
        console.error('Error en Public Report API:', error);
        sendError(res, error.message, 500);
    }
}

// Public Inscription API (inscripción por teléfono + grupos + preferencia mañana/tarde)
// Rutas: /api/public/inscription/:clubId/verify | /api/public/inscription/:clubId/tournament/:tid | .../tournament/:tid/groups | .../tournament/:tid/inscribe
async function handlePublicInscriptionAPI(req, res, pathParts) {
    const method = req.method;
    const clubId = pathParts[3];
    const action = pathParts[4];

    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    try {
        const clubIdNum = parseInt(clubId);

        // POST .../verify -> verificar por teléfono o matrícula (inscripción pública)
        if (action === 'verify' && method === 'POST') {
            const body = await parseBody(req);
            const phone = body.phone != null ? String(body.phone).trim() : '';
            const memberNumber = (body.member_number ?? body.memberNumber ?? body.matricula ?? '').toString().trim();
            const identifier = phone || memberNumber;
            if (!identifier) {
                sendError(res, 'Ingresá tu teléfono o número de matrícula', 400);
                return;
            }
            // Si enviaron un solo valor (identifier), probar primero como teléfono y luego como matrícula
            const tryPhone = phone || identifier;
            const tryMatricula = memberNumber || identifier;
            let result = tryPhone ? await verifyMemberPhone(clubIdNum, tryPhone) : { success: false };
            if (!result.success && tryMatricula) {
                result = await verifyMemberByMatricula(clubIdNum, tryMatricula);
            }
            if (result.success) {
                sendJSON(res, { success: true, token: result.token, memberName: result.memberName });
            } else {
                sendError(res, result.message || 'No encontrado. Revisá teléfono o matrícula.', 404);
            }
            return;
        }

        // GET .../tournament/:tournamentId -> datos del torneo (inhabilitado si pasó la fecha límite de inscripción)
        if (action === 'tournament' && pathParts[5] && !pathParts[6] && method === 'GET') {
            const tid = parseInt(pathParts[5]);
            const tournament = await getTournamentForPublicInscription(clubIdNum, tid);
            if (!tournament) {
                const unfiltered = await getTournamentForPublicInscriptionUnfiltered(clubIdNum, tid);
                if (unfiltered) return sendError(res, 'El plazo de inscripción ha finalizado', 403);
                return sendError(res, 'Torneo no encontrado', 404);
            }
            const payload = {
                tournament_id: tournament.tournament_id,
                tournament_name: tournament.tournament_name,
                tournament_date: tournament.tournament_date,
                registration_deadline: tournament.registration_deadline ?? null,
                max_participants: tournament.max_participants ?? null,
                public_inscription_allow_groups: tournament.public_inscription_allow_groups ?? 1,
                flyer_url: tournament.flyer_url != null && String(tournament.flyer_url).trim() !== '' ? String(tournament.flyer_url).trim() : null,
                groups_by_hcp: tournament.groups_by_hcp === 1 || tournament.groups_by_hcp === true ? 1 : 0
            };
            sendJSON(res, { success: true, tournament: payload });
            return;
        }

        // GET .../tournament/:tournamentId/groups -> grupos con menos de 4
        if (action === 'tournament' && pathParts[5] && pathParts[6] === 'groups' && method === 'GET') {
            const tid = parseInt(pathParts[5]);
            const groups = await getTournamentGroupsForInscription(tid);
            sendJSON(res, { success: true, groups });
            return;
        }

        // GET .../tournament/:tournamentId/participants-without-group?token=xxx -> inscriptos sin grupo (para crear grupo)
        if (action === 'tournament' && pathParts[5] && pathParts[6] === 'participants-without-group' && method === 'GET') {
            const tid = parseInt(pathParts[5]);
            const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            const token = url.searchParams.get('token');
            if (!token) return sendError(res, 'Token requerido', 400);
            const verification = await verifyReportToken(clubIdNum, token);
            if (!verification.success) return sendError(res, verification.message, 401);
            const memberId = verification.member_id;
            if (!memberId) return sendError(res, 'Sesión inválida', 401);
            const participants = await getTournamentParticipantsWithoutGroup(tid, memberId);
            sendJSON(res, { success: true, participants });
            return;
        }

        // POST .../tournament/:tournamentId/status -> verificar si ya está inscripto (body: token)
        if (action === 'tournament' && pathParts[5] && pathParts[6] === 'status' && method === 'POST') {
            const tid = parseInt(pathParts[5]);
            const body = await parseBody(req);
            const { token: bodyToken } = body || {};
            if (!bodyToken) return sendError(res, 'Token requerido', 400);
            const verification = await verifyReportToken(clubIdNum, bodyToken);
            if (!verification.success) return sendError(res, verification.message, 401);
            const memberId = verification.member_id;
            if (!memberId) return sendError(res, 'Sesión inválida', 401);
            const { alreadyInscribed } = await checkPublicInscriptionStatus(clubIdNum, tid, memberId);
            sendJSON(res, { success: true, alreadyInscribed });
            return;
        }

        // POST .../tournament/:tournamentId/inscribe -> inscribir (token + opciones)
        if (action === 'tournament' && pathParts[5] && pathParts[6] === 'inscribe' && method === 'POST') {
            const tid = parseInt(pathParts[5]);
            const body = await parseBody(req);
            const { token, createGroup, groupNumber, teeTimePreference, addToGroup } = body || {};
            if (!token) return sendError(res, 'Token requerido', 400);
            const isJoiningGroup = groupNumber != null && groupNumber !== '' && !createGroup;
            if (!isJoiningGroup && (!teeTimePreference || (teeTimePreference !== 'morning' && teeTimePreference !== 'afternoon'))) {
                return sendError(res, 'Debe elegir turno mañana o tarde', 400);
            }
            const verification = await verifyReportToken(clubIdNum, token);
            if (!verification.success) return sendError(res, verification.message, 401);
            const memberId = verification.member_id;
            if (!memberId) return sendError(res, 'Sesión inválida', 401);
            const inscrResult = await addPublicInscription(clubIdNum, tid, memberId, {
                createGroup: !!createGroup,
                groupNumber: groupNumber != null ? parseInt(groupNumber) : undefined,
                teeTimePreference: teeTimePreference || undefined,
                addToGroup: Array.isArray(addToGroup) ? addToGroup : undefined
            });
            let whatsappUrl = null;
            try {
                const member = await getMemberById(memberId);
                if (member && member.phone) {
                    const tournament = await getTournamentById(clubIdNum, tid);
                    const playerName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Jugador/a';
                    const message = generateInscriptionConfirmationMessage(
                        tournament?.tournament_name || 'Torneo',
                        tournament?.tournament_date,
                        playerName,
                        { startTime: tournament?.start_time, groupNumber: inscrResult.group_number }
                    );
                    const result = generateWhatsAppUrl(member.phone, message);
                    if (result.success && result.url) whatsappUrl = result.url;
                }
            } catch (e) { console.warn('WhatsApp URL after public inscription:', e?.message || e); }
            sendJSON(res, { success: true, message: 'Inscripción realizada', whatsappUrl: whatsappUrl || undefined });
            return;
        }

        sendError(res, 'Recurso no encontrado', 404);
    } catch (error) {
        console.error('Error en Public Inscription API:', error);
        const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
        sendError(res, error.message || 'Error en inscripción', status);
    }
}

// Public Finance API handler (for members transparency)
async function handlePublicFinanceAPI(req, res, pathParts) {
    const method = req.method;
    const clubId = pathParts[3];
    
    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    try {
        // Simple password authentication
        const authHeader = req.headers.authorization;
        const publicPassword = process.env.PUBLIC_FINANCE_PASSWORD || 'socios2024';
        
        if (!authHeader || authHeader !== `Bearer ${publicPassword}`) {
            sendError(res, 'Contraseña incorrecta', 401);
            return;
        }

        if (method === 'GET' && clubId) {
            // Get date filters from query params
            const url = new URL(req.url, `http://${req.headers.host}`);
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');

            // Get all financial data
            const [
                tournaments,
                expenses,
                otherIncomes,
                balance
            ] = await Promise.all([
                getAllTournaments(parseInt(clubId)),
                getExpenses(parseInt(clubId), from, to),
                getOtherIncomes(parseInt(clubId), from, to),
                getCurrencyBalance(parseInt(clubId))
            ]);

            // Calculate tournament income (paid participants)
            const tournamentIncome = tournaments.reduce((total, tournament) => {
                return total + (tournament.paid_participants_count || 0) * (tournament.entry_fee || 0);
            }, 0);

            // Calculate other income total
            const otherIncomeTotal = otherIncomes.reduce((total, income) => {
                return total + parseFloat(income.amount || 0);
            }, 0);

            // Calculate expenses total
            const expensesTotal = expenses.reduce((total, expense) => {
                return total + parseFloat(expense.amount || 0);
            }, 0);

            // Prepare response
            const financialData = {
                summary: {
                    tournamentIncome: tournamentIncome,
                    otherIncome: otherIncomeTotal,
                    totalIncome: tournamentIncome + otherIncomeTotal,
                    totalExpenses: expensesTotal,
                    balance: tournamentIncome + otherIncomeTotal - expensesTotal,
                    currencyBalance: balance
                },
                tournaments: tournaments.map(t => ({
                    tournament_id: t.tournament_id,
                    tournament_name: t.tournament_name,
                    tournament_date: t.tournament_date,
                    entry_fee: t.entry_fee,
                    paid_participants: t.paid_participants_count,
                    income: (t.paid_participants_count || 0) * (t.entry_fee || 0)
                })),
                otherIncomes: otherIncomes.map(i => ({
                    income_id: i.income_id,
                    date: i.income_date,
                    concept: i.concept,
                    amount: parseFloat(i.amount),
                    currency: i.currency,
                    member_name: i.member_name || 'N/A'
                })),
                expenses: expenses.map(e => ({
                    expense_id: e.expense_id,
                    date: e.expense_date,
                    concept: e.concept,
                    amount: parseFloat(e.amount),
                    category: e.category,
                    payment_method: e.payment_method
                }))
            };

            sendJSON(res, { success: true, data: financialData });
        } else {
            sendError(res, 'Endpoint no encontrado', 404);
        }
    } catch (error) {
        console.error('Error en Public Finance API:', error);
        sendError(res, error.message, 500);
    }
}

/** Portal socio: matrícula → solo torneos propios y ranking anual con reglas de acceso */
async function handlePublicMemberPortalAPI(req, res, pathParts) {
    const method = req.method;
    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    const clubId = parseInt(pathParts[3], 10);
    if (!clubId) {
        return sendError(res, 'Club inválido', 400);
    }

    const seg4 = pathParts[4];
    const seg5 = pathParts[5];
    const seg6 = pathParts[6];

    try {
        if (seg4 === 'verify' && method === 'POST') {
            const body = await parseBody(req);
            const raw = body.matricula ?? body.member_number ?? body.memberNumber ?? '';
            const result = await verifyMemberByMatricula(clubId, String(raw));
            if (result.success) {
                return sendJSON(res, {
                    success: true,
                    token: result.token,
                    memberName: result.memberName
                });
            }
            return sendError(res, result.message, 404);
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
            return sendError(res, 'Token requerido', 400);
        }
        const verification = await verifyReportToken(clubId, token);
        if (!verification.success) {
            return sendError(res, verification.message, 401);
        }
        const memberId = verification.member_id;

        if (seg4 === 'tournaments' && !seg5 && method === 'GET') {
            const tournaments = await getMemberPortalTournaments(clubId, memberId);
            return sendJSON(res, { success: true, tournaments });
        }

        if (seg4 === 'tournaments' && seg5 && seg6 === 'ranking' && method === 'GET') {
            const tournamentId = parseInt(seg5, 10);
            if (!tournamentId) {
                return sendError(res, 'Torneo inválido', 400);
            }
            const participant = await isMemberTournamentParticipant(clubId, tournamentId, memberId);
            if (!participant) {
                return sendError(res, 'No participaste en este torneo', 403);
            }
            const ranking = await getTournamentRanking(clubId, tournamentId);
            return sendJSON(res, { success: true, ranking });
        }

        if (seg4 === 'tournaments' && seg5 && seg6 === 'results' && method === 'GET') {
            const tournamentId = parseInt(seg5, 10);
            if (!tournamentId) {
                return sendError(res, 'Torneo inválido', 400);
            }
            const payload = await getTournamentResultsDataForMemberPortal(clubId, tournamentId, memberId);
            if (!payload) {
                return sendError(res, 'No participaste en este torneo', 403);
            }
            return sendJSON(res, { success: true, ...payload });
        }

        if (seg4 === 'rankings' && seg5 === 'annual' && seg6 && method === 'GET') {
            const year = parseInt(seg6, 10);
            if (!year || year < 1990 || year > 2100) {
                return sendError(res, 'Año inválido', 400);
            }
            const payload = await getAnnualRankingsForMemberPortal(clubId, memberId, year);
            if (!payload.allowed) {
                return sendJSON(res, {
                    success: false,
                    message: payload.message || 'Sin acceso al ranking'
                }, 403);
            }
            return sendJSON(res, { success: true, ...payload });
        }

        return sendError(res, 'Endpoint no encontrado', 404);
    } catch (error) {
        console.error('Error en Public Member Portal API:', error);
        sendError(res, error.message, 500);
    }
}

// Main server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(part => part);

    console.log(`${req.method} ${pathname}`);

    // Handle API routes
    if (pathParts[0] === 'api') {
        if (pathParts[1] === 'auth') {
            await handleAuthAPI(req, res, pathParts);
            return;
        } else if (pathParts[1] === 'system') {
            await handleSystemAPI(req, res, pathParts);
            return;
        } else if (pathParts[1] === 'club') {
            await handleClubAPI(req, res, pathParts);
            return;
        } else if (pathParts[1] === 'public' && pathParts[2] === 'finance') {
            await handlePublicFinanceAPI(req, res, pathParts);
            return;
        } else if (pathParts[1] === 'public' && pathParts[2] === 'report') {
            await handlePublicReportAPI(req, res, pathParts);
            return;
        } else if (pathParts[1] === 'public' && pathParts[2] === 'inscription') {
            await handlePublicInscriptionAPI(req, res, pathParts);
            return;
        } else if (pathParts[1] === 'public' && pathParts[2] === 'member') {
            await handlePublicMemberPortalAPI(req, res, pathParts);
            return;
        }
    }

    // Serve uploaded logos
    if (pathname.startsWith('/uploads/logos/')) {
        const fileName = pathname.substring(15); // Remove '/uploads/logos/'
        const filePath = path.join(__dirname, 'uploads', 'logos', fileName);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml'
            }[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000' // Cache 1 year
            });
            fs.createReadStream(filePath).pipe(res);
            return;
        }
    }

    // Serve uploaded tournament flyers
    if (pathname.startsWith('/uploads/tournaments/')) {
        const fileName = pathname.substring(21); // Remove '/uploads/tournaments/'
        if (fileName && !fileName.includes('..')) {
            const filePath = path.join(__dirname, 'uploads', 'tournaments', fileName);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                }[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType, ...corsHeaders, 'Cache-Control': 'public, max-age=86400' });
                fs.createReadStream(filePath).pipe(res);
                return;
            }
            const uploadsFallback = (process.env.UPLOADS_FALLBACK_ORIGIN || '').trim().replace(/\/$/, '');
            if (uploadsFallback && process.env.NODE_ENV !== 'production') {
                res.writeHead(302, { Location: `${uploadsFallback}${pathname}`, ...corsHeaders });
                res.end();
                return;
            }
        }
    }

    // Serve uploaded expense photos
    if (pathname.startsWith('/uploads/expenses/')) {
        const fileName = pathname.substring(18); // Remove '/uploads/expenses/'
        const filePath = path.join(__dirname, 'uploads', 'expenses', fileName);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.pdf': 'application/pdf',
            }[ext] || 'application/octet-stream';

            const headers = {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000', // Cache 1 year
            };
            /** Evitar que el navegador descargue el PDF al abrir en visor / iframe. */
            if (ext === '.pdf') {
                headers['Content-Disposition'] = 'inline';
            }

            res.writeHead(200, headers);
            fs.createReadStream(filePath).pipe(res);
            return;
        }
    }

    // Redirect root to frontend (only in development)
    // In production, Nginx serves the frontend directly, so we don't redirect
    if (pathname === '/' || pathname === '/index.html') {
        if (process.env.NODE_ENV === 'production') {
            // In production, Nginx handles frontend, so return 404
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found - Frontend should be served by Nginx');
            return;
        } else {
            // In development, redirect to Vite dev server
            res.writeHead(302, { Location: 'http://localhost:5173' });
            res.end();
            return;
        }
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('🎯 ===================================');
    console.log('📊 SERVIDOR CON BASE DE DATOS REAL');
    console.log('🎯 ===================================');
    console.log(`📡 Backend: http://localhost:${PORT}`);
    console.log(`🌐 Frontend: http://localhost:5173`);
    console.log('💾 Base de Datos: ✅ MYSQL REAL');
    console.log('📝 Sistema: ✅ MANUAL SCORECARDS');
    console.log('🎯 ===================================');
    console.log('');
    console.log('✅ SISTEMA COMPLETO FUNCIONANDO:');
    console.log('   http://localhost:5173');
    console.log('');

    startAagWeeklySyncScheduler();
});

export { server };
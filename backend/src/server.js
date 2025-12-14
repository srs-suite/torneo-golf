// Servidor con Base de Datos Real - TeeTracker Pro (MANUAL ONLY)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables from root directory
dotenv.config({ path: '../../.env' });

// Database functions (using real exports)
import {
    // Club functions
    getAllClubs, getClubById, createClub, updateClub, deleteClub,
    
    // Administrator functions  
    getAllAdministrators, authenticateAdmin,
    
    // Member functions
    getAllMembers, getMemberById, createMember, updateMember, deleteMember, updateMemberStatus,
    getMemberTournaments, getMemberScorecards, getMemberHandicapHistory,
    
    // Tournament functions
    getAllTournaments, getTournamentById, createTournament, updateTournament, deleteTournament,
    getTournamentParticipants, getTournamentParticipantsById, addTournamentParticipant, removeTournamentParticipant,
    // Tee time and groups functions
    getTournamentGroups, generateTournamentGroups, assignTeeTimesToGroups,
    movePlayerToGroup, moveGroupToHole, swapGroupNumbers, createEmptyGroup, deleteEmptyGroup,
    
    // Scorecard functions
    saveScorecard, getScorecardsByTournament, getScorecardByPlayer, updateScorecard, deleteScorecard, getScorecardForPrint,
    
    // Course functions
    getCourseHoles, updateCourseHole, getCourseStatistics,
    
    // Rankings functions
    getAnnualRankings, getTournamentRanking,
    
    // Payments and accounting functions
    getPaymentsSummary, getExpenses, addExpense, deleteExpense,
    
    // System functions
    getSystemStats, getRecentActivity
} from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;

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
                    const loginData = await parseBody(req);
                    if (!loginData.username || !loginData.password) {
                        sendError(res, 'Usuario y contraseña son requeridos', 400);
                        return;
                    }

                    const admin = await authenticateAdmin(loginData.username, loginData.password);
                    if (!admin) {
                        sendError(res, 'Credenciales inválidas', 401);
                        return;
                    }

                    const token = crypto.randomBytes(32).toString('hex');
                    
                    sendJSON(res, {
                        success: true,
                        token: token,
                        admin: {
                            id: admin.admin_id,
                            username: admin.username,
                            name: admin.full_name,
                            email: admin.email,
                            club_id: admin.club_id
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
                const subAction = pathParts[4]; // tournaments, scorecards, handicap-history
                
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
                    const { groupNumber, newStartingHole, newTeeTime } = await parseBody(req);
                    await moveGroupToHole(parseInt(clubId), parseInt(resourceId), groupNumber, newStartingHole, newTeeTime);
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
            } else if (method === 'PUT' && !subResource) {
                const tournamentData = await parseBody(req);
                const updatedTournament = await updateTournament(parseInt(clubId), parseInt(resourceId), tournamentData);
                sendJSON(res, { success: true, data: updatedTournament, message: 'Torneo actualizado exitosamente' });
            } else if (method === 'DELETE' && !subResource) {
                await deleteTournament(parseInt(clubId), parseInt(resourceId));
                sendJSON(res, { success: true, message: 'Torneo eliminado exitosamente' });
            }
            
            // Tournament participants
            else if (subResource === 'participants') {
                if (method === 'GET') {
                    const participants = await getTournamentParticipants(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: participants });
                } else if (method === 'POST') {
                    const participantData = await parseBody(req);
                    const newParticipant = await addTournamentParticipant(parseInt(clubId), parseInt(resourceId), participantData);
                    sendJSON(res, { success: true, data: newParticipant, message: 'Participante agregado exitosamente' });
                } else if (method === 'DELETE') {
                    // Aceptar tanto DELETE /participants/:id como DELETE /participants con body { participantId }
                    let participantId;
                    // Intentar tomar ID desde la URL: /api/club/{clubId}/tournaments/{tournamentId}/participants/{participantId}
                    if (pathParts[6]) {
                        participantId = parseInt(pathParts[6]);
                    }
                    // Si no vino en la URL, intentar desde el body
                    if (!participantId || Number.isNaN(participantId)) {
                        try {
                            const participantData = await parseBody(req);
                            participantId = parseInt(participantData.participantId || participantData.id);
                        } catch (_) {}
                    }
                    if (!participantId || Number.isNaN(participantId)) {
                        sendError(res, 'participantId es requerido', 400);
                        return;
                    }
                    await removeTournamentParticipant(parseInt(clubId), parseInt(resourceId), participantId);
                    sendJSON(res, { success: true, message: 'Participante eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            }
            
            // Scorecards
            else if (subResource === 'scorecards') {
                if (method === 'GET') {
                    const scorecards = await getScorecardsByTournament(parseInt(clubId), parseInt(resourceId));
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
        
        // Rankings
        else if (resource === 'rankings') {
            const rankingType = pathParts[3]; // 'annual' or 'tournament'
            const identifier = pathParts[4]; // year or tournament_id
            
            if (rankingType === 'annual' && identifier) {
                if (method === 'GET') {
                    const year = parseInt(identifier);
                    const rankings = await getAnnualRankings(parseInt(clubId), year);
                    sendJSON(res, { success: true, data: rankings });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } else if (rankingType === 'tournament' && identifier) {
                if (method === 'GET') {
                    const tournamentId = parseInt(identifier);
                    const rankings = await getTournamentRanking(parseInt(clubId), tournamentId);
                    sendJSON(res, { success: true, data: rankings });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
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
        
        // Accounting (expenses)
        else if (resource === 'accounting') {
            const action = pathParts[3];
            
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
                } else if (method === 'DELETE') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const expenseId = parseInt(url.searchParams.get('id'));
                    await deleteExpense(parseInt(clubId), expenseId);
                    sendJSON(res, { success: true, message: 'Gasto eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } else {
                sendError(res, 'Recurso no encontrado', 404);
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

    // Redirect root to frontend
    if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(302, { Location: 'http://localhost:5173' });
        res.end();
        return;
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
    console.log(`🌐 Frontend: http://localhost:5174`);
    console.log('💾 Base de Datos: ✅ MYSQL REAL');
    console.log('📝 Sistema: ✅ MANUAL SCORECARDS');
    console.log('🎯 ===================================');
    console.log('');
    console.log('✅ SISTEMA COMPLETO FUNCIONANDO:');
    console.log('   http://localhost:5174');
    console.log('');
});

export { server };
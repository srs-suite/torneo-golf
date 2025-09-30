// Servidor con Base de Datos Real - TeeTracker Pro (MANUAL ONLY)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database functions (using real exports)
import {
    // Club functions
    getAllClubs, getClubById, createClub, updateClub, deleteClub,
    
    // Administrator functions  
    getAllAdministrators, authenticateAdmin,
    
    // Member functions
    getAllMembers, getMemberById, createMember, updateMember, deleteMember, updateMemberStatus,
    
    // Tournament functions
    getAllTournaments, getTournamentById, createTournament, updateTournament, deleteTournament,
    getTournamentParticipants, getTournamentParticipantsById, addTournamentParticipant, removeTournamentParticipant,
    
    // Scorecard functions
    saveScorecard, getScorecardsByTournament, getScorecardByPlayer, updateScorecard, deleteScorecard, getScorecardForPrint,
    
    // Course functions
    getCourseHoles, updateCourseHole, getCourseStatistics
} from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

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
                    const newMember = await createMember(parseInt(clubId), memberData);
                    sendJSON(res, { success: true, data: newMember, message: 'Miembro creado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
                }
            } else {
                if (method === 'GET') {
                    const member = await getMemberById(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, data: member });
                } else if (method === 'PUT') {
                    const memberData = await parseBody(req);
                    const updatedMember = await updateMember(parseInt(clubId), parseInt(resourceId), memberData);
                    sendJSON(res, { success: true, data: updatedMember, message: 'Miembro actualizado exitosamente' });
                } else if (method === 'DELETE') {
                    await deleteMember(parseInt(clubId), parseInt(resourceId));
                    sendJSON(res, { success: true, message: 'Miembro eliminado exitosamente' });
                } else {
                    sendError(res, 'Método no permitido', 405);
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
                    const participantData = await parseBody(req);
                    await removeTournamentParticipant(parseInt(clubId), parseInt(resourceId), participantData.participantId);
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
    console.log(`🌐 Frontend: http://localhost:5173`);
    console.log('💾 Base de Datos: ✅ MYSQL REAL');
    console.log('📝 Sistema: ✅ MANUAL SCORECARDS');
    console.log('🎯 ===================================');
    console.log('');
    console.log('✅ SISTEMA COMPLETO FUNCIONANDO:');
    console.log('   http://localhost:5173');
    console.log('');
});

export { server };
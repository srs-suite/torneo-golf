// Database functions for TeeTracker Pro
import { executeQuery, executeTransaction, getPool } from '../config/database.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
// CLUBS (GOLF COURSES) FUNCTIONS
// ================================

/**
 * Get all clubs
 */
async function getAllClubs() {
    const query = `
        SELECT 
            c.club_id AS course_id,
            c.club_name AS course_name,
            COUNT(DISTINCT m.member_id) as total_members,
            COUNT(DISTINCT t.tournament_id) as total_tournaments,
            COUNT(DISTINCT ca.admin_id) as administrators
        FROM clubs c
        LEFT JOIN members m ON m.course_id = c.club_id AND (m.membership_status = 'active' OR m.membership_status IS NULL)
        LEFT JOIN tournaments t ON t.course_id = c.club_id
        LEFT JOIN club_administrators ca ON ca.course_id = c.club_id
        GROUP BY c.club_id, c.club_name
        ORDER BY c.club_name
    `;
    
    const { rows } = await executeQuery(query);
    return rows;
}

/**
 * Get club by ID
 */
async function getClubById(clubId) {
    const query = `
        SELECT 
            c.club_id AS course_id,
            c.club_name AS course_name,
            COUNT(DISTINCT m.member_id) as total_members,
            COUNT(t.tournament_id) as total_tournaments
        FROM clubs c
        LEFT JOIN members m ON m.course_id = c.club_id AND (m.membership_status = 'active' OR m.membership_status IS NULL)
        LEFT JOIN tournaments t ON t.course_id = c.club_id
        WHERE c.club_id = ?
        GROUP BY c.club_id, c.club_name
    `;
    
    const { rows } = await executeQuery(query, [clubId]);
    return rows[0] || null;
}

/**
 * Get club by code
 */
async function getClubByCode(clubCode) {
    const query = `
        SELECT * FROM clubs 
        WHERE club_code = ? AND is_active = true
    `;
    
    const { rows } = await executeQuery(query, [clubCode]);
    return rows[0] || null;
}

/**
 * Create new club
 */
async function createClub(clubData) {
    const queries = [
        {
            query: `
                INSERT INTO clubs (
                    club_code, course_name, address, city, country,
                    timezone, currency, phone, email, website, logo_path,
                    par, physical_holes, current_members, subscription_status, subscription_start,
                    is_active, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            params: [
                clubData.clubCode,
                clubData.clubName,
                clubData.address,
                clubData.city,
                clubData.country,
                clubData.timezone || 'America/Argentina/Buenos_Aires',
                clubData.currency || 'ARS',
                clubData.phone || null,
                clubData.email || null,
                clubData.website || null,
                clubData.logoPath || null,
                clubData.par || 72,
                clubData.physicalHoles || 18,
                0, // current_members
                'active',
                new Date().toISOString().split('T')[0],
                true,
                1 // created_by (system admin)
            ]
        }
    ];

    // Add admin creation if provided
    if (clubData.adminName && clubData.adminEmail && clubData.adminUsername && clubData.adminPassword) {
        queries.push({
            query: `
                INSERT INTO club_administrators (
                    course_id, username, email, password_hash, full_name,
                    role, is_primary_admin, is_active, created_by
                ) VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            params: [
                clubData.adminUsername,
                clubData.adminEmail,
                crypto.createHash('sha256').update(clubData.adminPassword).digest('hex'),
                clubData.adminName,
                'club_admin',
                true,
                true,
                1
            ]
        });
    }

    const results = await executeTransaction(queries);
    
    // Get the created club
    const clubId = results[0].insertId;
    return await getClubById(clubId);
}

/**
 * Update club
 */
async function updateClub(clubId, clubData) {
    const queries = [
        {
            query: `
                UPDATE clubs SET
                    club_code = ?, course_name = ?, address = ?, city = ?, country = ?,
                    timezone = ?, currency = ?, phone = ?, email = ?, website = ?,
                    logo_path = ?, par = ?, updated_at = CURRENT_TIMESTAMP
                WHERE course_id = ?
            `,
            params: [
                clubData.clubCode,
                clubData.clubName,
                clubData.address,
                clubData.city,
                clubData.country,
                clubData.timezone || 'America/Argentina/Buenos_Aires',
                clubData.currency || 'ARS',
                clubData.phone || null,
                clubData.email || null,
                clubData.website || null,
                clubData.logoPath || null,
                clubData.par || 72,
                clubId
            ]
        }
    ];

    // Update admin if provided
    if (clubData.adminName && clubData.adminEmail && clubData.adminUsername) {
        const adminUpdateQuery = `
            UPDATE club_administrators SET
                username = ?, email = ?, full_name = ?
                ${clubData.adminPassword ? ', password_hash = ?' : ''}
                , updated_at = CURRENT_TIMESTAMP
            WHERE course_id = ? AND is_primary_admin = true
        `;
        
        const adminParams = [
            clubData.adminUsername,
            clubData.adminEmail,
            clubData.adminName
        ];
        
        if (clubData.adminPassword) {
            adminParams.push(crypto.createHash('sha256').update(clubData.adminPassword).digest('hex'));
        }
        
        adminParams.push(clubId);
        
        queries.push({
            query: adminUpdateQuery,
            params: adminParams
        });
    }

    await executeTransaction(queries);
    return await getClubById(clubId);
}

/**
 * Delete club (soft delete)
 */
async function deleteClub(clubId) {
    const query = `
        UPDATE clubs SET 
            is_active = false, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE course_id = ?
    `;
    
    const { rows } = await executeQuery(query, [clubId]);
    return rows.affectedRows > 0;
}

// ================================
// ADMINISTRATORS FUNCTIONS
// ================================

/**
 * Get all administrators
 */
async function getAllAdministrators(clubId = null) {
    let query = `
        SELECT 
            ca.*,
            gc.club_name as club_name
        FROM club_administrators ca
        LEFT JOIN clubs gc ON ca.course_id = gc.club_id
        WHERE ca.is_active = true
    `;
    
    const params = [];
    
    if (clubId) {
        query += ` AND ca.course_id = ?`;
        params.push(clubId);
    }
    
    query += ` ORDER BY ca.role, ca.full_name`;
    
    const { rows } = await executeQuery(query, params);
    return rows;
}

/**
 * Get administrator by ID
 */
async function getAdministratorById(adminId) {
    const query = `
        SELECT 
            ca.*,
            gc.club_name as club_name
        FROM club_administrators ca
        LEFT JOIN clubs gc ON ca.course_id = gc.club_id
        WHERE ca.admin_id = ? AND ca.is_active = true
    `;
    
    const { rows } = await executeQuery(query, [adminId]);
    return rows[0] || null;
}

/**
 * Get administrator by username
 */
async function getAdministratorByUsername(username) {
    const query = `
        SELECT 
            ca.*,
            gc.club_name as club_name
        FROM club_administrators ca
        LEFT JOIN clubs gc ON ca.course_id = gc.club_id
        WHERE ca.username = ? AND ca.is_active = true
    `;
    
    const { rows } = await executeQuery(query, [username]);
    return rows[0] || null;
}

/**
 * Authenticate administrator
 */
async function authenticateAdmin(username, password) {
    const admin = await getAdministratorByUsername(username);
    
    if (!admin) {
        console.log('❌ Usuario no encontrado:', username);
        return null;
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    console.log('🔐 DEBUG AUTH:');
    console.log('  Password recibida:', password);
    console.log('  Password length:', password.length);
    console.log('  Hash generado:', hashedPassword);
    console.log('  Hash en DB:', admin.password_hash);
    console.log('  ¿Coinciden?', admin.password_hash === hashedPassword);
    
    if (admin.password_hash === hashedPassword) {
        // Update last login
        await executeQuery(
            'UPDATE club_administrators SET last_login = CURRENT_TIMESTAMP WHERE admin_id = ?',
            [admin.admin_id]
        );
        
        return admin;
    }
    
    return null;
}

/**
 * Get all users with their permissions for a club
 */
async function getClubUsers(clubId) {
    const query = `
        SELECT 
            ca.*,
            up.*,
            ca.admin_id as user_id
        FROM club_administrators ca
        LEFT JOIN user_permissions up ON ca.admin_id = up.admin_id 
            AND up.permission_id = (
                SELECT MAX(permission_id) 
                FROM user_permissions 
                WHERE admin_id = ca.admin_id
            )
        WHERE ca.course_id = ? AND ca.is_active = TRUE
        ORDER BY ca.is_primary_admin DESC, ca.created_at DESC
    `;
    const { rows } = await executeQuery(query, [clubId]);
    return rows;
}

/**
 * Create a new user with permissions
 */
async function createClubUser(clubId, userData) {
    // Insert user
    const userQuery = `
        INSERT INTO club_administrators (
            course_id, username, email, password_hash, full_name,
            role, is_primary_admin, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, 'club_admin', FALSE, TRUE, ?)
    `;
    
    const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
    
    const { rows: userResult } = await executeQuery(userQuery, [
        clubId,
        userData.username,
        userData.email,
        hashedPassword,
        userData.fullName,
        userData.createdBy || null
    ]);
    
    const newUserId = userResult.insertId;
    
    // Insert permissions
    const permQuery = `
        INSERT INTO user_permissions (
            admin_id,
            can_view_members, can_view_tournaments, can_view_groups,
            can_view_scorecards, can_view_photos, can_view_settings,
            can_view_rankings, can_view_accounting, can_view_financial_totals,
            can_view_balance, can_view_tournament_incomes, can_manage_tournament_incomes,
            can_view_other_incomes, can_manage_other_incomes,
            can_view_expenses, can_manage_expenses,
            can_view_currency_exchanges, can_manage_currency_exchanges,
            can_manage_photos,
            can_create_members, can_edit_members, can_delete_members,
            can_create_tournaments, can_edit_tournaments, can_delete_tournaments,
            can_manage_participants, can_manage_groups, can_manage_scorecards,
            can_manage_payments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const perms = userData.permissions || {};
    await executeQuery(permQuery, [
        newUserId,
        perms.can_view_members || false,
        perms.can_view_tournaments || false,
        perms.can_view_groups || false,
        perms.can_view_scorecards || false,
        perms.can_view_photos || false,
        perms.can_view_settings || false,
        perms.can_view_rankings || false,
        perms.can_view_accounting || false,
        perms.can_view_financial_totals || false,
        perms.can_view_balance || false,
        perms.can_view_tournament_incomes || false,
        perms.can_manage_tournament_incomes || false,
        perms.can_view_other_incomes || false,
        perms.can_manage_other_incomes || false,
        perms.can_view_expenses || false,
        perms.can_manage_expenses || false,
        perms.can_view_currency_exchanges || false,
        perms.can_manage_currency_exchanges || false,
        perms.can_manage_photos || false,
        perms.can_create_members || false,
        perms.can_edit_members || false,
        perms.can_delete_members || false,
        perms.can_create_tournaments || false,
        perms.can_edit_tournaments || false,
        perms.can_delete_tournaments || false,
        perms.can_manage_participants || false,
        perms.can_manage_groups || false,
        perms.can_manage_scorecards || false,
        perms.can_manage_payments || false
    ]);
    
    return newUserId;
}

/**
 * Update user info (name, email, username, password)
 */
async function updateUserInfo(userId, userData) {
    const updates = [];
    const params = [];
    
    if (userData.fullName) {
        updates.push('full_name = ?');
        params.push(userData.fullName);
    }
    if (userData.email) {
        updates.push('email = ?');
        params.push(userData.email);
    }
    if (userData.username) {
        updates.push('username = ?');
        params.push(userData.username);
    }
    if (userData.password) {
        const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
        updates.push('password_hash = ?');
        params.push(hashedPassword);
    }
    
    if (updates.length === 0) {
        return true;
    }
    
    params.push(userId);
    
    const query = `
        UPDATE club_administrators 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE admin_id = ?
    `;
    
    await executeQuery(query, params);
    return true;
}

/**
 * Update user permissions
 */
async function updateUserPermissions(userId, permissions) {
    const query = `
        UPDATE user_permissions SET
            can_view_members = ?,
            can_view_tournaments = ?,
            can_view_groups = ?,
            can_view_scorecards = ?,
            can_view_photos = ?,
            can_view_settings = ?,
            can_view_rankings = ?,
            can_view_accounting = ?,
            can_view_financial_totals = ?,
            can_view_balance = ?,
            can_view_tournament_incomes = ?,
            can_manage_tournament_incomes = ?,
            can_view_other_incomes = ?,
            can_manage_other_incomes = ?,
            can_view_expenses = ?,
            can_manage_expenses = ?,
            can_view_currency_exchanges = ?,
            can_manage_currency_exchanges = ?,
            can_manage_photos = ?,
            can_create_members = ?,
            can_edit_members = ?,
            can_delete_members = ?,
            can_create_tournaments = ?,
            can_edit_tournaments = ?,
            can_delete_tournaments = ?,
            can_manage_participants = ?,
            can_manage_groups = ?,
            can_manage_scorecards = ?,
            can_manage_payments = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE admin_id = ?
    `;
    
    await executeQuery(query, [
        permissions.can_view_members || false,
        permissions.can_view_tournaments || false,
        permissions.can_view_groups || false,
        permissions.can_view_scorecards || false,
        permissions.can_view_photos || false,
        permissions.can_view_settings || false,
        permissions.can_view_rankings || false,
        permissions.can_view_accounting || false,
        permissions.can_view_financial_totals || false,
        permissions.can_view_balance || false,
        permissions.can_view_tournament_incomes || false,
        permissions.can_manage_tournament_incomes || false,
        permissions.can_view_other_incomes || false,
        permissions.can_manage_other_incomes || false,
        permissions.can_view_expenses || false,
        permissions.can_manage_expenses || false,
        permissions.can_view_currency_exchanges || false,
        permissions.can_manage_currency_exchanges || false,
        permissions.can_manage_photos || false,
        permissions.can_create_members || false,
        permissions.can_edit_members || false,
        permissions.can_delete_members || false,
        permissions.can_create_tournaments || false,
        permissions.can_edit_tournaments || false,
        permissions.can_delete_tournaments || false,
        permissions.can_manage_participants || false,
        permissions.can_manage_groups || false,
        permissions.can_manage_scorecards || false,
        permissions.can_manage_payments || false,
        userId
    ]);
    
    return true;
}

/**
 * Delete user (soft delete)
 */
async function deleteClubUser(userId) {
    const query = `UPDATE club_administrators SET is_active = FALSE WHERE admin_id = ? AND is_primary_admin = FALSE`;
    await executeQuery(query, [userId]);
    return true;
}

// ================================
// SYSTEM FUNCTIONS
// ================================

/**
 * Migrate members table to add missing columns
 */
async function migrateMembersTable() {
    try {
        // Verificar si la columna ya existe
        const checkColumn = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tournament_manager' 
            AND TABLE_NAME = 'members' 
            AND COLUMN_NAME = 'handicap_local'
        `;
        
        const { rows: existingColumns } = await executeQuery(checkColumn, []);
        
        // Agregar handicap_local si no existe
        if (existingColumns.length === 0) {
            console.log('🔧 Agregando columna handicap_local a members...');
            await executeQuery(`
                ALTER TABLE members 
                ADD COLUMN handicap_local INT DEFAULT 0 
                COMMENT 'Handicap local del socio'
            `, []);
            console.log('✅ Columna handicap_local agregada a members exitosamente');
        } else {
            console.log('✅ Columna handicap_local ya existe en members');
        }
        
    } catch (error) {
        console.log('❌ Error en migración de members:', error);
        // No detener el servidor por errores de migración
    }
}

/**
 * Migrate external_players table to add missing columns
 */
async function migrateExternalPlayersTable() {
    try {
        // Verificar si las columnas ya existen
        const checkColumns = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tournament_manager' 
            AND TABLE_NAME = 'external_players' 
            AND COLUMN_NAME IN ('handicap_local', 'member_number')
        `;
        
        const { rows: existingColumns } = await executeQuery(checkColumns, []);
        const columnNames = existingColumns.map(col => col.COLUMN_NAME);
        
        // Agregar handicap_local si no existe
        if (!columnNames.includes('handicap_local')) {
            console.log('🔧 Agregando columna handicap_local a external_players...');
            await executeQuery(`
                ALTER TABLE external_players 
                ADD COLUMN handicap_local INT DEFAULT 0 
                COMMENT 'Handicap local del jugador externo'
            `, []);
        }
        
        // Agregar member_number si no existe
        if (!columnNames.includes('member_number')) {
            console.log('🔧 Agregando columna member_number a external_players...');
            await executeQuery(`
                ALTER TABLE external_players 
                ADD COLUMN member_number VARCHAR(50) DEFAULT NULL 
                COMMENT 'Número de matrícula del club de origen'
            `, []);
        }
        
        console.log('✅ Migración de external_players completada');
        return true;
    } catch (error) {
        console.error('❌ Error en migración de external_players:', error);
        return false;
    }
}

/**
 * Create course_holes table if it doesn't exist
 */
async function createCourseHolesTable() {
    try {
        // Verificar si la tabla ya existe
        const checkTable = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'tournament_manager' 
            AND TABLE_NAME = 'course_holes'
        `;
        
        const { rows: existingTables } = await executeQuery(checkTable, []);
        
        if (existingTables.length === 0) {
            console.log('🔧 Creando tabla course_holes...');
            const createTable = `
                CREATE TABLE course_holes (
                    hole_id INT AUTO_INCREMENT PRIMARY KEY,
                    course_id INT NOT NULL,
                    hole_number INT NOT NULL,
                    par INT NOT NULL DEFAULT 4,
                    handicap INT NOT NULL DEFAULT 1,
                    description TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (course_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
                    UNIQUE KEY unique_course_hole (course_id, hole_number),
                    INDEX idx_course_holes_course (course_id),
                    INDEX idx_course_holes_number (hole_number)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                COMMENT='Información básica de cada hoyo (par y handicap)'
            `;
            await executeQuery(createTable, []);
            console.log('✅ Tabla course_holes creada exitosamente');
            
            // Crear hoyos por defecto para clubes existentes
            await createDefaultHolesForExistingClubs();
        } else {
            console.log('✅ Tabla course_holes ya existe');
        }

        // Crear tabla course_tees (solo si no existe)
        try {
            await createCourseTeesTable();
        } catch (error) {
            console.log('⚠️ Advertencia en migración de course_tees:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error creando tabla course_holes:', error);
        // No hacer throw para que el servidor no falle
        console.log('⚠️ Continuando con el inicio del servidor...');
    }
}

/**
 * Create course_tees table for multiple tees per hole
 */
async function createCourseTeesTable() {
    try {
        const checkTable = `
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'tournament_manager'
            AND TABLE_NAME = 'course_tees'
        `;
        const { rows: existingTables } = await executeQuery(checkTable, []);
        
        if (existingTables.length === 0) {
            console.log('🔧 Creando tabla course_tees...');
            const createTable = `
                CREATE TABLE course_tees (
                    tee_id INT AUTO_INCREMENT PRIMARY KEY,
                    hole_id INT NOT NULL,
                    tee_name VARCHAR(50) NOT NULL COMMENT 'Ej: Negro, Rojo, Azul, Amarillo',
                    tee_color VARCHAR(20) NOT NULL COMMENT 'Color hex o nombre: #000000, black, red, etc',
                    category ENUM('men', 'women', 'senior', 'junior') NOT NULL DEFAULT 'men',
                    distance_yards INT NOT NULL COMMENT 'Distancia en yardas',
                    is_default BOOLEAN DEFAULT FALSE COMMENT 'Tee por defecto para esta categoría',
                    display_order INT DEFAULT 1 COMMENT 'Orden de visualización',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (hole_id) REFERENCES course_holes(hole_id) ON DELETE CASCADE,
                    INDEX idx_course_tees_hole (hole_id),
                    INDEX idx_course_tees_category (category),
                    INDEX idx_course_tees_color (tee_color),
                    UNIQUE KEY unique_hole_tee_name (hole_id, tee_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                COMMENT='Múltiples tees/salidas por hoyo con distancias y categorías'
            `;
            await executeQuery(createTable, []);
            console.log('✅ Tabla course_tees creada exitosamente');
            
            // Crear tees por defecto
            await createDefaultTeesForExistingHoles();
        } else {
            console.log('✅ Tabla course_tees ya existe');
        }
        
    } catch (error) {
        console.error('❌ Error creando tabla course_tees:', error);
        // No hacer throw para que el servidor no falle
        console.log('⚠️ Continuando con el inicio del servidor...');
    }
}

/**
 * Create default tees for existing holes
 */
async function createDefaultTeesForExistingHoles() {
    try {
        console.log('🔧 Creando tees por defecto para hoyos existentes...');
        
        // Obtener todos los hoyos existentes
        const getHoles = `
            SELECT h.hole_id, h.hole_number, h.par, c.course_name
            FROM course_holes h
            JOIN clubs c ON h.course_id = c.club_id
            WHERE c.is_active = true
            ORDER BY c.course_id, h.hole_number
        `;
        const { rows: holes } = await executeQuery(getHoles, []);
        
        for (const hole of holes) {
            // Verificar si ya tiene tees
            const checkTees = `SELECT COUNT(*) as count FROM course_tees WHERE hole_id = ?`;
            const { rows: teeCount } = await executeQuery(checkTees, [hole.hole_id]);
            
            if (teeCount[0].count === 0) {
                console.log(`🏌️ Creando tees para hoyo ${hole.hole_number} de ${hole.course_name}...`);
                
                // Definir tees por defecto según el par
                const defaultTees = [];
                
                if (hole.par === 3) {
                    // Par 3: distancias más cortas
                    defaultTees.push(
                        { name: 'Negro', color: '#000000', category: 'men', yards: 180, isDefault: true, order: 1 },
                        { name: 'Azul', color: '#0066CC', category: 'men', yards: 165, isDefault: false, order: 2 },
                        { name: 'Rojo', color: '#CC0000', category: 'women', yards: 140, isDefault: true, order: 3 }
                    );
                } else if (hole.par === 4) {
                    // Par 4: distancias medianas
                    defaultTees.push(
                        { name: 'Negro', color: '#000000', category: 'men', yards: 420, isDefault: true, order: 1 },
                        { name: 'Azul', color: '#0066CC', category: 'men', yards: 380, isDefault: false, order: 2 },
                        { name: 'Rojo', color: '#CC0000', category: 'women', yards: 320, isDefault: true, order: 3 }
                    );
                } else if (hole.par === 5) {
                    // Par 5: distancias largas
                    defaultTees.push(
                        { name: 'Negro', color: '#000000', category: 'men', yards: 580, isDefault: true, order: 1 },
                        { name: 'Azul', color: '#0066CC', category: 'men', yards: 540, isDefault: false, order: 2 },
                        { name: 'Rojo', color: '#CC0000', category: 'women', yards: 480, isDefault: true, order: 3 }
                    );
                }
                
                // Insertar los tees
                for (const tee of defaultTees) {
                    const insertTee = `
                        INSERT INTO course_tees (hole_id, tee_name, tee_color, category, distance_yards, is_default, display_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await executeQuery(insertTee, [
                        hole.hole_id,
                        tee.name,
                        tee.color,
                        tee.category,
                        tee.yards,
                        tee.isDefault,
                        tee.order
                    ]);
                }
            }
        }
        
        console.log('✅ Tees por defecto creados exitosamente');
        
    } catch (error) {
        console.error('❌ Error creando tees por defecto:', error);
        throw error;
    }
}

/**
 * Create default holes for existing clubs
 */
async function createDefaultHolesForExistingClubs() {
    try {
        console.log('🔧 Creando hoyos por defecto para clubes existentes...');
        
        // Obtener todos los clubes existentes
        const getClubs = `SELECT club_id as course_id, club_name as course_name FROM clubs WHERE is_active = true`;
        const { rows: clubs } = await executeQuery(getClubs, []);
        
        for (const club of clubs) {
            // Verificar si ya tiene hoyos
            const checkHoles = `SELECT COUNT(*) as count FROM course_holes WHERE course_id = ?`;
            const { rows: holeCount } = await executeQuery(checkHoles, [club.course_id]);
            
            if (holeCount[0].count === 0) {
                console.log(`🏌️ Creando 18 hoyos para ${club.course_name}...`);
                
                // Crear 18 hoyos con valores por defecto
                for (let i = 1; i <= 18; i++) {
                    // Par por defecto: distribución realista
                    let defaultPar = 4;
                    if ([3, 6, 8, 12, 15, 17].includes(i)) defaultPar = 3; // Par 3
                    if ([5, 9, 14, 18].includes(i)) defaultPar = 5; // Par 5
                    
                    // Handicap por defecto (1-18, donde 1 es el más difícil)
                    const defaultHandicap = i;
                    
                    // Distancias por defecto según el par
                    let defaultMeters = null;
                    let defaultYards = null;
                    if (defaultPar === 3) {
                        defaultMeters = 150;
                        defaultYards = 164;
                    } else if (defaultPar === 4) {
                        defaultMeters = 350;
                        defaultYards = 383;
                    } else if (defaultPar === 5) {
                        defaultMeters = 500;
                        defaultYards = 547;
                    }
                    
                    const insertHole = `
                        INSERT INTO course_holes (course_id, hole_number, par, handicap, distance_meters, distance_yards, description)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await executeQuery(insertHole, [
                        club.course_id, 
                        i, 
                        defaultPar, 
                        defaultHandicap, 
                        defaultMeters, 
                        defaultYards, 
                        `Hoyo ${i} - Par ${defaultPar}`
                    ]);
                }
                
                console.log(`✅ 18 hoyos creados para ${club.course_name}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error creando hoyos por defecto:', error);
        throw error;
    }
}

// ================================
// COURSE HOLES MANAGEMENT FUNCTIONS
// ================================

/**
 * Get all holes for a specific course
 */
async function getCourseHoles(courseId) {
    try {
        const query = `
            SELECT 
                hole_id,
                course_id,
                hole_number,
                par,
                handicap,
                distance_meters,
                distance_yards,
                description,
                created_at,
                updated_at
            FROM course_holes 
            WHERE course_id = ? 
            ORDER BY hole_number
        `;
        
        const { rows } = await executeQuery(query, [courseId]);
        return rows;
    } catch (error) {
        console.error('❌ Error getting course holes:', error);
        throw error;
    }
}

/**
 * Update a specific hole
 */
async function updateCourseHole(holeId, holeData) {
    try {
        // Build dynamic query based on provided fields
        const updates = [];
        const params = [];
        
        if (holeData.par !== undefined) {
            updates.push('par = ?');
            params.push(holeData.par);
        }
        
        if (holeData.handicap !== undefined) {
            updates.push('handicap = ?');
            params.push(holeData.handicap);
        }
        
        if (holeData.distance_meters !== undefined) {
            updates.push('distance_meters = ?');
            params.push(holeData.distance_meters);
        }
        
        if (holeData.distance_yards !== undefined) {
            updates.push('distance_yards = ?');
            params.push(holeData.distance_yards);
        }
        
        if (holeData.description !== undefined) {
            updates.push('description = ?');
            params.push(holeData.description);
        }
        
        if (updates.length === 0) {
            throw new Error('No fields to update');
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(holeId);
        
        const query = `
            UPDATE course_holes 
            SET ${updates.join(', ')}
            WHERE hole_id = ?
        `;
        
        console.log('🔧 Update query:', query);
        console.log('🔧 Update params:', params);
        const result = await executeQuery(query, params);
        console.log('🔧 Update result:', result);
        
        // Check if the result has the expected structure
        const affectedRows = result.affectedRows || result.rows?.affectedRows || 0;
        console.log('🔧 Affected rows:', affectedRows);
        
        return affectedRows > 0;
    } catch (error) {
        console.error('❌ Error updating course hole:', error);
        throw error;
    }
}

/**
 * Update multiple holes at once
 */
async function updateMultipleCourseHoles(courseId, holesData) {
    try {
        const results = [];
        
        for (const holeData of holesData) {
            const { hole_number, par, handicap, distance_meters, distance_yards, description } = holeData;
            
            const query = `
                UPDATE course_holes 
                SET 
                    par = ?,
                    handicap = ?,
                    distance_meters = ?,
                    distance_yards = ?,
                    description = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE course_id = ? AND hole_number = ?
            `;
            
            const result = await executeQuery(query, [
                par, 
                handicap, 
                distance_meters, 
                distance_yards, 
                description, 
                courseId,
                hole_number
            ]);
            
            results.push({
                hole_number,
                success: result.affectedRows > 0
            });
        }
        
        return results;
    } catch (error) {
        console.error('❌ Error updating multiple course holes:', error);
        throw error;
    }
}

/**
 * Get course statistics (total par, total distance, etc.)
 */
async function getCourseStatistics(courseId) {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_holes,
                SUM(par) as total_par,
                AVG(par) as average_par,
                SUM(distance_meters) as total_distance_meters,
                SUM(distance_yards) as total_distance_yards,
                COUNT(CASE WHEN par = 3 THEN 1 END) as par_3_holes,
                COUNT(CASE WHEN par = 4 THEN 1 END) as par_4_holes,
                COUNT(CASE WHEN par = 5 THEN 1 END) as par_5_holes
            FROM course_holes 
            WHERE course_id = ?
        `;
        
        const { rows } = await executeQuery(query, [courseId]);
        return rows[0] || null;
    } catch (error) {
        console.error('❌ Error getting course statistics:', error);
        throw error;
    }
}

// ========================= COURSE TEES FUNCTIONS =========================

/**
 * Get all tees for holes in a specific course
 */
async function getCourseTees(courseId) {
    try {
        const query = `
            SELECT 
                t.tee_id,
                t.hole_id,
                t.tee_name,
                t.tee_color,
                t.category,
                t.distance_yards,
                t.is_default,
                t.display_order,
                h.hole_number,
                h.par,
                h.handicap
            FROM course_tees t
            JOIN course_holes h ON t.hole_id = h.hole_id
            WHERE h.course_id = ?
            ORDER BY h.hole_number, t.display_order, t.tee_name
        `;
        
        const { rows } = await executeQuery(query, [courseId]);
        return rows;
    } catch (error) {
        console.error('❌ Error getting course tees:', error);
        throw error;
    }
}

/**
 * Get tees for a specific hole
 */
async function getHoleTees(holeId) {
    try {
        const query = `
            SELECT 
                tee_id,
                hole_id,
                tee_name,
                tee_color,
                category,
                distance_yards,
                is_default,
                display_order
            FROM course_tees
            WHERE hole_id = ?
            ORDER BY display_order, tee_name
        `;
        
        const { rows } = await executeQuery(query, [holeId]);
        return rows;
    } catch (error) {
        console.error('❌ Error getting hole tees:', error);
        throw error;
    }
}

/**
 * Create a new tee for a hole
 */
async function createTee(holeId, teeData) {
    try {
        const { tee_name, tee_color, category, distance_yards, is_default, display_order } = teeData;
        
        const query = `
            INSERT INTO course_tees 
            (hole_id, tee_name, tee_color, category, distance_yards, is_default, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await executeQuery(query, [
            holeId,
            tee_name,
            tee_color,
            category,
            distance_yards,
            is_default || false,
            display_order || 1
        ]);
        
        return result.insertId;
    } catch (error) {
        console.error('❌ Error creating tee:', error);
        throw error;
    }
}

/**
 * Update a specific tee
 */
async function updateTee(teeId, teeData) {
    try {
        console.log('🔧 Updating tee:', { teeId, teeData });
        
        const { tee_name, tee_color, category, distance_yards, is_default, display_order } = teeData;
        
        const query = `
            UPDATE course_tees 
            SET 
                tee_name = ?,
                tee_color = ?,
                category = ?,
                distance_yards = ?,
                is_default = ?,
                display_order = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE tee_id = ?
        `;
        
        const result = await executeQuery(query, [
            tee_name,
            tee_color,
            category,
            distance_yards,
            is_default ? 1 : 0,
            display_order || 1,
            teeId
        ]);
        
        console.log('✅ Update result:', result);
        
        // Check if the result has the expected structure
        const affectedRows = result.affectedRows || result.rows?.affectedRows || 0;
        console.log('🔧 Affected rows:', affectedRows);
        
        if (affectedRows > 0) {
            // Obtener los datos actualizados
            const getUpdated = `SELECT * FROM course_tees WHERE tee_id = ?`;
            const { rows } = await executeQuery(getUpdated, [teeId]);
            console.log('📊 Updated tee data:', rows[0]);
            return rows[0];
        } else {
            throw new Error('No se pudo actualizar el tee');
        }
    } catch (error) {
        console.error('❌ Error updating tee:', error);
        
        // Provide better error messages for common issues
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('unique_hole_tee_name')) {
            throw new Error('Ya existe una salida con ese nombre en este hoyo. Por favor, elige un nombre diferente.');
        }
        
        throw error;
    }
}

/**
 * Delete a tee
 */
async function deleteTee(teeId) {
    try {
        console.log('🗑️ Deleting tee with ID:', teeId);
        const query = `DELETE FROM course_tees WHERE tee_id = ?`;
        const result = await executeQuery(query, [teeId]);
        console.log('🗑️ Delete result:', result);
        
        // Check if the result has the expected structure
        const affectedRows = result.affectedRows || result.rows?.affectedRows || 0;
        console.log('🗑️ Affected rows:', affectedRows);
        
        return affectedRows > 0;
    } catch (error) {
        console.error('❌ Error deleting tee:', error);
        throw error;
    }
}

/**
 * Get tees grouped by hole with comprehensive hole information
 */
async function getCourseTeesGroupedByHole(courseId) {
    try {
        const query = `
            SELECT 
                h.hole_id,
                h.hole_number,
                h.par,
                h.handicap,
                h.description,
                t.tee_id,
                t.tee_name,
                t.tee_color,
                t.category,
                t.distance_yards,
                t.is_default,
                t.display_order
            FROM course_holes h
            LEFT JOIN course_tees t ON h.hole_id = t.hole_id
            WHERE h.course_id = ?
            ORDER BY h.hole_number, t.display_order, t.tee_name
        `;
        
        const { rows } = await executeQuery(query, [courseId]);
        
        // Group by hole in JavaScript
        const holesMap = new Map();
        
        rows.forEach(row => {
            const holeId = row.hole_id;
            
            if (!holesMap.has(holeId)) {
                holesMap.set(holeId, {
                    hole_id: row.hole_id,
                    hole_number: row.hole_number,
                    par: row.par,
                    handicap: row.handicap,
                    description: row.description,
                    tees: []
                });
            }
            
            // Add tee if it exists
            if (row.tee_id) {
                holesMap.get(holeId).tees.push({
                    tee_id: row.tee_id,
                    tee_name: row.tee_name,
                    tee_color: row.tee_color,
                    category: row.category,
                    distance_yards: row.distance_yards,
                    is_default: row.is_default,
                    display_order: row.display_order
                });
            }
        });
        
        return Array.from(holesMap.values());
    } catch (error) {
        console.error('❌ Error getting course tees grouped by hole:', error);
        throw error;
    }
}

// ================================
// RANKINGS FUNCTIONS
// ================================

/**
 * Get annual rankings for a club
 */
async function getAnnualRankings(clubId, year) {
    try {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // Rankings with handicap (best 16)
        const withHcpQuery = `
            SELECT 
                m.member_id,
                CONCAT(m.first_name, ' ', m.last_name) as player_name,
                m.member_number,
                COUNT(DISTINCT tp.tournament_id) as rounds,
                SUM(s.total_gross) as total_gross,
                SUM(s.total_net) as total_net
            FROM members m
            INNER JOIN tournament_participation tp ON m.member_id = tp.player_id AND tp.is_member = 1
            INNER JOIN tournaments t ON tp.tournament_id = t.tournament_id AND t.is_ranking_event = 1
            INNER JOIN scorecards s ON tp.participation_id = s.participation_id
            WHERE m.course_id = ? 
                AND t.tournament_date BETWEEN ? AND ?
                AND tp.handicap_index IS NOT NULL 
                AND tp.handicap_index > 0
            GROUP BY m.member_id, m.first_name, m.last_name, m.member_number
            ORDER BY total_net ASC
            LIMIT 16
        `;

        // Rankings without handicap (best 8)
        const withoutHcpQuery = `
            SELECT 
                m.member_id,
                CONCAT(m.first_name, ' ', m.last_name) as player_name,
                m.member_number,
                COUNT(DISTINCT tp.tournament_id) as rounds,
                SUM(s.total_gross) as total_gross
            FROM members m
            INNER JOIN tournament_participation tp ON m.member_id = tp.player_id AND tp.is_member = 1
            INNER JOIN tournaments t ON tp.tournament_id = t.tournament_id AND t.is_ranking_event = 1
            INNER JOIN scorecards s ON tp.participation_id = s.participation_id
            WHERE m.course_id = ? 
                AND t.tournament_date BETWEEN ? AND ?
                AND (tp.handicap_index IS NULL OR tp.handicap_index = 0)
            GROUP BY m.member_id, m.first_name, m.last_name, m.member_number
            ORDER BY total_gross ASC
            LIMIT 8
        `;

        const { rows: withHcp } = await executeQuery(withHcpQuery, [clubId, startDate, endDate]);
        const { rows: withoutHcp } = await executeQuery(withoutHcpQuery, [clubId, startDate, endDate]);

        return {
            year,
            club_id: clubId,
            with_hcp: withHcp,
            without_hcp: withoutHcp,
            top_cuts: {
                with_hcp: withHcp.slice(0, 16),
                without_hcp: withoutHcp.slice(0, 8)
            }
        };
    } catch (error) {
        console.error('❌ Error getting annual rankings:', error);
        throw error;
    }
}

/**
 * Get tournament ranking
 */
async function getTournamentRanking(clubId, tournamentId) {
    try {
        // Rankings with handicap
        const withHcpQuery = `
            SELECT 
                tp.participation_id,
                CASE 
                    WHEN tp.is_member = 1 THEN m.member_id
                    ELSE ep.external_player_id
                END as member_id,
                tp.player_name,
                m.member_number,
                s.total_gross,
                s.total_net,
                tp.handicap_index,
                tp.handicap_local
            FROM tournament_participation tp
            LEFT JOIN members m ON tp.player_id = m.member_id AND tp.is_member = 1
            LEFT JOIN external_players ep ON tp.player_id = ep.external_player_id AND tp.is_member = 0
            INNER JOIN scorecards s ON tp.participation_id = s.participation_id
            WHERE tp.tournament_id = ? 
                AND tp.handicap_index IS NOT NULL 
                AND tp.handicap_index > 0
            ORDER BY s.total_net ASC
        `;

        // Rankings without handicap
        const withoutHcpQuery = `
            SELECT 
                tp.participation_id,
                CASE 
                    WHEN tp.is_member = 1 THEN m.member_id
                    ELSE ep.external_player_id
                END as member_id,
                tp.player_name,
                m.member_number,
                s.total_gross,
                tp.handicap_index,
                tp.handicap_local
            FROM tournament_participation tp
            LEFT JOIN members m ON tp.player_id = m.member_id AND tp.is_member = 1
            LEFT JOIN external_players ep ON tp.player_id = ep.external_player_id AND tp.is_member = 0
            INNER JOIN scorecards s ON tp.participation_id = s.participation_id
            WHERE tp.tournament_id = ? 
                AND (tp.handicap_index IS NULL OR tp.handicap_index = 0)
            ORDER BY s.total_gross ASC
        `;

        const { rows: withHcp } = await executeQuery(withHcpQuery, [tournamentId]);
        const { rows: withoutHcp } = await executeQuery(withoutHcpQuery, [tournamentId]);

        return {
            tournament_id: tournamentId,
            club_id: clubId,
            with_hcp: withHcp,
            without_hcp: withoutHcp
        };
    } catch (error) {
        console.error('❌ Error getting tournament ranking:', error);
        throw error;
    }
}

// ================================
// PAYMENTS AND ACCOUNTING FUNCTIONS
// ================================

/**
 * Get payments summary by tournament
 */
async function getPaymentsSummary(clubId, fromDate, toDate) {
    try {
        let query = `
            SELECT 
                t.tournament_id,
                t.tournament_name,
                t.tournament_date,
                COALESCE(t.currency, 'ARS') as currency,
                t.custodian,
                t.account_id,
                ca.account_name,
                SUM(COALESCE(tp.fee_amount, t.entry_fee, 0)) as total_fee,
                SUM(COALESCE(tp.paid_amount, 0)) as total_paid
            FROM tournaments t
            LEFT JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id
            LEFT JOIN custodian_accounts ca ON t.account_id = ca.account_id
            WHERE t.course_id = ?
        `;
        
        const params = [clubId];
        
        if (fromDate) {
            query += ` AND t.tournament_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND t.tournament_date <= ?`;
            params.push(toDate);
        }
        
        query += ` GROUP BY t.tournament_id, t.tournament_name, t.tournament_date, t.currency, t.custodian, t.account_id, ca.account_name ORDER BY t.tournament_date DESC`;
        
        const { rows } = await executeQuery(query, params);
        return rows;
    } catch (error) {
        console.error('❌ Error getting payments summary:', error);
        throw error;
    }
}

/**
 * Save expense photo from base64
 */
async function saveExpensePhoto(clubId, base64Data, expenseId) {
    try {
        if (!base64Data) return null;
        
        // Parse base64 data (format: data:image/jpeg;base64,/9j/4AAQ...)
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid base64 image data');
        }
        
        const imageType = matches[1]; // jpeg, png, etc.
        const imageData = matches[2];
        
        // Create uploads/expenses directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'expenses');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const filename = `expense_${clubId}_${expenseId || Date.now()}_${crypto.randomBytes(8).toString('hex')}.${imageType}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Write file
        fs.writeFileSync(filePath, imageData, 'base64');
        
        // Return relative path for database storage
        return `expenses/${filename}`;
    } catch (error) {
        console.error('❌ Error saving expense photo:', error);
        throw error;
    }
}

/**
 * Get expenses
 */
async function getExpenses(clubId, fromDate, toDate) {
    try {
        let query = `
            SELECT 
                e.expense_id,
                e.expense_date,
                e.amount,
                COALESCE(e.currency, 'ARS') as currency,
                e.receipt_number,
                e.detail,
                e.custodian,
                e.account_id,
                ca.account_name,
                e.receipt_photo_path,
                e.created_at
            FROM club_expenses e
            LEFT JOIN custodian_accounts ca ON e.account_id = ca.account_id
            WHERE e.club_id = ?
        `;
        
        const params = [clubId];
        
        if (fromDate) {
            query += ` AND e.expense_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND e.expense_date <= ?`;
            params.push(toDate);
        }
        
        query += ` ORDER BY e.expense_date DESC`;
        
        const { rows } = await executeQuery(query, params);
        return rows;
    } catch (error) {
        console.error('❌ Error getting expenses:', error);
        throw error;
    }
}

/**
 * Add expense
 */
async function addExpense(clubId, expenseData) {
    try {
        // Validar fondos suficientes si se especificó una cuenta
        if (expenseData.account_id) {
            const accountQuery = `SELECT current_balance_ars, current_balance_usd FROM custodian_accounts WHERE account_id = ? AND club_id = ?`;
            const { rows: accountRows } = await executeQuery(accountQuery, [expenseData.account_id, clubId]);
            
            if (accountRows.length === 0) {
                throw new Error('Cuenta no encontrada');
            }
            
            const account = accountRows[0];
            const currency = expenseData.currency || 'ARS';
            const availableAmount = Number(currency === 'USD' ? account.current_balance_usd : account.current_balance_ars) || 0;
            const expenseAmount = Number(expenseData.amount) || 0;
            if (isNaN(expenseAmount) || expenseAmount <= 0) {
                throw new Error('El monto del gasto debe ser un número mayor a 0');
            }
            if (availableAmount < expenseAmount) {
                throw new Error(`Fondos insuficientes en la cuenta. Disponible: ${availableAmount.toFixed(2)} ${currency}, Requerido: ${expenseAmount.toFixed(2)} ${currency}`);
            }
        }
        
        // Normalizar monto a número para INSERT y transacción
        const amountNum = Number(expenseData.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error('El monto del gasto debe ser un número mayor a 0');
        }
        
        // Primero insertamos el gasto para obtener el ID
        const query = `
            INSERT INTO club_expenses (
                club_id, expense_date, amount, currency, receipt_number, detail, custodian, account_id, receipt_photo_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        let receiptPhotoPath = expenseData.receipt_photo_path || null;
        
        const params = [
            clubId,
            expenseData.expense_date,
            amountNum,
            expenseData.currency || 'ARS',
            expenseData.receipt_number || null,
            expenseData.detail || null,
            expenseData.custodian || null,
            expenseData.account_id || null,
            receiptPhotoPath
        ];
        
        const { rows } = await executeQuery(query, params);
        const expenseId = rows.insertId;
        
        // Si hay una foto en base64, guardarla como archivo y actualizar
        if (expenseData.receipt_photo_base64 && !receiptPhotoPath) {
            receiptPhotoPath = await saveExpensePhoto(clubId, expenseData.receipt_photo_base64, expenseId);
            // Actualizar el gasto con la ruta de la foto
            const updateQuery = `UPDATE club_expenses SET receipt_photo_path = ? WHERE expense_id = ? AND club_id = ?`;
            await executeQuery(updateQuery, [receiptPhotoPath, expenseId, clubId]);
        }
        
        // Si se especificó una cuenta, crear transacción y actualizar saldo
        if (expenseData.account_id) {
            await createTransaction(clubId, {
                transaction_type: 'expense',
                transaction_date: expenseData.expense_date,
                from_account_id: expenseData.account_id,
                to_account_id: null,
                amount: amountNum,
                currency: expenseData.currency || 'ARS',
                description: expenseData.detail || 'Gasto registrado',
                reference_type: 'expense',
                reference_id: expenseId
            });
        }
        
        return { expense_id: expenseId };
    } catch (error) {
        console.error('❌ Error adding expense:', error);
        throw error;
    }
}

/**
 * Delete expense
 */
async function deleteExpense(clubId, expenseId) {
    try {
        // Primero obtener los datos del gasto para revertir el balance
        const getQuery = `SELECT amount, currency, account_id FROM club_expenses WHERE club_id = ? AND expense_id = ?`;
        const { rows: expenseRows } = await executeQuery(getQuery, [clubId, expenseId]);
        
        if (expenseRows.length > 0 && expenseRows[0].account_id) {
            const expense = expenseRows[0];
            // Revertir: sumar de vuelta el monto (porque al gastar se restó)
            await updateAccountBalance(
                expense.account_id,
                expense.amount,
                expense.currency || 'ARS',
                'add'
            );
        }
        
        // Eliminar el gasto
        const query = `DELETE FROM club_expenses WHERE club_id = ? AND expense_id = ?`;
        await executeQuery(query, [clubId, expenseId]);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting expense:', error);
        throw error;
    }
}

/**
 * Update an expense
 * Also updates the linked account_transaction and account balance so Cuentas/Historial stays in sync.
 */
async function updateExpense(clubId, expenseId, expenseData) {
    try {
        // Obtener el gasto anterior para sincronizar transacción y saldo
        const getOldQuery = `SELECT amount, currency, account_id FROM club_expenses WHERE club_id = ? AND expense_id = ?`;
        const { rows: oldRows } = await executeQuery(getOldQuery, [clubId, expenseId]);
        const oldExpense = oldRows.length > 0 ? oldRows[0] : null;
        const oldAmount = oldExpense ? Number(oldExpense.amount) : 0;
        const oldCurrency = (oldExpense && oldExpense.currency) || 'ARS';
        const oldAccountId = oldExpense && oldExpense.account_id ? oldExpense.account_id : null;

        const newAmount = Number(expenseData.amount) || 0;
        const newCurrency = expenseData.currency || 'ARS';
        const newAccountId = expenseData.account_id ? expenseData.account_id : null;

        // Si hay una foto en base64, guardarla como archivo
        let receiptPhotoPath = expenseData.receipt_photo_path;
        if (expenseData.receipt_photo_base64) {
            // Si hay una foto anterior, eliminarla
            if (receiptPhotoPath) {
                try {
                    const oldFilePath = path.join(__dirname, '..', 'uploads', receiptPhotoPath);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                } catch (error) {
                    console.error('Error deleting old photo:', error);
                }
            }
            receiptPhotoPath = await saveExpensePhoto(clubId, expenseData.receipt_photo_base64, expenseId);
        }

        // Actualizar el gasto
        const query = `
            UPDATE club_expenses 
            SET 
                expense_date = ?,
                amount = ?,
                currency = ?,
                receipt_number = ?,
                detail = ?,
                custodian = ?,
                account_id = ?,
                receipt_photo_path = ?
            WHERE club_id = ? AND expense_id = ?
        `;

        const params = [
            expenseData.expense_date,
            expenseData.amount,
            expenseData.currency || 'ARS',
            expenseData.receipt_number || null,
            expenseData.detail || null,
            expenseData.custodian || null,
            expenseData.account_id || null,
            receiptPhotoPath,
            clubId,
            expenseId
        ];

        await executeQuery(query, params);

        // Sincronizar account_transactions y saldos con el nuevo monto/cuenta
        const txQuery = `SELECT transaction_id, from_account_id, amount, currency FROM account_transactions WHERE club_id = ? AND reference_type = 'expense' AND reference_id = ?`;
        const { rows: txRows } = await executeQuery(txQuery, [clubId, expenseId]);
        const existingTx = txRows.length > 0 ? txRows[0] : null;

        if (oldAccountId && oldAmount > 0) {
            // Revertir el monto anterior en la cuenta (sumar de vuelta)
            await updateAccountBalance(oldAccountId, oldAmount, oldCurrency, 'add');
        }

        if (existingTx) {
            if (newAccountId && newAmount > 0) {
                // Actualizar la transacción con el nuevo monto y cuenta
                await executeQuery(
                    `UPDATE account_transactions SET transaction_date = ?, from_account_id = ?, amount = ?, currency = ?, description = ? WHERE transaction_id = ?`,
                    [
                        expenseData.expense_date,
                        newAccountId,
                        newAmount,
                        newCurrency,
                        expenseData.detail || 'Gasto registrado',
                        existingTx.transaction_id
                    ]
                );
                await updateAccountBalance(newAccountId, newAmount, newCurrency, 'subtract');
            } else {
                // El gasto ya no tiene cuenta: eliminar la transacción (el saldo ya se revirtió arriba)
                await executeQuery(`DELETE FROM account_transactions WHERE transaction_id = ?`, [existingTx.transaction_id]);
            }
        } else if (newAccountId && newAmount > 0) {
            // No había transacción pero ahora tiene cuenta: crear la transacción
            await createTransaction(clubId, {
                transaction_type: 'expense',
                transaction_date: expenseData.expense_date,
                from_account_id: newAccountId,
                to_account_id: null,
                amount: newAmount,
                currency: newCurrency,
                description: expenseData.detail || 'Gasto registrado',
                reference_type: 'expense',
                reference_id: expenseId
            });
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error updating expense:', error);
        throw error;
    }
}

// ================================
// OTHER INCOMES FUNCTIONS
// ================================

/**
 * Get other incomes (non-tournament incomes)
 */
async function getMemberContributions(clubId, memberId) {
    try {
        const query = `
            SELECT 
                income_id,
                income_date,
                amount,
                COALESCE(currency, 'ARS') as currency,
                payment_type,
                description
            FROM other_incomes
            WHERE club_id = ? AND member_id = ?
            ORDER BY income_date DESC
        `;
        const { rows } = await executeQuery(query, [clubId, memberId]);
        return rows;
    } catch (error) {
        console.error('❌ Error getting member contributions:', error);
        throw error;
    }
}

async function getOtherIncomes(clubId, fromDate, toDate) {
    try {
        let query = `
            SELECT 
                oi.income_id,
                oi.member_id,
                oi.income_date,
                oi.amount,
                COALESCE(oi.currency, 'ARS') as currency,
                oi.payment_type,
                oi.description,
                oi.custodian,
                oi.account_id,
                ca.account_name,
                oi.received_amount,
                oi.received_currency,
                oi.change_amount,
                oi.change_currency,
                oi.exchange_rate,
                oi.created_at,
                CONCAT(m.first_name, ' ', m.last_name) as member_name
            FROM other_incomes oi
            LEFT JOIN members m ON oi.member_id = m.member_id
            LEFT JOIN custodian_accounts ca ON oi.account_id = ca.account_id
            WHERE oi.club_id = ?
        `;
        
        const params = [clubId];
        
        if (fromDate) {
            query += ` AND oi.income_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND oi.income_date <= ?`;
            params.push(toDate);
        }
        
        query += ` ORDER BY oi.income_date DESC`;
        
        const { rows } = await executeQuery(query, params);
        return rows;
    } catch (error) {
        console.error('❌ Error getting other incomes:', error);
        throw error;
    }
}

/**
 * Add other income
 */
async function addOtherIncome(clubId, incomeData) {
    try {
        const query = `
            INSERT INTO other_incomes (
                club_id, member_id, income_date, amount, currency, payment_type, description, custodian, account_id,
                received_amount, received_currency, change_amount, change_currency, exchange_rate, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
            clubId,
            incomeData.member_id || null,
            incomeData.income_date,
            incomeData.amount,
            incomeData.currency || 'ARS',
            incomeData.payment_type || 'efectivo',
            incomeData.description || null,
            incomeData.custodian || null,
            incomeData.account_id || null,
            incomeData.received_amount || null,
            incomeData.received_currency || null,
            incomeData.change_amount || null,
            incomeData.change_currency || null,
            incomeData.exchange_rate || null
        ];
        
        const { rows } = await executeQuery(query, params);
        const incomeId = rows.insertId;
        
        // Si se especificó una cuenta, crear transacción y actualizar saldo
        if (incomeData.account_id) {
            // Calcular el monto a ingresar: si hay received_amount, usar ese; sino usar amount
            const amountToReceive = incomeData.received_amount || incomeData.amount;
            const currencyToReceive = incomeData.received_currency || incomeData.currency || 'ARS';
            
            await createTransaction(clubId, {
                transaction_type: 'income_other',
                transaction_date: incomeData.income_date,
                from_account_id: null,
                to_account_id: incomeData.account_id,
                amount: amountToReceive,
                currency: currencyToReceive,
                description: incomeData.description || 'Ingreso registrado',
                reference_type: 'other_income',
                reference_id: incomeId
            });
            
            // Si hay cambio, crear un expense automáticamente
            if (incomeData.change_amount && incomeData.change_amount > 0 && incomeData.account_id) {
                // Obtener nombre del socio si existe
                let memberName = '';
                if (incomeData.member_id) {
                    try {
                        const memberQuery = `SELECT first_name, last_name FROM members WHERE member_id = ? AND course_id = ?`;
                        const { rows: memberRows } = await executeQuery(memberQuery, [incomeData.member_id, clubId]);
                        if (memberRows.length > 0) {
                            memberName = `${memberRows[0].first_name} ${memberRows[0].last_name}`;
                            console.log(`✅ Nombre del socio obtenido: ${memberName}`);
                        } else {
                            console.warn(`⚠️ No se encontró socio con ID ${incomeData.member_id} en club ${clubId}`);
                        }
                    } catch (error) {
                        console.error('❌ Error obteniendo nombre del socio:', error);
                    }
                } else {
                    console.log('ℹ️ No hay member_id en incomeData');
                }
                
                const changeDetail = memberName 
                    ? `Cambio devuelto a ${memberName} - ${incomeData.description || 'Ingreso registrado'}`
                    : `Cambio devuelto - ${incomeData.description || 'Ingreso registrado'}`;
                
                console.log(`💰 Creando gasto de cambio: ${changeDetail}`);
                
                await addExpense(clubId, {
                    expense_date: incomeData.income_date,
                    amount: incomeData.change_amount,
                    currency: incomeData.change_currency || 'ARS',
                    receipt_number: null,
                    detail: changeDetail,
                    custodian: incomeData.custodian || null,
                    account_id: incomeData.account_id
                });
            }
        }
        
        return { income_id: incomeId };
    } catch (error) {
        console.error('❌ Error adding other income:', error);
        throw error;
    }
}

/**
 * Delete other income
 */
async function deleteOtherIncome(clubId, incomeId) {
    try {
        // Primero obtener los datos del ingreso para revertir el balance
        const getQuery = `SELECT amount, currency, account_id, received_amount, received_currency, change_amount, change_currency FROM other_incomes WHERE club_id = ? AND income_id = ?`;
        const { rows: incomeRows } = await executeQuery(getQuery, [clubId, incomeId]);
        
        if (incomeRows.length > 0) {
            const income = incomeRows[0];
            
            // Revertir el balance de la cuenta principal (usar received_amount si existe, sino amount)
            if (income.account_id) {
                const amountToRevert = income.received_amount || income.amount;
                const currencyToRevert = income.received_currency || income.currency || 'ARS';
                
                await updateAccountBalance(
                    income.account_id,
                    amountToRevert,
                    currencyToRevert,
                    'subtract'
                );
            }
            
            // Si hay cambio, también revertir el expense del cambio
            if (income.change_amount > 0 && income.account_id) {
                await updateAccountBalance(
                    income.account_id,
                    income.change_amount,
                    income.change_currency || 'ARS',
                    'add'
                );
            }
        }
        
        // Eliminar la transacción asociada en account_transactions
        const deleteTransactionQuery = `DELETE FROM account_transactions WHERE club_id = ? AND reference_type = 'other_income' AND reference_id = ?`;
        await executeQuery(deleteTransactionQuery, [clubId, incomeId]);
        
        // Eliminar el expense del cambio si existe
        const deleteChangeExpenseQuery = `
            DELETE FROM club_expenses 
            WHERE club_id = ? 
            AND expense_date = (SELECT income_date FROM other_incomes WHERE income_id = ? AND club_id = ?)
            AND amount = (SELECT change_amount FROM other_incomes WHERE income_id = ? AND club_id = ?)
            AND currency = (SELECT change_currency FROM other_incomes WHERE income_id = ? AND club_id = ?)
            AND description LIKE '%Cambio%'
        `;
        // Primero obtener la fecha y montos del cambio
        if (incomeRows.length > 0 && incomeRows[0].change_amount > 0) {
            const income = incomeRows[0];
            const deleteExpenseQuery = `
                DELETE FROM club_expenses 
                WHERE club_id = ? 
                AND account_id = ?
                AND expense_date = (SELECT income_date FROM other_incomes WHERE income_id = ? AND club_id = ?)
                AND amount = ?
                AND currency = ?
                AND description LIKE '%Cambio%'
            `;
            const getIncomeDateQuery = `SELECT income_date FROM other_incomes WHERE club_id = ? AND income_id = ?`;
            const { rows: dateRows } = await executeQuery(getIncomeDateQuery, [clubId, incomeId]);
            if (dateRows.length > 0) {
                await executeQuery(deleteExpenseQuery, [
                    clubId,
                    income.account_id,
                    incomeId,
                    clubId,
                    income.change_amount,
                    income.change_currency || 'ARS'
                ]);
            }
        }
        
        // Eliminar el ingreso
        const query = `DELETE FROM other_incomes WHERE club_id = ? AND income_id = ?`;
        await executeQuery(query, [clubId, incomeId]);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting other income:', error);
        throw error;
    }
}

/**
 * Update an other income
 */
async function updateOtherIncome(clubId, incomeId, incomeData) {
    try {
        // Obtener el ingreso actual para verificar si hay cambios en el cambio
        const getCurrentQuery = `SELECT change_amount, change_currency, account_id FROM other_incomes WHERE club_id = ? AND income_id = ?`;
        const { rows: currentRows } = await executeQuery(getCurrentQuery, [clubId, incomeId]);
        const currentIncome = currentRows[0];
        
        // Actualizar el ingreso
        const query = `
            UPDATE other_incomes 
            SET 
                member_id = ?,
                income_date = ?,
                amount = ?,
                currency = ?,
                payment_type = ?,
                description = ?,
                custodian = ?,
                account_id = ?,
                received_amount = ?,
                received_currency = ?,
                change_amount = ?,
                change_currency = ?,
                exchange_rate = ?
            WHERE club_id = ? AND income_id = ?
        `;
        
        const params = [
            incomeData.member_id || null,
            incomeData.income_date,
            incomeData.amount,
            incomeData.currency || 'ARS',
            incomeData.payment_type || 'efectivo',
            incomeData.description || null,
            incomeData.custodian || null,
            incomeData.account_id || null,
            incomeData.received_amount || null,
            incomeData.received_currency || null,
            incomeData.change_amount || null,
            incomeData.change_currency || null,
            incomeData.exchange_rate || null,
            clubId,
            incomeId
        ];
        
        const { rows } = await executeQuery(query, params);
        
        // TODO: Si cambió el cambio, deberíamos actualizar/eliminar el expense relacionado
        // Por ahora, solo actualizamos el ingreso
        
        return { success: true, affectedRows: rows.affectedRows };
    } catch (error) {
        console.error('❌ Error updating other income:', error);
        throw error;
    }
}

/**
 * Get unique custodians
 */
async function getCustodians(clubId) {
    try {
        // Obtener custodians únicos de gastos e ingresos
        const query = `
            SELECT DISTINCT custodian 
            FROM (
                SELECT custodian FROM club_expenses WHERE club_id = ? AND custodian IS NOT NULL AND custodian != ''
                UNION
                SELECT custodian FROM other_incomes WHERE club_id = ? AND custodian IS NOT NULL AND custodian != ''
            ) AS custodians
            ORDER BY custodian
        `;
        const { rows } = await executeQuery(query, [clubId, clubId]);
        return rows.map(r => r.custodian);
    } catch (error) {
        console.error('❌ Error getting custodians:', error);
        throw error;
    }
}

// ================================
// CURRENCY EXCHANGES FUNCTIONS
// ================================

/**
 * Get currency exchanges
 */
async function getCurrencyExchanges(clubId, fromDate, toDate) {
    try {
        let query = `
            SELECT 
                ce.exchange_id,
                ce.exchange_date,
                ce.from_currency,
                ce.from_amount,
                ce.to_currency,
                ce.to_amount,
                ce.exchange_rate,
                ce.notes,
                ce.from_account_id,
                ce.to_account_id,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name,
                ce.created_at
            FROM currency_exchanges ce
            LEFT JOIN custodian_accounts fa ON ce.from_account_id = fa.account_id
            LEFT JOIN custodian_accounts ta ON ce.to_account_id = ta.account_id
            WHERE ce.club_id = ?
        `;
        
        const params = [clubId];
        
        if (fromDate) {
            query += ` AND ce.exchange_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND ce.exchange_date <= ?`;
            params.push(toDate);
        }
        
        query += ` ORDER BY ce.exchange_date DESC, ce.created_at DESC`;
        
        const { rows } = await executeQuery(query, params);
        return rows || [];
    } catch (error) {
        console.error('❌ Error getting currency exchanges:', error);
        throw error;
    }
}

/**
 * Get currency balance for a club
 */
async function getCurrencyBalance(clubId) {
    try {
        // Calcular balance por moneda
        const balance = { ARS: 0, USD: 0 };
        
        // 1. Ingresos de torneos por moneda
        try {
            const incomesQuery = `
                SELECT 
                    COALESCE(tp.currency, 'ARS') as currency,
                    SUM(tp.paid_amount) as total
                FROM tournament_participants tp
                JOIN tournaments t ON tp.tournament_id = t.tournament_id
                WHERE t.course_id = ? AND tp.payment_status = 'paid'
                GROUP BY COALESCE(tp.currency, 'ARS')
            `;
            const incomes = await executeQuery(incomesQuery, [clubId]);
            incomes.rows.forEach(r => {
                balance[r.currency] = (balance[r.currency] || 0) + Number(r.total || 0);
            });
        } catch (error) {
            console.error('Error en ingresos torneos:', error);
        }
        
        // 2. Otros ingresos por moneda
        // Usar received_amount si existe (monto realmente recibido), sino usar amount (monto a cobrar)
        try {
            const otherIncomesQuery = `
                SELECT 
                    COALESCE(
                        CASE WHEN received_currency IS NOT NULL THEN received_currency ELSE currency END,
                        'ARS'
                    ) as currency,
                    SUM(
                        CASE 
                            WHEN received_amount IS NOT NULL AND received_amount > 0 
                            THEN received_amount 
                            ELSE amount 
                        END
                    ) as total
                FROM other_incomes
                WHERE club_id = ?
                GROUP BY COALESCE(
                    CASE WHEN received_currency IS NOT NULL THEN received_currency ELSE currency END,
                    'ARS'
                )
            `;
            const otherIncomes = await executeQuery(otherIncomesQuery, [clubId]);
            otherIncomes.rows.forEach(r => {
                balance[r.currency] = (balance[r.currency] || 0) + Number(r.total || 0);
            });
        } catch (error) {
            console.error('Error en otros ingresos:', error);
        }
        
        // 3. Gastos por moneda
        try {
            const expensesQuery = `
                SELECT 
                    COALESCE(currency, 'ARS') as currency,
                    SUM(amount) as total
                FROM club_expenses
                WHERE club_id = ?
                GROUP BY COALESCE(currency, 'ARS')
            `;
            const expenses = await executeQuery(expensesQuery, [clubId]);
            expenses.rows.forEach(r => {
                balance[r.currency] = (balance[r.currency] || 0) - Number(r.total || 0);
            });
        } catch (error) {
            console.error('Error en gastos:', error);
        }
        
        // 4. Conversiones de moneda (solo si la tabla existe)
        try {
            const exchangesOutQuery = `
                SELECT 
                    from_currency as currency,
                    SUM(from_amount) as total
                FROM currency_exchanges
                WHERE club_id = ?
                GROUP BY from_currency
            `;
            const exchangesOut = await executeQuery(exchangesOutQuery, [clubId]);
            exchangesOut.rows.forEach(r => {
                balance[r.currency] = (balance[r.currency] || 0) - Number(r.total || 0);
            });
            
            const exchangesInQuery = `
                SELECT 
                    to_currency as currency,
                    SUM(to_amount) as total
                FROM currency_exchanges
                WHERE club_id = ?
                GROUP BY to_currency
            `;
            const exchangesIn = await executeQuery(exchangesInQuery, [clubId]);
            exchangesIn.rows.forEach(r => {
                balance[r.currency] = (balance[r.currency] || 0) + Number(r.total || 0);
            });
        } catch (error) {
            // La tabla currency_exchanges puede no existir aún
            console.log('ℹ️ Tabla currency_exchanges no disponible aún');
        }
        
        console.log('💰 Balance calculado para club', clubId, ':', balance);
        return balance;
    } catch (error) {
        console.error('❌ Error getting currency balance:', error);
        return { ARS: 0, USD: 0 }; // Retornar balance vacío en caso de error
    }
}

/**
 * Add currency exchange (with balance validation)
 */
async function addCurrencyExchange(clubId, exchangeData) {
    try {
        // Validar que se seleccionaron las cuentas
        if (!exchangeData.from_account_id) {
            throw new Error('Debe seleccionar la cuenta de origen');
        }
        if (!exchangeData.to_account_id) {
            throw new Error('Debe seleccionar la cuenta de destino');
        }
        
        // Validar que haya fondos suficientes en la cuenta de origen
        const fromAccountQuery = `SELECT current_balance_ars, current_balance_usd FROM custodian_accounts WHERE account_id = ? AND club_id = ?`;
        const { rows: fromAccountRows } = await executeQuery(fromAccountQuery, [exchangeData.from_account_id, clubId]);
        
        if (fromAccountRows.length === 0) {
            throw new Error('Cuenta de origen no encontrada');
        }
        
        const fromAccount = fromAccountRows[0];
        const availableAmount = exchangeData.from_currency === 'USD' ? fromAccount.current_balance_usd : fromAccount.current_balance_ars;
        
        if (availableAmount < exchangeData.from_amount) {
            throw new Error(`Fondos insuficientes en la cuenta de origen. Disponible: ${availableAmount.toFixed(2)} ${exchangeData.from_currency}, Requerido: ${exchangeData.from_amount} ${exchangeData.from_currency}`);
        }
        
        const query = `
            INSERT INTO currency_exchanges (
                club_id, from_account_id, to_account_id, exchange_date, from_currency, from_amount, 
                to_currency, to_amount, exchange_rate, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const params = [
            clubId,
            exchangeData.from_account_id,
            exchangeData.to_account_id,
            exchangeData.exchange_date,
            exchangeData.from_currency,
            exchangeData.from_amount,
            exchangeData.to_currency,
            exchangeData.to_amount,
            exchangeData.exchange_rate,
            exchangeData.notes || null
        ];
        
        const { rows } = await executeQuery(query, params);
        
        // Actualizar saldo de cuenta de origen (restar)
        const updateFromQuery = exchangeData.from_currency === 'USD' 
            ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd - ? WHERE account_id = ? AND club_id = ?`
            : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars - ? WHERE account_id = ? AND club_id = ?`;
        
        await executeQuery(updateFromQuery, [
            exchangeData.from_amount,
            exchangeData.from_account_id,
            clubId
        ]);
        
        // Actualizar saldo de cuenta de destino (sumar)
        const updateToQuery = exchangeData.to_currency === 'USD' 
            ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd + ? WHERE account_id = ? AND club_id = ?`
            : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars + ? WHERE account_id = ? AND club_id = ?`;
        
        await executeQuery(updateToQuery, [
            exchangeData.to_amount,
            exchangeData.to_account_id,
            clubId
        ]);
        
        return { exchange_id: rows.insertId };
    } catch (error) {
        console.error('❌ Error adding currency exchange:', error);
        throw error;
    }
}

/**
 * Update currency exchange
 */
async function updateCurrencyExchange(clubId, exchangeId, exchangeData) {
    try {
        // Obtener los valores ANTIGUOS de la conversión antes de actualizar
        const getOldQuery = `SELECT from_currency, from_amount, to_currency, to_amount, from_account_id, to_account_id FROM currency_exchanges WHERE club_id = ? AND exchange_id = ?`;
        const { rows: oldExchangeRows } = await executeQuery(getOldQuery, [clubId, exchangeId]);
        
        if (oldExchangeRows.length === 0) {
            throw new Error('Conversión no encontrada');
        }
        
        const oldExchange = oldExchangeRows[0];
        
        // Validar que se seleccionaron las cuentas en los nuevos datos
        if (!exchangeData.from_account_id) {
            throw new Error('Debe seleccionar la cuenta de origen');
        }
        if (!exchangeData.to_account_id) {
            throw new Error('Debe seleccionar la cuenta de destino');
        }
        
        // Validar fondos suficientes si se está aumentando el monto de origen
        if (exchangeData.from_account_id === oldExchange.from_account_id && 
            exchangeData.from_currency === oldExchange.from_currency &&
            exchangeData.from_amount > oldExchange.from_amount) {
            const fromAccountQuery = `SELECT current_balance_ars, current_balance_usd FROM custodian_accounts WHERE account_id = ? AND club_id = ?`;
            const { rows: fromAccountRows } = await executeQuery(fromAccountQuery, [exchangeData.from_account_id, clubId]);
            
            if (fromAccountRows.length === 0) {
                throw new Error('Cuenta de origen no encontrada');
            }
            
            const fromAccount = fromAccountRows[0];
            const availableAmount = exchangeData.from_currency === 'USD' ? fromAccount.current_balance_usd : fromAccount.current_balance_ars;
            const additionalAmount = exchangeData.from_amount - oldExchange.from_amount;
            
            if (availableAmount < additionalAmount) {
                throw new Error(`Fondos insuficientes en la cuenta de origen. Disponible: ${availableAmount.toFixed(2)} ${exchangeData.from_currency}, Requerido adicional: ${additionalAmount.toFixed(2)} ${exchangeData.from_currency}`);
            }
        }
        
        // PASO 1: Revertir los balances ANTIGUOS (devolver lo que se sacó, quitar lo que se agregó)
        if (oldExchange.from_account_id) {
            const revertFromQuery = oldExchange.from_currency === 'USD' 
                ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd + ? WHERE account_id = ? AND club_id = ?`
                : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars + ? WHERE account_id = ? AND club_id = ?`;
            
            await executeQuery(revertFromQuery, [
                oldExchange.from_amount,
                oldExchange.from_account_id,
                clubId
            ]);
            console.log(`🔄 Revertido ${oldExchange.from_amount} ${oldExchange.from_currency} a cuenta origen ${oldExchange.from_account_id}`);
        }
        
        if (oldExchange.to_account_id) {
            const revertToQuery = oldExchange.to_currency === 'USD' 
                ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd - ? WHERE account_id = ? AND club_id = ?`
                : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars - ? WHERE account_id = ? AND club_id = ?`;
            
            await executeQuery(revertToQuery, [
                oldExchange.to_amount,
                oldExchange.to_account_id,
                clubId
            ]);
            console.log(`🔄 Revertido ${oldExchange.to_amount} ${oldExchange.to_currency} de cuenta destino ${oldExchange.to_account_id}`);
        }
        
        // PASO 2: Actualizar el registro en currency_exchanges
        const query = `
            UPDATE currency_exchanges 
            SET 
                exchange_date = ?,
                from_currency = ?,
                from_amount = ?,
                to_currency = ?,
                to_amount = ?,
                exchange_rate = ?,
                notes = ?,
                from_account_id = ?,
                to_account_id = ?
            WHERE club_id = ? AND exchange_id = ?
        `;
        
        const params = [
            exchangeData.exchange_date,
            exchangeData.from_currency,
            exchangeData.from_amount,
            exchangeData.to_currency,
            exchangeData.to_amount,
            exchangeData.exchange_rate,
            exchangeData.notes || null,
            exchangeData.from_account_id || null,
            exchangeData.to_account_id || null,
            clubId,
            exchangeId
        ];
        
        const { rows } = await executeQuery(query, params);
        
        // PASO 3: Aplicar los balances NUEVOS (restar de origen, sumar a destino)
        if (exchangeData.from_account_id) {
            const updateFromQuery = exchangeData.from_currency === 'USD' 
                ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd - ? WHERE account_id = ? AND club_id = ?`
                : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars - ? WHERE account_id = ? AND club_id = ?`;
            
            await executeQuery(updateFromQuery, [
                exchangeData.from_amount,
                exchangeData.from_account_id,
                clubId
            ]);
            console.log(`✅ Aplicado ${exchangeData.from_amount} ${exchangeData.from_currency} de cuenta origen ${exchangeData.from_account_id}`);
        }
        
        if (exchangeData.to_account_id) {
            const updateToQuery = exchangeData.to_currency === 'USD' 
                ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd + ? WHERE account_id = ? AND club_id = ?`
                : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars + ? WHERE account_id = ? AND club_id = ?`;
            
            await executeQuery(updateToQuery, [
                exchangeData.to_amount,
                exchangeData.to_account_id,
                clubId
            ]);
            console.log(`✅ Aplicado ${exchangeData.to_amount} ${exchangeData.to_currency} a cuenta destino ${exchangeData.to_account_id}`);
        }
        
        return { success: true, affectedRows: rows.affectedRows };
    } catch (error) {
        console.error('❌ Error updating currency exchange:', error);
        throw error;
    }
}

/**
 * Delete currency exchange
 */
async function deleteCurrencyExchange(clubId, exchangeId) {
    try {
        // Obtener datos de la conversión antes de eliminar
        const getQuery = `SELECT from_currency, from_amount, to_currency, to_amount, from_account_id, to_account_id FROM currency_exchanges WHERE club_id = ? AND exchange_id = ?`;
        const { rows: exchangeRows } = await executeQuery(getQuery, [clubId, exchangeId]);
        
        if (exchangeRows.length > 0) {
            const exchange = exchangeRows[0];
            
            // Revertir el saldo de la cuenta de origen (devolver lo que se sacó)
            if (exchange.from_account_id) {
                const revertFromQuery = exchange.from_currency === 'USD' 
                    ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd + ? WHERE account_id = ? AND club_id = ?`
                    : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars + ? WHERE account_id = ? AND club_id = ?`;
                
                await executeQuery(revertFromQuery, [
                    exchange.from_amount,
                    exchange.from_account_id,
                    clubId
                ]);
            }
            
            // Revertir el saldo de la cuenta de destino (quitar lo que se agregó)
            if (exchange.to_account_id) {
                const revertToQuery = exchange.to_currency === 'USD' 
                    ? `UPDATE custodian_accounts SET current_balance_usd = current_balance_usd - ? WHERE account_id = ? AND club_id = ?`
                    : `UPDATE custodian_accounts SET current_balance_ars = current_balance_ars - ? WHERE account_id = ? AND club_id = ?`;
                
                await executeQuery(revertToQuery, [
                    exchange.to_amount,
                    exchange.to_account_id,
                    clubId
                ]);
            }
        }
        
        const query = `DELETE FROM currency_exchanges WHERE club_id = ? AND exchange_id = ?`;
        const { rows } = await executeQuery(query, [clubId, exchangeId]);
        
        if (rows.affectedRows === 0) {
            console.warn(`⚠️ No se encontró conversión con ID ${exchangeId} para eliminar`);
        } else {
            console.log(`✅ Conversión ${exchangeId} eliminada. Filas afectadas: ${rows.affectedRows}`);
        }
        
        return { success: true, affectedRows: rows.affectedRows };
    } catch (error) {
        console.error('❌ Error deleting currency exchange:', error);
        throw error;
    }
}

/**
 * Get system statistics
 */
async function getSystemStats() {
    const queries = [
        'SELECT COUNT(*) as total_clubs FROM clubs',
        "SELECT COUNT(*) as total_members FROM members WHERE membership_status = 'active'",
        'SELECT COUNT(*) as total_tournaments FROM tournaments',
        'SELECT COUNT(*) as total_administrators FROM club_administrators'
    ];
    
    const results = await Promise.all(
        queries.map(query => executeQuery(query))
    );
    
    return {
        total_clubs: results[0].rows[0].total_clubs,
        total_members: results[1].rows[0].total_members,
        total_tournaments: results[2].rows[0].total_tournaments,
        total_administrators: results[3].rows[0].total_administrators
    };
}

/**
 * Get recent activity
 */
async function getRecentActivity(limit = 10) {
    const query = `
        SELECT 
            al.*,
            c.club_name,
            ca.full_name as user_name
        FROM activity_logs al
        LEFT JOIN clubs c ON al.course_id = c.club_id
        LEFT JOIN club_administrators ca ON al.user_id = ca.admin_id
        ORDER BY al.created_at DESC
        LIMIT ?
    `;
    
    try {
        const { rows } = await executeQuery(query, [limit]);
        return rows || [];
    } catch (error) {
        console.error('Error en getRecentActivity:', error);
        return []; // Retornar array vacío si hay error
    }
}

/**
 * Log activity
 */
async function logActivity(courseId, userId, userType, action, entityType, entityId, details = null, ipAddress = null, userAgent = null) {
    const query = `
        INSERT INTO activity_logs (
            course_id, user_id, user_type, action, entity_type, entity_id,
            details, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert undefined to null to avoid SQL errors
    const params = [
        courseId || null,
        userId || null,
        userType || null,
        action || null,
        entityType || null,
        entityId || null,
        details && typeof details === 'object' ? JSON.stringify(details) : (details || null),
        ipAddress || null,
        userAgent || null
    ];
    
    const { rows } = await executeQuery(query, params);
    return rows.insertId;
}

// ================================
// MEMBERS FUNCTIONS
// ================================

/**
 * Get all members for a club
 */
async function getAllMembers(courseId) {
    const query = `
        SELECT * FROM members 
        WHERE course_id = ? 
        ORDER BY last_name, first_name
    `;
    const { rows } = await executeQuery(query, [courseId]);
    
    // DEBUG: Ver qué devuelve la consulta
    console.log('🔍 DEBUG getAllMembers - Total rows:', rows.length);
    if (rows.length > 0) {
        console.log('🔍 DEBUG Sample member (first):', {
            member_id: rows[0].member_id,
            name: rows[0].first_name + ' ' + rows[0].last_name,
            gender: rows[0].gender,
            updated_at: rows[0].updated_at
        });
    }
    
    return rows;
}

/**
 * Get member by ID
 */
async function getMemberById(memberId) {
    const query = `SELECT * FROM members WHERE member_id = ?`;
    const { rows } = await executeQuery(query, [memberId]);
    return rows[0];
}

/**
 * Get member by phone number
 */
async function getMemberByPhone(phone, courseId) {
    const query = `
        SELECT * FROM members 
        WHERE phone = ? AND course_id = ?
    `;
    const { rows } = await executeQuery(query, [phone, courseId]);
    return rows[0];
}

/**
 * Verify member phone for public financial report / inscription
 * Acepta varios formatos: solo dígitos, con/sin espacios, con/sin código de país (ej. 54 9 11...)
 */
async function verifyMemberPhone(clubId, phone) {
    console.log('🔍 verifyMemberPhone - clubId:', clubId, 'phone:', phone);
    
    const digitsOnly = (str) => (str || '').replace(/\D/g, '');
    const normalizedInput = digitsOnly(phone);
    if (!normalizedInput.length) {
        return { success: false, message: 'Ingresá un número de teléfono válido' };
    }
    console.log('📞 Dígitos ingresados:', normalizedInput);
    
    const query = `
        SELECT member_id, first_name, last_name, phone, membership_status
        FROM members 
        WHERE course_id = ? AND membership_status = 'active'
    `;
    const { rows } = await executeQuery(query, [clubId]);
    
    for (const member of rows) {
        const dbDigits = digitsOnly(member.phone);
        if (!dbDigits.length) continue;
        const match = dbDigits === normalizedInput
            || dbDigits.endsWith(normalizedInput)
            || normalizedInput.endsWith(dbDigits);
        if (match) {
            console.log('✅ Member found:', member.first_name, member.last_name);
            const secret = 'torneogolf2024secret';
            const tokenData = `${member.phone}-${member.member_id}-${secret}`;
            const token = crypto.createHash('sha256').update(tokenData).digest('hex');
            return {
                success: true,
                token,
                memberName: `${member.first_name} ${member.last_name}`
            };
        }
    }
    
    console.log('❌ No member found with that phone');
    return {
        success: false,
        message: 'Teléfono no encontrado o socio inactivo. Revisá que el número esté cargado en el club y que seas socio activo.'
    };
}

/**
 * Verificar socio por número de matrícula (inscripción pública).
 * Devuelve el mismo formato que verifyMemberPhone para reutilizar token en el flujo.
 */
async function verifyMemberByMatricula(clubId, memberNumber) {
    const normalized = (memberNumber || '').toString().trim().replace(/\s/g, '');
    if (!normalized.length) {
        return { success: false, message: 'Ingresá un número de matrícula.' };
    }
    const query = `
        SELECT member_id, first_name, last_name, phone, membership_status
        FROM members
        WHERE course_id = ? AND membership_status = 'active'
        AND (member_number = ? OR REPLACE(TRIM(COALESCE(member_number, '')), ' ', '') = ?)
    `;
    const { rows } = await executeQuery(query, [clubId, normalized, normalized]);
    if (rows.length === 0) {
        return {
            success: false,
            message: 'Matrícula no encontrada o socio inactivo. Revisá el número o contactá al club.'
        };
    }
    const member = rows[0];
    const secret = 'torneogolf2024secret';
    const tokenData = `${member.phone || ''}-${member.member_id}-${secret}`;
    const token = crypto.createHash('sha256').update(tokenData).digest('hex');
    return {
        success: true,
        token,
        memberName: `${member.first_name} ${member.last_name}`
    };
}

/**
 * Verify access token for public financial report
 */
async function verifyReportToken(clubId, token) {
    // Try to find a member whose token matches
    const query = `
        SELECT 
            member_id,
            first_name,
            last_name,
            phone
        FROM members 
        WHERE course_id = ? 
        AND membership_status = 'active'
    `;
    const { rows } = await executeQuery(query, [clubId]);
    
    const secret = 'torneogolf2024secret';
    for (const member of rows) {
        const tokenData = `${member.phone}-${member.member_id}-${secret}`;
        const expectedToken = crypto.createHash('sha256').update(tokenData).digest('hex');
        
        if (expectedToken === token) {
            return {
                success: true,
                member_id: member.member_id,
                memberName: `${member.first_name} ${member.last_name}`
            };
        }
    }
    
    return {
        success: false,
        message: 'Token inválido o expirado'
    };
}

/**
 * Inscripción pública: datos del torneo para mostrar (nombre, fecha).
 * Si el torneo tiene fecha límite de inscripción (registration_deadline), la web queda inhabilitada después de esa fecha/hora.
 */
async function getTournamentForPublicInscription(clubId, tournamentId) {
    const baseWhere = `WHERE t.course_id = ? AND t.tournament_id = ? AND t.status IN ('draft', 'open')
          AND t.public_inscription = 1
          AND (t.registration_deadline IS NULL OR NOW() <= t.registration_deadline)`;
    const query = `
        SELECT t.tournament_id, t.tournament_name, t.tournament_date, t.registration_deadline, t.max_participants,
               COALESCE(t.public_inscription_allow_groups, 1) AS public_inscription_allow_groups,
               t.flyer_url,
               COALESCE(t.groups_by_hcp, 0) AS groups_by_hcp
        FROM tournaments t
        ${baseWhere}`;
    let row;
    try {
        const { rows } = await executeQuery(query, [clubId, tournamentId]);
        row = rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            const fallback = `
                SELECT t.tournament_id, t.tournament_name, t.tournament_date, t.registration_deadline, t.max_participants,
                       COALESCE(t.public_inscription_allow_groups, 1) AS public_inscription_allow_groups,
                       t.flyer_url
                FROM tournaments t
                ${baseWhere}`;
            const { rows } = await executeQuery(fallback, [clubId, tournamentId]);
            row = rows[0] || null;
            if (row) row.groups_by_hcp = 0;
        } else throw e;
    }
    if (row) {
        row.public_inscription_allow_groups = row.public_inscription_allow_groups ?? 1;
        row.flyer_url = row.flyer_url ?? null;
        row.groups_by_hcp = row.groups_by_hcp ?? 0;
    }
    return row;
}

/**
 * Mismo torneo para inscripción pública pero sin filtrar por fecha límite (para distinguir "no encontrado" de "inscripciones cerradas").
 */
async function getTournamentForPublicInscriptionUnfiltered(clubId, tournamentId) {
    const baseWhere = `WHERE t.course_id = ? AND t.tournament_id = ? AND t.status IN ('draft', 'open') AND t.public_inscription = 1`;
    const query = `
        SELECT t.tournament_id, t.tournament_name, t.tournament_date, t.registration_deadline, t.max_participants,
               COALESCE(t.public_inscription_allow_groups, 1) AS public_inscription_allow_groups,
               t.flyer_url,
               COALESCE(t.groups_by_hcp, 0) AS groups_by_hcp
        FROM tournaments t
        ${baseWhere}`;
    let row;
    try {
        const { rows } = await executeQuery(query, [clubId, tournamentId]);
        row = rows[0] || null;
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            const fallback = `
                SELECT t.tournament_id, t.tournament_name, t.tournament_date, t.registration_deadline, t.max_participants,
                       COALESCE(t.public_inscription_allow_groups, 1) AS public_inscription_allow_groups,
                       t.flyer_url
                FROM tournaments t
                ${baseWhere}`;
            const { rows } = await executeQuery(fallback, [clubId, tournamentId]);
            row = rows[0] || null;
            if (row) row.groups_by_hcp = 0;
        } else throw e;
    }
    if (row) {
        row.public_inscription_allow_groups = row.public_inscription_allow_groups ?? 1;
        row.flyer_url = row.flyer_url ?? null;
        row.groups_by_hcp = row.groups_by_hcp ?? 0;
    }
    return row;
}

/**
 * Inscripción pública: grupos del torneo con menos de 4 jugadores (para unirse)
 * Cuenta todos los participantes (socios y externos) por grupo.
 */
async function getTournamentGroupsForInscription(tournamentId) {
    const query = `
        SELECT tp.group_number,
               COUNT(*) as count,
               GROUP_CONCAT(
                   COALESCE(
                       TRIM(CONCAT(m.first_name, ' ', m.last_name)),
                       tp.player_name,
                       'Jugador'
                   ) ORDER BY tp.participation_id
               ) as player_names
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.member_id IS NOT NULL
        WHERE tp.tournament_id = ? AND tp.group_number IS NOT NULL
        GROUP BY tp.group_number
        HAVING count < 4
        ORDER BY tp.group_number
    `;
    const { rows } = await executeQuery(query, [tournamentId]);
    return rows;
}

/**
 * Lista inscriptos al torneo que aún no tienen grupo (para que quien crea grupo pueda sumarlos).
 * Excluye al memberId indicado (el que está creando el grupo).
 */
async function getTournamentParticipantsWithoutGroup(tournamentId, excludeMemberId) {
    const query = `
        SELECT tp.participation_id,
               COALESCE(
                   TRIM(CONCAT(m.first_name, ' ', m.last_name)),
                   tp.player_name,
                   'Jugador'
               ) as player_name
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.member_id IS NOT NULL
        WHERE tp.tournament_id = ? AND (tp.group_number IS NULL OR tp.group_number = 0)
          AND (tp.member_id IS NULL OR tp.member_id != ?)
        ORDER BY player_name
    `;
    const { rows } = await executeQuery(query, [tournamentId, excludeMemberId || 0]);
    return rows;
}

/**
 * Inscripción pública: inscribir socio (por teléfono/token). Opcional: crear grupo, unirse a grupo, preferencia mañana/tarde.
 */
async function addPublicInscription(clubId, tournamentId, memberId, options = {}) {
    const { groupNumber, createGroup, teeTimePreference, addToGroup } = options;
    const clubIdNum = parseInt(clubId);
    const tournamentIdNum = parseInt(tournamentId);

    const tournament = await getTournamentForPublicInscription(clubIdNum, tournamentIdNum);
    if (!tournament) {
        const unfiltered = await getTournamentForPublicInscriptionUnfiltered(clubIdNum, tournamentIdNum);
        if (unfiltered) {
            const err = new Error('El plazo de inscripción ha finalizado');
            err.statusCode = 403;
            throw err;
        }
        throw new Error('Torneo no encontrado o no admite inscripciones');
    }

    const dupCheck = await executeQuery(
        'SELECT participation_id FROM tournament_participants WHERE tournament_id = ? AND member_id = ? LIMIT 1',
        [tournamentIdNum, memberId]
    );
    if (dupCheck.rows && dupCheck.rows.length > 0) {
        throw new Error('Ya estás inscripto en este torneo');
    }

    let finalGroupNumber = null;
    if (createGroup) {
        const maxGroup = await executeQuery(
            'SELECT COALESCE(MAX(group_number), 0) as mx FROM tournament_participants WHERE tournament_id = ?',
            [tournamentIdNum]
        );
        finalGroupNumber = (maxGroup.rows[0]?.mx || 0) + 1;
    } else if (groupNumber != null) {
        const groupCount = await executeQuery(
            'SELECT COUNT(*) as c FROM tournament_participants WHERE tournament_id = ? AND group_number = ?',
            [tournamentIdNum, groupNumber]
        );
        if ((groupCount.rows[0]?.c || 0) >= 4) {
            throw new Error('Ese grupo ya está completo');
        }
        finalGroupNumber = parseInt(groupNumber);
    }

    // Si se une a un grupo existente, usar el turno del grupo; si no, el que eligió
    let teeToUse = teeTimePreference && (teeTimePreference === 'morning' || teeTimePreference === 'afternoon') ? teeTimePreference : null;
    if (groupNumber != null && finalGroupNumber != null) {
        const groupTee = await executeQuery(
            'SELECT tee_time_preference FROM tournament_participants WHERE tournament_id = ? AND group_number = ? AND tee_time_preference IS NOT NULL LIMIT 1',
            [tournamentIdNum, finalGroupNumber]
        );
        if (groupTee.rows && groupTee.rows[0] && groupTee.rows[0].tee_time_preference) {
            teeToUse = groupTee.rows[0].tee_time_preference;
        }
    }

    const memberHandicapQuery = `SELECT handicap_local, handicap_index FROM members WHERE member_id = ? AND course_id = ?`;
    const { rows: memberData } = await executeQuery(memberHandicapQuery, [memberId, clubIdNum]);
    const currentHandicap = memberData.length > 0 ? (memberData[0].handicap_local || memberData[0].handicap_index) : null;

    // Al unirse a un grupo existente, usar el mismo tee_time y starting_hole que el grupo (para quedar en la misma tarjeta)
    let groupTeeTime = null;
    let groupStartingHole = null;
    if (finalGroupNumber != null && groupNumber != null) {
        const existingGroup = await executeQuery(
            `SELECT tee_time, starting_hole FROM tournament_participants
             WHERE tournament_id = ? AND group_number = ? AND (tee_time IS NOT NULL OR starting_hole IS NOT NULL)
             ORDER BY participation_id ASC LIMIT 1`,
            [tournamentIdNum, finalGroupNumber]
        );
        if (existingGroup.rows && existingGroup.rows[0]) {
            groupTeeTime = existingGroup.rows[0].tee_time;
            groupStartingHole = existingGroup.rows[0].starting_hole;
        }
    }

    const insertQuery = `
        INSERT INTO tournament_participants (
            tournament_id, member_id, handicap_used, player_type, status, payment_status,
            group_number, tee_time_preference, tee_time, starting_hole
        ) VALUES (?, ?, ?, 'member', 'registered', 'pending', ?, ?, ?, ?)
    `;
    await executeQuery(insertQuery, [
        tournamentIdNum,
        memberId,
        currentHandicap,
        finalGroupNumber,
        teeToUse,
        groupTeeTime,
        groupStartingHole
    ]);

    // Si creó grupo y eligió inscriptos para sumar, asignarlos al nuevo grupo (máx 3 para no superar 4)
    if (createGroup && finalGroupNumber != null && Array.isArray(addToGroup) && addToGroup.length > 0) {
        const ids = addToGroup.slice(0, 3).map(id => parseInt(id)).filter(id => !isNaN(id));
        for (const participationId of ids) {
            await executeQuery(
                'UPDATE tournament_participants SET group_number = ? WHERE participation_id = ? AND tournament_id = ? AND (group_number IS NULL OR group_number = 0)',
                [finalGroupNumber, participationId, tournamentIdNum]
            );
        }
    }

    // Si se inscribió eligiendo/unirse a un grupo, marcar torneo como "por grupos" (inscripción) para que Gestión de Tee Times muestre el tipo correcto
    if (groupNumber != null || (createGroup && finalGroupNumber != null)) {
        try {
            await executeQuery(
                'UPDATE tournaments SET groups_by_hcp = 0, updated_at = CURRENT_TIMESTAMP WHERE course_id = ? AND tournament_id = ?',
                [clubId, tournamentIdNum]
            );
        } catch (e) { /* columna puede no existir en instalaciones antiguas */ }
    }

    return { success: true, group_number: finalGroupNumber };
}

/**
 * Comprueba si el socio ya está inscripto en el torneo (para mostrar "Ya estás inscripto" al recargar).
 */
async function checkPublicInscriptionStatus(clubId, tournamentId, memberId) {
    const tournamentIdNum = parseInt(tournamentId);
    const { rows } = await executeQuery(
        'SELECT participation_id FROM tournament_participants WHERE tournament_id = ? AND member_id = ? LIMIT 1',
        [tournamentIdNum, memberId]
    );
    return { alreadyInscribed: rows && rows.length > 0 };
}

/**
 * Create new member
 */
async function createMember(memberData) {
    // Construir query dinámicamente solo con campos que están presentes
    const fields = [];
    const placeholders = [];
    const params = [];
    
    // Campos obligatorios (siempre incluir)
    fields.push('course_id');
    placeholders.push('?');
    params.push(memberData.course_id || 1);
    
    fields.push('first_name');
    placeholders.push('?');
    params.push(memberData.first_name || '');
    
    fields.push('last_name');
    placeholders.push('?');
    params.push(memberData.last_name || '');
    
    // El campo phone es obligatorio en la BD, siempre incluir
    fields.push('phone');
    placeholders.push('?');
    params.push(memberData.phone || '');
    
    // Campos opcionales solo si están presentes y no son null/undefined/''
    if (memberData.member_number !== undefined && memberData.member_number !== null && memberData.member_number !== '') {
        fields.push('member_number');
        placeholders.push('?');
        params.push(memberData.member_number);
    }
    
    if (memberData.email !== undefined && memberData.email !== null && memberData.email !== '') {
        fields.push('email');
        placeholders.push('?');
        params.push(memberData.email);
    }
    

    
    if (memberData.handicap_index !== undefined && memberData.handicap_index !== null) {
        fields.push('handicap_index');
        placeholders.push('?');
        params.push(memberData.handicap_index);
    }
    
    if (memberData.handicap_local !== undefined && memberData.handicap_local !== null) {
        fields.push('handicap_local');
        placeholders.push('?');
        params.push(memberData.handicap_local);
    }
    
    if (memberData.membership_type !== undefined && memberData.membership_type !== '') {
        fields.push('membership_type');
        placeholders.push('?');
        params.push(memberData.membership_type);
    }
    
    if (memberData.membership_status !== undefined && memberData.membership_status !== '') {
        fields.push('membership_status');
        placeholders.push('?');
        params.push(memberData.membership_status);
    }
    
    const query = `
        INSERT INTO members (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
    `;
    
    console.log('🎯 Dynamic INSERT query:', query);
    console.log('🎯 Dynamic params:', params);
    
    const { rows } = await executeQuery(query, params);
    return { member_id: rows.insertId, ...memberData };
}

/**
 * Update member
 */
async function updateMember(memberId, memberData) {
    // Build dynamic update query based on provided fields
    const updateFields = [];
    const params = [];
    
    console.log('🔍 updateMember called with:', { memberId, memberData });
    
    // Only update fields that are provided (not undefined)
    if (memberData.member_number !== undefined) {
        updateFields.push('member_number = ?');
        params.push(memberData.member_number);
    }
    if (memberData.first_name !== undefined) {
        updateFields.push('first_name = ?');
        params.push(memberData.first_name);
    }
    if (memberData.last_name !== undefined) {
        updateFields.push('last_name = ?');
        params.push(memberData.last_name);
    }
    if (memberData.email !== undefined) {
        updateFields.push('email = ?');
        params.push(memberData.email);
    }
    if (memberData.phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(memberData.phone);
    }
    if (memberData.handicap_local !== undefined) {
        updateFields.push('handicap_local = ?');
        params.push(memberData.handicap_local);
    }
    if (memberData.handicap_index !== undefined) {
        updateFields.push('handicap_index = ?');
        params.push(memberData.handicap_index);
    }
    if (memberData.category !== undefined) {
        updateFields.push('category = ?');
        params.push(memberData.category);
    }
    if (memberData.membership_status !== undefined) {
        updateFields.push('membership_status = ?');
        params.push(memberData.membership_status);
    }
    // Backward-compatible alias: allow `status` field to map to membership_status
    if (memberData.status !== undefined) {
        updateFields.push('membership_status = ?');
        params.push(memberData.status);
    }
    if (memberData.photo_path !== undefined) {
        updateFields.push('photo_path = ?');
        params.push(memberData.photo_path);
    }
    if (memberData.gender !== undefined) {
        updateFields.push('gender = ?');
        params.push(memberData.gender);
    }
    if (memberData.birth_date !== undefined) {
        updateFields.push('birth_date = ?');
        params.push(memberData.birth_date);
    }
    if (memberData.emergency_contact !== undefined) {
        updateFields.push('emergency_contact = ?');
        params.push(memberData.emergency_contact);
    }
    if (memberData.emergency_phone !== undefined) {
        updateFields.push('emergency_phone = ?');
        params.push(memberData.emergency_phone);
    }
    if (memberData.notes !== undefined) {
        updateFields.push('notes = ?');
        params.push(memberData.notes);
    }
    
    console.log('🔍 updateFields found:', updateFields);
    console.log('🔍 params:', params);
    
    if (updateFields.length === 0) {
        console.log('❌ No fields to update - all fields were undefined or null');
        throw new Error('No fields to update');
    }
    
    const query = `UPDATE members SET ${updateFields.join(', ')} WHERE member_id = ?`;
    params.push(memberId);
    
    await executeQuery(query, params);

    // Si se actualizó index o HCP del socio, propagar solo a torneos que aún no se cerraron/jugaron
    // No tocar torneos completed/closed/cancelled para mantener el histórico
    const didUpdateHandicap = memberData.handicap_local !== undefined || memberData.handicap_index !== undefined;
    if (didUpdateHandicap) {
        const newHcpUsed = memberData.handicap_local !== undefined && memberData.handicap_local !== null
            ? Number(memberData.handicap_local)
            : (memberData.handicap_index !== undefined && memberData.handicap_index !== null
                ? Math.round(Number(memberData.handicap_index))
                : null);
        if (newHcpUsed !== null && !Number.isNaN(newHcpUsed)) {
            await executeQuery(
                `UPDATE tournament_participants tp
                 INNER JOIN tournaments t ON t.tournament_id = tp.tournament_id
                 SET tp.handicap_used = ?
                 WHERE tp.member_id = ? AND t.status IN ('draft', 'open', 'in_progress')`,
                [newHcpUsed, memberId]
            );
        }
    }

    return { member_id: memberId, ...memberData };
}

/**
 * Delete member
 */
async function deleteMember(memberId) {
    const query = `DELETE FROM members WHERE member_id = ?`;
    const { rows } = await executeQuery(query, [memberId]);
    return true;
}

/**
 * Clear all members from a club
 */
async function clearClubMembers(courseId) {
    const query = `DELETE FROM members WHERE course_id = ?`;
    const { rows } = await executeQuery(query, [courseId]);
    // Para DELETE queries, rows contiene información sobre la operación
    // rows.affectedRows contiene el número de filas eliminadas
    return rows.affectedRows || 0;
}

/**
 * Update member status
 */
async function updateMemberStatus(memberId, status) {
    const query = `UPDATE members SET membership_status = ? WHERE member_id = ?`;
    const { rows } = await executeQuery(query, [status, memberId]);
    return true;
}

/**
 * Search members
 */
async function searchMembers(courseId, searchTerm) {
    const query = `
        SELECT * FROM members 
        WHERE course_id = ? 
        AND (
            CONCAT(first_name, ' ', last_name) LIKE ? 
            OR member_number LIKE ?
            OR phone LIKE ?
            OR email LIKE ?
        )
        ORDER BY last_name, first_name
    `;
    const searchPattern = `%${searchTerm}%`;
    const { rows } = await executeQuery(query, [
        courseId, 
        searchPattern, 
        searchPattern, 
        searchPattern, 
        searchPattern
    ]);
    return rows;
}

// ============================================
// TOURNAMENT FUNCTIONS
// ============================================

async function getAllTournaments(courseId) {
    const query = `
        SELECT t.*, 
               gc.club_name AS course_name,
               COALESCE(COUNT(DISTINCT tp.participation_id), 0) as current_participants,
               COALESCE(COUNT(DISTINCT CASE WHEN tp.payment_status = 'paid' THEN tp.participation_id END), 0) as paid_participants_count,
               COALESCE(COUNT(DISTINCT CASE WHEN tpg.group_number IS NOT NULL THEN tpg.group_number END), 0) as configured_groups,
               COALESCE(COUNT(DISTINCT CASE WHEN tpg.tee_time IS NOT NULL THEN tpg.group_number END), 0) as groups_with_tee_times,
               CASE 
                   WHEN COUNT(DISTINCT CASE WHEN tpg.group_number IS NOT NULL THEN tpg.group_number END) > 0 
                        AND COUNT(DISTINCT CASE WHEN tpg.tee_time IS NOT NULL THEN tpg.group_number END) > 0 
                   THEN 'configured'
                   WHEN COUNT(DISTINCT CASE WHEN tpg.group_number IS NOT NULL THEN tpg.group_number END) > 0 
                   THEN 'groups_only'
                   ELSE 'not_configured'
               END as tee_time_status
        FROM tournaments t
        LEFT JOIN clubs gc ON t.course_id = gc.club_id
        LEFT JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id 
                                             AND tp.status IN ('registered', 'confirmed')
        LEFT JOIN tournament_participants tpg ON t.tournament_id = tpg.tournament_id 
                                              AND tpg.group_number IS NOT NULL
        WHERE t.course_id = ?
        GROUP BY t.tournament_id
        ORDER BY t.tournament_date DESC, t.created_at DESC
    `;
    const { rows } = await executeQuery(query, [courseId]);
    return rows;
}

async function getTournamentById(courseId, tournamentId) {
    const query = `
        SELECT t.*, 
               gc.club_name AS course_name,
               COALESCE(COUNT(tp.participation_id), 0) as current_participants
        FROM tournaments t
        LEFT JOIN clubs gc ON t.course_id = gc.club_id
        LEFT JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id 
                                             AND tp.status IN ('registered', 'confirmed')
        WHERE t.course_id = ? AND t.tournament_id = ?
        GROUP BY t.tournament_id
    `;
    const { rows } = await executeQuery(query, [courseId, tournamentId]);
    return rows[0] || null;
}

async function createTournament(courseId, tournamentData) {
    const query = `
        INSERT INTO tournaments (
            course_id, tournament_name, tournament_date, start_time, end_time,
            tournament_type, max_participants, registration_deadline, entry_fee,
            custodian, prize_pool, description, rules, status, public_inscription, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `;
    const params = [
        courseId,
        tournamentData.tournament_name,
        tournamentData.tournament_date,
        tournamentData.start_time || null,
        tournamentData.end_time || null,
        tournamentData.tournament_type,
        tournamentData.max_participants || null,
        tournamentData.registration_deadline || null,
        tournamentData.entry_fee || 0,
        tournamentData.custodian || null,
        tournamentData.prize_pool || 0,
        tournamentData.description || null,
        tournamentData.rules || null,
        tournamentData.public_inscription ? 1 : 0,
        tournamentData.created_by || null
    ];
    const { rows } = await executeQuery(query, params);
    const newId = rows.insertId;

    // Persistir configuración de salidas, allow_groups y flyer_url si se envió (columnas opcionales)
    try {
        const sim = (tournamentData.enable_simultaneous_starts === true || tournamentData.enable_simultaneous_starts === 1) ? 1 : 0;
        const two = (tournamentData.enable_two_sessions === true || tournamentData.enable_two_sessions === 1) ? 1 : 0;
        const allowGroups = (tournamentData.public_inscription_allow_groups !== false && tournamentData.public_inscription_allow_groups !== 0) ? 1 : 0;
        const flyerUrl = (tournamentData.flyer_url && String(tournamentData.flyer_url).trim()) || null;
        await executeQuery(
            `UPDATE tournaments SET
                enable_simultaneous_starts = ?, afternoon_start_time = ?, preferred_session = ?, tee_interval_minutes = ?, enable_two_sessions = ?,
                public_inscription_allow_groups = ?, flyer_url = ?
                WHERE tournament_id = ? AND course_id = ?`,
            [
                sim,
                tournamentData.afternoon_start_time || '14:00',
                (tournamentData.preferred_session === 'afternoon') ? 'afternoon' : 'morning',
                tournamentData.tee_interval_minutes != null ? Number(tournamentData.tee_interval_minutes) : 10,
                two,
                allowGroups,
                flyerUrl,
                newId,
                courseId
            ]
        );
    } catch (e) {
        if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    }

    // Log activity
    try {
        await logActivity(
            courseId,                           // courseId
            tournamentData.created_by || null, // userId  
            'club_admin',                       // userType
            'tournament_created',               // action
            'tournament',                       // entityType
            rows.insertId,                      // entityId
            `Torneo "${tournamentData.tournament_name}" creado`, // details
            null,                               // ipAddress
            null                                // userAgent
        );
    } catch (logError) {
        console.warn('Error logging activity:', logError);
    }
    
    return { tournament_id: newId, ...tournamentData, course_id: courseId };
}

async function updateTournament(courseId, tournamentId, tournamentData) {
    const whereParams = [courseId, tournamentId];

    // Actualización solo de groups_by_hcp cuando el body trae únicamente ese campo (sin reorganizar)
    const payloadKeys = Object.keys(tournamentData).filter(k => tournamentData[k] !== undefined);
    if (payloadKeys.length === 1 && payloadKeys[0] === 'groups_by_hcp') {
        const val = (tournamentData.groups_by_hcp === true || tournamentData.groups_by_hcp === 1) ? 1 : 0;
        try {
            await executeQuery(
                'UPDATE tournaments SET groups_by_hcp = ?, updated_at = CURRENT_TIMESTAMP WHERE course_id = ? AND tournament_id = ?',
                [val, courseId, tournamentId]
            );
            return await getTournamentById(courseId, tournamentId);
        } catch (e) {
            if (e.code === 'ER_BAD_FIELD_ERROR') { /* columna no existe, seguir con update completo */ }
            else throw e;
        }
    }

    // Parámetros que suelen existir en todas las instalaciones
    const minimalParams = [
        tournamentData.tournament_name,
        tournamentData.tournament_date,
        tournamentData.start_time || null,
        tournamentData.end_time || null,
        tournamentData.tournament_type,
        tournamentData.max_participants || null,
        tournamentData.registration_deadline || null,
        tournamentData.entry_fee || 0,
        tournamentData.prize_pool || 0,
        tournamentData.description || null,
        tournamentData.rules || null
    ];

    const runUpdate = async (sql, params) => {
        const { rows } = await executeQuery(sql, params);
        if (rows.affectedRows > 0) {
            try {
                await logActivity(courseId, null, 'club_admin', 'tournament_updated', 'tournament', tournamentId, 'Torneo actualizado', null, null);
            } catch (e) {}
            return await getTournamentById(courseId, tournamentId);
        }
        return null;
    };

    // Intentar UPDATE completo (+ results_mode, tee config: enable_simultaneous_starts, afternoon_start_time, preferred_session, tee_interval_minutes, enable_two_sessions)
    const resultsMode = (tournamentData.results_mode === 'scratch_bands') ? 'scratch_bands' : 'standard';
    const teeSimultaneous = (tournamentData.enable_simultaneous_starts === true || tournamentData.enable_simultaneous_starts === 1) ? 1 : 0;
    const teeTwoSessions = (tournamentData.enable_two_sessions === true || tournamentData.enable_two_sessions === 1) ? 1 : 0;
    const allowGroups = (tournamentData.public_inscription_allow_groups !== false && tournamentData.public_inscription_allow_groups !== 0) ? 1 : 0;
    const flyerUrl = (tournamentData.flyer_url && String(tournamentData.flyer_url).trim()) || null;
    const fullParams = [
        ...minimalParams.slice(0, 8),
        tournamentData.custodian || null,
        tournamentData.account_id || null,
        ...minimalParams.slice(8),
        (tournamentData.public_inscription === true || tournamentData.public_inscription === 1) ? 1 : 0,
        allowGroups,
        flyerUrl,
        resultsMode,
        (tournamentData.separate_ladies === true || tournamentData.separate_ladies === 1) ? 1 : 0,
        (tournamentData.ladies_by_hcp === true || tournamentData.ladies_by_hcp === 1) ? 1 : 0,
        (tournamentData.is_ranking_event === true || tournamentData.is_ranking_event === 1) ? 1 : 0,
        teeSimultaneous,
        tournamentData.afternoon_start_time || '14:00',
        (tournamentData.preferred_session === 'afternoon') ? 'afternoon' : 'morning',
        tournamentData.tee_interval_minutes != null ? Number(tournamentData.tee_interval_minutes) : 10,
        teeTwoSessions,
        ...whereParams
    ];
    const fullQuery = `
        UPDATE tournaments SET
            tournament_name = ?, tournament_date = ?, start_time = ?, end_time = ?,
            tournament_type = ?, max_participants = ?, registration_deadline = ?,
            entry_fee = ?, custodian = ?, account_id = ?, prize_pool = ?, description = ?, rules = ?,
            public_inscription = ?, public_inscription_allow_groups = ?, flyer_url = ?, results_mode = ?, separate_ladies = ?, ladies_by_hcp = ?, is_ranking_event = ?,
            enable_simultaneous_starts = ?, afternoon_start_time = ?, preferred_session = ?, tee_interval_minutes = ?, enable_two_sessions = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ? AND tournament_id = ?
    `;

    try {
        const result = await runUpdate(fullQuery, fullParams);
        if (result !== null) return result;
    } catch (err) {
        if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
        // Reintentar CON results_mode y tee config pero SIN custodian/account_id
        try {
            const withResultsModeParams = [
                ...minimalParams,
                (tournamentData.public_inscription === true || tournamentData.public_inscription === 1) ? 1 : 0,
                allowGroups,
                flyerUrl,
                resultsMode,
                (tournamentData.separate_ladies === true || tournamentData.separate_ladies === 1) ? 1 : 0,
                (tournamentData.ladies_by_hcp === true || tournamentData.ladies_by_hcp === 1) ? 1 : 0,
                (tournamentData.is_ranking_event === true || tournamentData.is_ranking_event === 1) ? 1 : 0,
                teeSimultaneous,
                tournamentData.afternoon_start_time || '14:00',
                (tournamentData.preferred_session === 'afternoon') ? 'afternoon' : 'morning',
                tournamentData.tee_interval_minutes != null ? Number(tournamentData.tee_interval_minutes) : 10,
                teeTwoSessions,
                ...whereParams
            ];
            const withResultsModeQuery = `
                UPDATE tournaments SET
                    tournament_name = ?, tournament_date = ?, start_time = ?, end_time = ?,
                    tournament_type = ?, max_participants = ?, registration_deadline = ?,
                    entry_fee = ?, prize_pool = ?, description = ?, rules = ?,
                    public_inscription = ?, public_inscription_allow_groups = ?, flyer_url = ?, results_mode = ?, separate_ladies = ?, ladies_by_hcp = ?, is_ranking_event = ?,
                    enable_simultaneous_starts = ?, afternoon_start_time = ?, preferred_session = ?, tee_interval_minutes = ?, enable_two_sessions = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE course_id = ? AND tournament_id = ?
            `;
            const result = await runUpdate(withResultsModeQuery, withResultsModeParams);
            if (result !== null) return result;
        } catch (e) {
            if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
        }
        // Reintentar sin results_mode ni custodian/account_id
        try {
            const fallbackParams = [
                ...minimalParams,
                (tournamentData.public_inscription === true || tournamentData.public_inscription === 1) ? 1 : 0,
                ...whereParams
            ];
            const fallbackQuery = `
                UPDATE tournaments SET
                    tournament_name = ?, tournament_date = ?, start_time = ?, end_time = ?,
                    tournament_type = ?, max_participants = ?, registration_deadline = ?,
                    entry_fee = ?, prize_pool = ?, description = ?, rules = ?,
                    public_inscription = ?, updated_at = CURRENT_TIMESTAMP
                WHERE course_id = ? AND tournament_id = ?
            `;
            const result = await runUpdate(fallbackQuery, fallbackParams);
            if (result !== null) return result;
        } catch (e) {
            if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
        }
        const minimalQuery = `
            UPDATE tournaments SET
                tournament_name = ?, tournament_date = ?, start_time = ?, end_time = ?,
                tournament_type = ?, max_participants = ?, registration_deadline = ?,
                entry_fee = ?, prize_pool = ?, description = ?, rules = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE course_id = ? AND tournament_id = ?
        `;
        const result = await runUpdate(minimalQuery, [...minimalParams, ...whereParams]);
        if (result !== null) return result;
        throw err;
    }

    return null;
}

async function deleteTournament(courseId, tournamentId) {
    const query = `DELETE FROM tournaments WHERE course_id = ? AND tournament_id = ?`;
    const { rows } = await executeQuery(query, [courseId, tournamentId]);
    
    if (rows.affectedRows > 0) {
        await logActivity(courseId, null, null, 'tournament_deleted', 
                         'tournament', tournamentId, 'Torneo eliminado');
    }
    
    return rows.affectedRows > 0;
}

async function updateTournamentStatus(courseId, tournamentId, status) {
    const query = `
        UPDATE tournaments SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ? AND tournament_id = ?
    `;
    const { rows } = await executeQuery(query, [status, courseId, tournamentId]);
    
    if (rows.affectedRows > 0) {
        await logActivity(courseId, null, null, 'tournament_status_changed', 
                         'tournament', tournamentId, `Estado del torneo cambiado a ${status}`);
        return await getTournamentById(courseId, tournamentId);
    }
    return null;
}

async function getTournamentParticipants(courseId, tournamentId) {
    const query = `
        SELECT tp.*, 
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_name, ep.full_name)
                   ELSE 
                       CONCAT(m.first_name, ' ', m.last_name)
               END as player_name,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_email, ep.email)
                   ELSE 
                       m.email
               END as player_email,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_phone, ep.phone)
                   ELSE 
                       m.phone
               END as player_phone,
               CASE 
                   WHEN tp.player_type = 'external' THEN ep.handicap_index
                   ELSE m.handicap_index
               END as handicap_index,
               CASE 
                   WHEN tp.player_type = 'external' THEN ep.handicap_local
                   ELSE m.handicap_local
               END as handicap_local,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       ep.member_number
                   ELSE 
                       m.member_number
               END as member_number,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_club, ep.home_club)
                   ELSE 
                       gc.club_name
               END as player_club,
               tp.player_type,
               CASE WHEN tp.player_type = 'external' THEN ep.gender ELSE NULL END as gender,
               tp.tee_time_preference
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        LEFT JOIN clubs gc ON m.course_id = gc.club_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.registration_date DESC
    `;
    const { rows } = await executeQuery(query, [tournamentId]);
    return rows;
}

// Simple version that only needs tournament ID
async function getTournamentParticipantsById(tournamentId) {
    const query = `
        SELECT tp.*, 
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_name, ep.full_name)
                   ELSE 
                       CONCAT(m.first_name, ' ', m.last_name)
               END as player_name,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_email, ep.email)
                   ELSE 
                       m.email
               END as player_email,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_phone, ep.phone)
                   ELSE 
                       m.phone
               END as player_phone,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.handicap_used, ep.handicap_local, ep.handicap_index)
                   ELSE 
                       COALESCE(tp.handicap_used, m.handicap_local, m.handicap_index)
               END as handicap_index,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       ep.handicap_local
                   ELSE 
                       m.handicap_local
               END as handicap_local,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       ep.member_number
                   ELSE 
                       m.member_number
               END as member_number,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_club, ep.home_club)
                   ELSE 
                       gc.club_name
               END as player_club,
               tp.player_type
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        LEFT JOIN clubs gc ON m.course_id = gc.club_id
        WHERE tp.tournament_id = ?
        ORDER BY tp.registration_date DESC
    `;
    const { rows } = await executeQuery(query, [tournamentId]);
    return rows;
}

async function getTournamentStats(courseId, tournamentId) {
    const query = `
        SELECT 
            COUNT(*) as total_participants,
            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_participants,
            COUNT(CASE WHEN status = 'registered' THEN 1 END) as pending_participants,
            AVG(handicap_index) as average_handicap
        FROM tournament_participants 
        WHERE tournament_id = ?
    `;
    
    try {
        const { rows } = await executeQuery(query, [tournamentId]);
        const stats = rows[0] || {};
        
        return {
            total_participants: parseInt(stats.total_participants) || 0,
            confirmed_participants: parseInt(stats.confirmed_participants) || 0,
            pending_participants: parseInt(stats.pending_participants) || 0,
            total_revenue: 0, // Se calculará más adelante con entry_fee
            average_handicap: parseFloat(stats.average_handicap) || 0,
            total_groups: 0 // Se implementará con la tabla de grupos
        };
    } catch (error) {
        console.error('Error getting tournament stats:', error);
        return {
            total_participants: 0,
            confirmed_participants: 0,
            pending_participants: 0,
            total_revenue: 0,
            average_handicap: 0,
            total_groups: 0
        };
    }
}

async function searchPlayersForTournament(courseId, query) {
    if (!query || query.length < 2) {
        return [];
    }
    
    const searchTerm = `%${query}%`;
    
    // Buscar miembros de clubes en el sistema
    const membersQuery = `
        SELECT 
            m.member_id as player_id,
            CONCAT(m.first_name, ' ', m.last_name) as player_name,
            m.email as player_email,
            m.phone as player_phone,
            m.handicap_index,
            gc.club_name as player_club,
            CASE WHEN m.course_id = ? THEN 'member' ELSE 'visitor' END as player_type,
            m.course_id = ? as is_home_member
        FROM members m
        LEFT JOIN clubs gc ON m.course_id = gc.club_id
        WHERE (m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)
        AND m.membership_status = 'active'
        ORDER BY 
            CASE WHEN m.course_id = ? THEN 0 ELSE 1 END,
            m.first_name, m.last_name
        LIMIT 15
    `;
    
    // Buscar jugadores externos registrados previamente
    const externalQuery = `
        SELECT 
            NULL as player_id,
            ep.full_name as player_name,
            ep.email as player_email,
            ep.phone as player_phone,
            ep.handicap_index,
            ep.home_club as player_club,
            'external' as player_type,
            false as is_home_member
        FROM external_players ep
        WHERE (ep.full_name LIKE ? OR ep.email LIKE ? OR ep.phone LIKE ?)
        ORDER BY ep.full_name
        LIMIT 5
    `;
    
    try {
        const [membersResult, externalResult] = await Promise.all([
            executeQuery(membersQuery, [courseId, courseId, searchTerm, searchTerm, searchTerm, searchTerm, courseId]),
            executeQuery(externalQuery, [searchTerm, searchTerm, searchTerm])
        ]);
        
        return [...membersResult.rows, ...externalResult.rows];
    } catch (error) {
        console.error('Error searching players:', error);
        return [];
    }
}

// Bandas HCP para torneos scratch_bands: 1ra (-5 a 7.9), 2da (8 a 13.9), 3ra (14 a 21.9), 4ta (22 a 54)
function getBandFromHcp(hcp) {
    if (hcp == null || (typeof hcp !== 'number' && isNaN(Number(hcp)))) return 'noHcp';
    const n = Number(hcp);
    if (!Number.isFinite(n)) return 'noHcp';
    if (n <= 7.9) return 'band1';   // -5 a 7.9
    if (n <= 13.9) return 'band2';  // 8 a 13.9
    if (n <= 21.9) return 'band3';  // 14 a 21.9
    if (n <= 54) return 'band4';    // 22 a 54
    return 'noHcp';
}

// Placeholder functions for tournament groups and participants
async function addTournamentParticipant(courseId, tournamentId, participantData) {
    console.log('🎯 Adding participant:', {
        courseId, 
        tournamentId, 
        participantData
    });
    
    const tournament = await getTournamentById(courseId, tournamentId);
    const isByHcp = tournament && tournament.results_mode === 'scratch_bands';
    
    // Normalizar payload desde frontend
    try {
        if (participantData && participantData.is_member && !participantData.member_id && participantData.player_id) {
            participantData.member_id = participantData.player_id;
            participantData.player_type = 'member';
        }
        if (!participantData.player_type && participantData.member_id) {
            participantData.player_type = 'member';
        }
        if (!participantData.status) participantData.status = 'registered';
        if (!participantData.payment_status) participantData.payment_status = 'pending';
    } catch (_) {}
    
    // Determinar si es miembro del club o visitante de otro club
    const isVisitor = participantData.player_type === 'visitor' && participantData.player_id;
    const isExternalPlayer = participantData.player_type === 'external' && participantData.external_player_id;
    const isHomeMember = participantData.player_type === 'member' && participantData.member_id;
    
    // Evitar duplicados: mismo torneo + mismo miembro o mismo jugador externo
    try {
        if (participantData.member_id) {
            const dupCheck = await executeQuery(
                'SELECT participation_id FROM tournament_participants WHERE tournament_id = ? AND member_id = ? LIMIT 1',
                [tournamentId, participantData.member_id]
            );
            if (dupCheck.rows && dupCheck.rows.length > 0) {
                throw new Error('El jugador ya está agregado a este torneo');
            }
        }
        if (participantData.external_player_id) {
            const dupExt = await executeQuery(
                'SELECT participation_id FROM tournament_participants WHERE tournament_id = ? AND external_player_id = ? LIMIT 1',
                [tournamentId, participantData.external_player_id]
            );
            if (dupExt.rows && dupExt.rows.length > 0) {
                throw new Error('El jugador externo ya está agregado a este torneo');
            }
        }
    } catch (dupErr) {
        console.warn('⚠️ Duplicate participant check:', dupErr?.message || dupErr);
        throw dupErr;
    }

    // Máximo 4 jugadores por grupo: rechazar si el grupo elegido ya está lleno (solo cuando el torneo es "por grupos", no por HCP)
    const requestedGroup = !isByHcp && participantData.group_number != null && participantData.group_number > 0 ? participantData.group_number : null;
    if (requestedGroup != null) {
        const { rows: countRows } = await executeQuery(
            'SELECT COUNT(*) as c FROM tournament_participants WHERE tournament_id = ? AND group_number = ?',
            [tournamentId, requestedGroup]
        );
        const currentInGroup = (countRows && countRows[0] && countRows[0].c) ? Number(countRows[0].c) : 0;
        if (currentInGroup >= 4) {
            throw new Error(`El grupo ${requestedGroup} ya tiene 4 jugadores (máximo permitido). Elige otro grupo o deja "Sin grupo".`);
        }
    }

    let query, params;
    const groupForInsert = isByHcp ? null : requestedGroup;
    const teePreference = (participantData.preferred_session === 'afternoon' || participantData.preferred_session === 'morning') ? participantData.preferred_session : null;
    
    if (isVisitor) {
        // Para visitantes (socios de otros clubes) - obtener handicap del club original
        const memberHandicapQuery = `
            SELECT handicap_local, handicap_index 
            FROM members 
            WHERE member_id = ?
        `;
        const { rows: memberData } = await executeQuery(memberHandicapQuery, [participantData.player_id]);
        const currentHandicap = memberData.length > 0 ? (memberData[0].handicap_local || memberData[0].handicap_index) : null;
        
        console.log('🎯 Visitor handicap snapshot:', {
            member_id: participantData.player_id,
            handicap_local: memberData[0]?.handicap_local,
            handicap_index: memberData[0]?.handicap_index,
            using_handicap: currentHandicap
        });
        
        query = `
            INSERT INTO tournament_participants (
                tournament_id, member_id, handicap_used, player_type, status, payment_status, notes, group_number, tee_time_preference
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
            tournamentId,
            participantData.player_id,
            currentHandicap,
            'visitor',
            participantData.status || 'registered',
            participantData.payment_status || 'pending',
            participantData.notes || null,
            groupForInsert,
            teePreference
        ];
        
    } else if (isExternalPlayer) {
        // Para jugadores externos reales - obtener handicap_local actual
        let currentHandicap = null;
        const externalHandicapQuery = `
            SELECT handicap_local, handicap_index 
            FROM external_players 
            WHERE external_id = ?
        `;
        const { rows: externalData } = await executeQuery(externalHandicapQuery, [participantData.external_player_id]);
        currentHandicap = externalData.length > 0 ? (externalData[0].handicap_local || externalData[0].handicap_index) : null;
        
        console.log('🎯 External player handicap snapshot:', {
            external_id: participantData.external_player_id,
            handicap_local: externalData[0]?.handicap_local,
            handicap_index: externalData[0]?.handicap_index,
            using_handicap: currentHandicap
        });
        
        query = `
            INSERT INTO tournament_participants (
                tournament_id, external_player_id, player_name, player_email, player_phone,
                handicap_used, player_club, player_type, status, payment_status, notes, group_number, tee_time_preference
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
            tournamentId,
            participantData.external_player_id,
            participantData.player_name || participantData.full_name || null,
            participantData.player_email || participantData.email || null,
            participantData.player_phone || participantData.phone || null,
            currentHandicap,
            participantData.player_club || participantData.home_club || null,
            'external',
            participantData.status || 'registered',
            participantData.payment_status || 'pending',
            participantData.notes || null,
            groupForInsert,
            teePreference
        ];
        
    } else if (isHomeMember) {
        // Para miembros del club local - obtener handicap_local actual
        const memberHandicapQuery = `
            SELECT handicap_local, handicap_index 
            FROM members 
            WHERE member_id = ?
        `;
        const { rows: memberData } = await executeQuery(memberHandicapQuery, [participantData.member_id]);
        const currentHandicap = memberData.length > 0 ? (memberData[0].handicap_local || memberData[0].handicap_index) : null;
        
        console.log('🎯 Home member handicap snapshot:', {
            member_id: participantData.member_id,
            handicap_local: memberData[0]?.handicap_local,
            handicap_index: memberData[0]?.handicap_index,
            using_handicap: currentHandicap
        });
        
        query = `
            INSERT INTO tournament_participants (
                tournament_id, member_id, handicap_used, player_type, status, payment_status, notes, group_number, tee_time_preference
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
            tournamentId,
            participantData.member_id,
            currentHandicap,
            'member',
            participantData.status || 'registered',
            participantData.payment_status || 'pending',
            participantData.notes || null,
            groupForInsert,
            teePreference
        ];
        
    } else {
        throw new Error(`Tipo de participante no válido: ${JSON.stringify(participantData)}`);
    }
    
    console.log('🎯 Insert params:', params);
    
    const { rows } = await executeQuery(query, params);
    console.log('✅ Participant added successfully, insertId:', rows.insertId);

    // Auto-asignación a grupo desactivada: los grupos se gestionan solo desde Gestión de Tee Times.
    const needAutoAssign = false;
    if (needAutoAssign) {
        try {
            const toGroupNum = (v) => (v != null && v !== '' ? Number(v) : null);
            const preferredSession = (participantData.preferred_session === 'afternoon' || participantData.preferred_session === 'morning')
                ? participantData.preferred_session
                : 'morning';

            const partRow = await executeQuery(
                'SELECT handicap_used FROM tournament_participants WHERE participation_id = ? AND tournament_id = ?',
                [rows.insertId, tournamentId]
            );
            const hcpVal = partRow.rows?.[0]?.handicap_used != null ? Number(partRow.rows[0].handicap_used) : null;
            const playerBand = getBandFromHcp(hcpVal);

            const { rows: allInGroups } = await executeQuery(
                'SELECT group_number, handicap_used FROM tournament_participants WHERE tournament_id = ? AND group_number IS NOT NULL AND participation_id != ?',
                [tournamentId, rows.insertId]
            );
            const groupCount = {};
            const groupBands = {};
            for (const r of allInGroups || []) {
                const gn = toGroupNum(r.group_number);
                if (gn == null || !Number.isFinite(gn)) continue;
                groupCount[gn] = (groupCount[gn] || 0) + 1;
                const hcp = r.handicap_used != null && r.handicap_used !== '' ? Number(r.handicap_used) : null;
                const band = getBandFromHcp(hcp);
                if (!groupBands[gn]) groupBands[gn] = new Set();
                groupBands[gn].add(band);
            }
            try {
                const { rows: emptyGroups } = await executeQuery(
                    'SELECT group_number FROM empty_tournament_groups WHERE tournament_id = ?',
                    [tournamentId]
                );
                for (const eg of emptyGroups || []) {
                    const gn = toGroupNum(eg.group_number);
                    if (gn != null && Number.isFinite(gn) && groupCount[gn] === undefined) {
                        groupCount[gn] = 0;
                        groupBands[gn] = new Set();
                    }
                }
            } catch (_) {}

            // Turno por grupo: por MAYORÍA de participantes (no MAX), así un grupo con 2 tarde y 1 mañana = tarde
            const groupSession = {};
            try {
                const afternoonStart = tournament.afternoon_start_time ? String(tournament.afternoon_start_time).trim().slice(0, 5) : '13:00';
                const [afternoonH] = afternoonStart.split(':').map(Number);
                const normSession = (pref, teeTime) => {
                    const p = (pref != null ? String(pref).toLowerCase().trim() : '') || '';
                    if (p === 'afternoon' || p === 'tarde') return 'afternoon';
                    if (p === 'morning' || p === 'mañana' || p === 'manana') return 'morning';
                    if (teeTime) {
                        const t = String(teeTime).trim();
                        const [h] = t.split(':').map(Number);
                        return (!isNaN(h) && h >= (afternoonH || 13)) ? 'afternoon' : 'morning';
                    }
                    return null;
                };
                const { rows: perParticipant } = await executeQuery(
                    `SELECT group_number, tee_time_preference, tee_time FROM tournament_participants
                     WHERE tournament_id = ? AND group_number IS NOT NULL`,
                    [tournamentId]
                );
                const groupAfternoon = {};
                const groupMorning = {};
                for (const row of perParticipant || []) {
                    const gn = toGroupNum(row.group_number);
                    if (gn == null || !Number.isFinite(gn)) continue;
                    const s = normSession(row.tee_time_preference, row.tee_time);
                    if (s === 'afternoon') groupAfternoon[gn] = (groupAfternoon[gn] || 0) + 1;
                    else if (s === 'morning') groupMorning[gn] = (groupMorning[gn] || 0) + 1;
                }
                for (const gn of [...Object.keys(groupAfternoon).map(Number), ...Object.keys(groupMorning).map(Number)]) {
                    if (!Number.isFinite(gn) || groupSession[gn] !== undefined) continue;
                    const aft = groupAfternoon[gn] || 0;
                    const mor = groupMorning[gn] || 0;
                    groupSession[gn] = aft > mor ? 'afternoon' : (mor > aft ? 'morning' : null);
                }
                const { rows: emptyTee } = await executeQuery(
                    'SELECT group_number, tee_time FROM empty_tournament_groups WHERE tournament_id = ?',
                    [tournamentId]
                );
                for (const row of emptyTee || []) {
                    const gn = toGroupNum(row.group_number);
                    if (gn == null || !Number.isFinite(gn) || groupSession[gn] !== undefined) continue;
                    if (row.tee_time) {
                        const t = String(row.tee_time).trim();
                        const [h] = t.split(':').map(Number);
                        groupSession[gn] = (!isNaN(h) && h >= (afternoonH || 13)) ? 'afternoon' : 'morning';
                    } else {
                        groupSession[gn] = null;
                    }
                }
            } catch (_) {}

            const matchesTurn = (gn) => {
                const s = groupSession[gn];
                return s === preferredSession || s == null;
            };

            let targetGroup = null;
            const withSpaceAndTurn = Object.keys(groupCount).map(Number).filter(gn => {
                const cnt = groupCount[gn] || 0;
                return cnt < 4 && matchesTurn(gn);
            }).sort((a, b) => a - b);

            if (isByHcp && playerBand) {
                // Preferir grupo existente con misma banda HCP y espacio; si no hay, grupo vacío del turno; si no, cualquier grupo con espacio
                const withSameBand = withSpaceAndTurn.filter(gn => groupBands[gn] && groupBands[gn].has(playerBand));
                const emptyInTurn = withSpaceAndTurn.filter(gn => (groupCount[gn] || 0) === 0);
                targetGroup = withSameBand.length > 0
                    ? withSameBand[0]
                    : (withSpaceAndTurn.length > 0 ? withSpaceAndTurn[0] : null);
            } else {
                targetGroup = withSpaceAndTurn.length > 0 ? withSpaceAndTurn[0] : null;
            }

            if (targetGroup == null) {
                const numbers = Object.keys(groupCount).map(Number).filter(Boolean).sort((a, b) => a - b);
                targetGroup = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
            }
            const finalGroup = targetGroup != null ? targetGroup : 1;
            let groupTeeTime = null;
            let groupStartingHole = null;
            const existingInGroup = await executeQuery(
                `SELECT tee_time, starting_hole, COUNT(*) as cnt
                 FROM tournament_participants
                 WHERE tournament_id = ? AND group_number = ? AND participation_id != ?
                 GROUP BY tee_time, starting_hole
                 ORDER BY cnt DESC
                 LIMIT 1`,
                [tournamentId, finalGroup, rows.insertId]
            );
            if (existingInGroup.rows && existingInGroup.rows[0]) {
                groupTeeTime = existingInGroup.rows[0].tee_time;
                groupStartingHole = existingInGroup.rows[0].starting_hole;
            } else {
                try {
                    const { rows: emptyRow } = await executeQuery(
                        'SELECT tee_time, starting_hole FROM empty_tournament_groups WHERE tournament_id = ? AND group_number = ? LIMIT 1',
                        [tournamentId, finalGroup]
                    );
                    if (emptyRow && emptyRow[0]) {
                        groupTeeTime = emptyRow[0].tee_time;
                        groupStartingHole = emptyRow[0].starting_hole;
                    }
                } catch (_) {}
            }
            try {
                await getPool().execute(
                    'INSERT INTO empty_tournament_groups (tournament_id, group_number) VALUES (?, ?) ON DUPLICATE KEY UPDATE group_number = VALUES(group_number)',
                    [tournamentId, finalGroup]
                );
            } catch (_) {}
            await executeQuery(
                'UPDATE tournament_participants SET group_number = ?, tee_time = ?, starting_hole = ? WHERE participation_id = ? AND tournament_id = ?',
                [finalGroup, groupTeeTime, groupStartingHole, rows.insertId, tournamentId]
            );
            if (groupTeeTime != null || groupStartingHole != null) {
                await executeQuery(
                    'UPDATE tournament_participants SET tee_time = ?, starting_hole = ? WHERE tournament_id = ? AND group_number = ?',
                    [groupTeeTime, groupStartingHole, tournamentId, finalGroup]
                );
            }
            try {
                await executeQuery(
                    'UPDATE tournament_participants SET tee_time_preference = ? WHERE participation_id = ? AND tournament_id = ?',
                    [preferredSession, rows.insertId, tournamentId]
                );
            } catch (_) {}
            console.log(`✅ Participant ${rows.insertId} asignado al grupo ${finalGroup} (turno ${preferredSession})${isByHcp ? ' por HCP' : ''}`);
        } catch (autoErr) {
            console.warn('⚠️ Auto-assign group failed (continuing):', autoErr?.message || autoErr);
            try {
                await executeQuery(
                    'UPDATE tournament_participants SET group_number = 1 WHERE participation_id = ? AND tournament_id = ?',
                    [rows.insertId, tournamentId]
                );
                console.log(`✅ Participant ${rows.insertId} asignado al grupo 1 (fallback tras error)`);
            } catch (fallbackErr) {
                console.warn('⚠️ Fallback assign group 1 failed:', fallbackErr?.message || fallbackErr);
            }
        }
    }
    
    // Log activity
    try {
        await logActivity(
            courseId,
            null,
            'admin',
            'participant_added',
            'tournament',
            tournamentId,
            {
                message: `Participante "${participantData.player_name || participantData.full_name}" agregado al torneo`,
                participant_name: participantData.player_name || participantData.full_name,
                player_type: participantData.player_type
            },
            null,
            null
        );
    } catch (logError) {
        console.warn('Error logging activity:', logError);
    }
    
    return { participation_id: rows.insertId, ...participantData };
}

async function removeTournamentParticipant(courseId, tournamentId, participantId) {
    console.log('🗑️ Ejecutando eliminación en DB:', { courseId, tournamentId, participantId });
    
    try {
        // Primero, obtener el member_id o external_player_id del participante
        const getParticipantQuery = `
            SELECT member_id, external_player_id 
            FROM tournament_participants 
            WHERE participation_id = ? AND tournament_id = ?
        `;
        const { rows: participantRows } = await executeQuery(getParticipantQuery, [participantId, tournamentId]);
        
        if (participantRows && participantRows.length > 0) {
            const participant = participantRows[0];
            
            // Eliminar scorecard si existe
            if (participant.member_id) {
                const deleteScorecardQuery = `
                    DELETE FROM scorecards 
                    WHERE tournament_id = ? AND member_id = ?
                `;
                await executeQuery(deleteScorecardQuery, [tournamentId, participant.member_id]);
                console.log('🗑️ Scorecard del miembro eliminado (si existía)');
            } else if (participant.external_player_id) {
                const deleteScorecardQuery = `
                    DELETE FROM scorecards 
                    WHERE tournament_id = ? AND external_player_id = ?
                `;
                await executeQuery(deleteScorecardQuery, [tournamentId, participant.external_player_id]);
                console.log('🗑️ Scorecard del jugador externo eliminado (si existía)');
            }
        }
        
        // Ahora eliminar el participante
        const query = `DELETE FROM tournament_participants WHERE participation_id = ? AND tournament_id = ?`;
        const { rows } = await executeQuery(query, [participantId, tournamentId]);
        console.log('🗑️ Resultado de query DELETE:', { affectedRows: rows.affectedRows });
        
        if (rows.affectedRows > 0) {
            try {
                await logActivity(
                    courseId,
                    null,
                    'admin',
                    'participant_removed',
                    'tournament',
                    tournamentId,
                    `Participante eliminado del torneo (incluyendo datos relacionados)`,
                    null,
                    null
                );
            } catch (logError) {
                console.warn('Error logging activity:', logError);
            }
        }
        
        const result = rows.affectedRows > 0;
        console.log('🗑️ Retornando resultado:', result);
        return result;
    } catch (error) {
        console.error('❌ Error al eliminar participante:', error);
        throw error;
    }
}

async function updateParticipantHandicap(courseId, tournamentId, participationId, data) {
    const { handicap_index, handicap_local } = data || {};
    const toNumOrNull = (v) => (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);
    const hcpLocal = toNumOrNull(handicap_local);
    const hcpIndex = toNumOrNull(handicap_index);
    const hcpUsed = hcpLocal != null ? hcpLocal : hcpIndex;
    const getRow = await executeQuery(
        'SELECT external_player_id, member_id, player_type FROM tournament_participants WHERE participation_id = ? AND tournament_id = ?',
        [participationId, tournamentId]
    );
    if (!getRow.rows || getRow.rows.length === 0) {
        throw new Error('Participante no encontrado');
    }
    const row = getRow.rows[0];
    if (row.player_type === 'external' && row.external_player_id) {
        await executeQuery(
            'UPDATE external_players SET handicap_index = ?, handicap_local = ?, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?',
            [hcpIndex, hcpLocal, row.external_player_id]
        );
    } else if ((row.player_type === 'member' || row.player_type === 'visitor') && row.member_id) {
        await executeQuery(
            'UPDATE members SET handicap_index = ?, handicap_local = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND course_id = ?',
            [hcpIndex, hcpLocal, row.member_id, courseId]
        );
    }
    await executeQuery(
        'UPDATE tournament_participants SET handicap_used = ? WHERE participation_id = ? AND tournament_id = ?',
        [hcpUsed, participationId, tournamentId]
    );

    // No asignar ni reasignar grupo al actualizar el índice; el grupo se asigna al gestionar tee times.

    return await getTournamentParticipants(courseId, tournamentId);
}

async function updateParticipantStatus(courseId, tournamentId, participantId, status) {
    const query = `
        UPDATE tournament_participants 
        SET status = ?
        WHERE participation_id = ? AND tournament_id = ?
    `;
    const { rows } = await executeQuery(query, [status, participantId, tournamentId]);
    
    if (rows.affectedRows > 0) {
        try {
            await logActivity(
                courseId,
                null,
                'club_admin',
                'participant_status_changed',
                'tournament',
                tournamentId,
                `Estado del participante cambiado a ${status}`,
                null,
                null
            );
        } catch (logError) {
            console.warn('Error logging activity:', logError);
        }
        
        return await getTournamentParticipants(courseId, tournamentId);
    }
    return null;
}

async function updateParticipantPayment(courseId, tournamentId, participantId, paymentData) {
    try {
        // Obtener el estado de pago anterior
        const prevStateQuery = `SELECT payment_status, paid_amount, currency FROM tournament_participants WHERE participation_id = ? AND tournament_id = ?`;
        const { rows: prevRows } = await executeQuery(prevStateQuery, [participantId, tournamentId]);
        const previousPaymentStatus = prevRows[0]?.payment_status;
        const previousAmount = prevRows[0]?.paid_amount || 0;
        const previousCurrency = prevRows[0]?.currency || 'ARS';
        
        // Actualizar el participante
        const query = `
            UPDATE tournament_participants 
            SET 
                fee_amount = ?,
                paid_amount = ?,
                currency = ?,
                payment_status = ?,
                payment_method = ?,
                receipt_number = ?,
                payment_notes = ?
            WHERE participation_id = ? AND tournament_id = ?
        `;
        
        const { rows } = await executeQuery(query, [
            paymentData.fee_amount ?? 0,
            paymentData.paid_amount ?? 0,
            paymentData.currency || 'ARS',
            paymentData.payment_status ?? 'pending',
            paymentData.payment_method || null,
            paymentData.receipt_number || null,
            paymentData.payment_notes || null,
            participantId,
            tournamentId
        ]);
        
        // Si el estado cambió a "paid", actualizar el balance de la cuenta del torneo
        const newPaymentStatus = paymentData.payment_status ?? 'pending';
        const newAmount = paymentData.paid_amount ?? 0;
        const newCurrency = paymentData.currency || 'ARS';
        
        if (newPaymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
            // Nuevo pago: sumar a la cuenta y crear transacción
            const tournamentQuery = `SELECT account_id, club_id, tournament_date, tournament_name FROM tournaments WHERE tournament_id = ? AND course_id = ?`;
            const { rows: tournamentRows } = await executeQuery(tournamentQuery, [tournamentId, courseId]);
            
            if (tournamentRows[0]?.account_id) {
                const accountId = tournamentRows[0].account_id;
                const clubId = tournamentRows[0].club_id;
                const tournamentDate = tournamentRows[0].tournament_date;
                const tournamentName = tournamentRows[0].tournament_name || 'Torneo';
                
                // Actualizar balance de la cuenta
                const field = newCurrency === 'USD' ? 'current_balance_usd' : 'current_balance_ars';
                const updateAccountQuery = `
                    UPDATE custodian_accounts 
                    SET ${field} = ${field} + ?
                    WHERE account_id = ?
                `;
                await executeQuery(updateAccountQuery, [newAmount, accountId]);
                
                // Crear transacción de ingreso de torneo
                await createTransaction(clubId, {
                    transaction_type: 'income_tournament',
                    transaction_date: tournamentDate || new Date().toISOString().split('T')[0],
                    from_account_id: null,
                    to_account_id: accountId,
                    amount: newAmount,
                    currency: newCurrency,
                    description: `Pago de torneo: ${tournamentName} - Participante ID: ${participantId}`,
                    reference_type: 'tournament_payment',
                    reference_id: participantId
                });
                
                console.log(`✅ Added ${newAmount} ${newCurrency} to account ${accountId} (tournament payment)`);
            }
        } else if (previousPaymentStatus === 'paid' && newPaymentStatus !== 'paid') {
            // Revertir pago: restar de la cuenta y eliminar/crear transacción de reversión
            const tournamentQuery = `SELECT account_id, club_id FROM tournaments WHERE tournament_id = ? AND course_id = ?`;
            const { rows: tournamentRows } = await executeQuery(tournamentQuery, [tournamentId, courseId]);
            
            if (tournamentRows[0]?.account_id) {
                const accountId = tournamentRows[0].account_id;
                const clubId = tournamentRows[0].club_id;
                
                // Actualizar balance de la cuenta
                const field = previousCurrency === 'USD' ? 'current_balance_usd' : 'current_balance_ars';
                const updateAccountQuery = `
                    UPDATE custodian_accounts 
                    SET ${field} = ${field} - ?
                    WHERE account_id = ?
                `;
                await executeQuery(updateAccountQuery, [previousAmount, accountId]);
                
                // Crear transacción de reversión (expense para revertir el ingreso)
                await createTransaction(clubId, {
                    transaction_type: 'expense',
                    transaction_date: new Date().toISOString().split('T')[0],
                    from_account_id: accountId,
                    to_account_id: null,
                    amount: previousAmount,
                    currency: previousCurrency,
                    description: `Reversión de pago de torneo - Participante ID: ${participantId}`,
                    reference_type: 'tournament_payment_reversal',
                    reference_id: participantId
                });
                
                console.log(`✅ Removed ${previousAmount} ${previousCurrency} from account ${accountId} (payment reverted)`);
            }
        } else if (previousPaymentStatus === 'paid' && newPaymentStatus === 'paid' && (previousAmount !== newAmount || previousCurrency !== newCurrency)) {
            // Ajustar monto: restar el anterior y sumar el nuevo, crear transacciones correspondientes
            const tournamentQuery = `SELECT account_id, club_id, tournament_date FROM tournaments WHERE tournament_id = ? AND course_id = ?`;
            const { rows: tournamentRows } = await executeQuery(tournamentQuery, [tournamentId, courseId]);
            
            if (tournamentRows[0]?.account_id) {
                const accountId = tournamentRows[0].account_id;
                const clubId = tournamentRows[0].club_id;
                const tournamentDate = tournamentRows[0].tournament_date;
                
                // Restar el anterior
                const prevField = previousCurrency === 'USD' ? 'current_balance_usd' : 'current_balance_ars';
                await executeQuery(`UPDATE custodian_accounts SET ${prevField} = ${prevField} - ? WHERE account_id = ?`, [previousAmount, accountId]);
                
                // Crear transacción de reversión del monto anterior
                await createTransaction(clubId, {
                    transaction_type: 'expense',
                    transaction_date: new Date().toISOString().split('T')[0],
                    from_account_id: accountId,
                    to_account_id: null,
                    amount: previousAmount,
                    currency: previousCurrency,
                    description: `Ajuste de pago de torneo (reversión) - Participante ID: ${participantId}`,
                    reference_type: 'tournament_payment_adjustment',
                    reference_id: participantId
                });
                
                // Sumar el nuevo
                const newField = newCurrency === 'USD' ? 'current_balance_usd' : 'current_balance_ars';
                await executeQuery(`UPDATE custodian_accounts SET ${newField} = ${newField} + ? WHERE account_id = ?`, [newAmount, accountId]);
                
                // Obtener nombre del torneo para la descripción
                const tournamentNameQuery = `SELECT tournament_name FROM tournaments WHERE tournament_id = ? AND course_id = ?`;
                const { rows: nameRows } = await executeQuery(tournamentNameQuery, [tournamentId, courseId]);
                const tournamentName = nameRows[0]?.tournament_name || 'Torneo';
                
                // Crear nueva transacción con el monto ajustado
                await createTransaction(clubId, {
                    transaction_type: 'income_tournament',
                    transaction_date: tournamentDate || new Date().toISOString().split('T')[0],
                    from_account_id: null,
                    to_account_id: accountId,
                    amount: newAmount,
                    currency: newCurrency,
                    description: `Ajuste de pago de torneo: ${tournamentName} - Participante ID: ${participantId}`,
                    reference_type: 'tournament_payment',
                    reference_id: participantId
                });
                
                console.log(`✅ Adjusted account ${accountId}: -${previousAmount} ${previousCurrency}, +${newAmount} ${newCurrency}`);
            }
        }
        
        return rows.affectedRows > 0;
    } catch (error) {
        console.error('❌ Error updating participant payment:', error);
        throw error;
    }
}

/**
 * Buscar jugadores duplicados en todos los clubes
 */
async function findDuplicateExternalPlayers(playerData) {
    const duplicates = {
        byMatricula: null,
        byNameAndClub: []
    };
    
    // 1. Búsqueda por matrícula (más confiable)
    if (playerData.member_number && playerData.member_number.trim() !== '') {
        const matriculaQuery = `
            SELECT ep.*, c.club_name 
            FROM external_players ep
            JOIN clubs c ON ep.club_id = c.club_id
            WHERE ep.member_number = ? 
            AND ep.member_number IS NOT NULL 
            AND ep.member_number != ''
        `;
        
        const { rows: matriculaResults } = await executeQuery(matriculaQuery, [playerData.member_number.trim()]);
        
        if (matriculaResults.length > 0) {
            duplicates.byMatricula = matriculaResults[0];
            console.log('🔍 Duplicate found by matrícula:', duplicates.byMatricula);
        }
    }
    
    // 2. Búsqueda por nombre + club (menos confiable)
    if (playerData.full_name && playerData.home_club) {
        const nameClubQuery = `
            SELECT ep.*, c.club_name 
            FROM external_players ep
            JOIN clubs c ON ep.club_id = c.club_id
            WHERE LOWER(TRIM(ep.full_name)) LIKE LOWER(TRIM(?))
            AND LOWER(TRIM(ep.home_club)) LIKE LOWER(TRIM(?))
            AND ep.external_id NOT IN (
                SELECT IFNULL(external_id, 0) FROM external_players 
                WHERE member_number = ? AND member_number IS NOT NULL AND member_number != ''
            )
        `;
        
        const namePattern = `%${playerData.full_name.trim()}%`;
        const clubPattern = `%${playerData.home_club.trim()}%`;
        const matriculaExclude = playerData.member_number || 'NONE';
        
        const { rows: nameResults } = await executeQuery(nameClubQuery, [namePattern, clubPattern, matriculaExclude]);
        
        if (nameResults.length > 0) {
            duplicates.byNameAndClub = nameResults;
            console.log('🔍 Possible duplicates by name+club:', duplicates.byNameAndClub.length);
        }
    }
    
    return duplicates;
}

async function createExternalPlayer(playerData) {
    const query = `
        INSERT INTO external_players (
            full_name, email, phone, gender, handicap_index, handicap_local, member_number, home_club, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            phone = VALUES(phone),
            gender = VALUES(gender),
            handicap_index = VALUES(handicap_index),
            handicap_local = VALUES(handicap_local),
            member_number = VALUES(member_number),
            home_club = VALUES(home_club),
            notes = VALUES(notes),
            updated_at = CURRENT_TIMESTAMP
    `;
    
    const toNumOrNull = (v) => (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);
    const params = [
        playerData.full_name,
        playerData.email || null,
        playerData.phone || null,
        playerData.gender || null,
        toNumOrNull(playerData.handicap_index),
        toNumOrNull(playerData.handicap_local),
        playerData.member_number || null,
        playerData.home_club || null,
        playerData.notes || null
    ];
    
    const { rows } = await executeQuery(query, params);
    return { external_id: rows.insertId, ...playerData };
}

async function getExternalPlayers(clubId) {
    // 1) Jugadores externos creados por el club (tabla external_players) - para agregar al torneo
    const customQuery = `
        SELECT 
            ep.external_id as player_id,
            ep.full_name as player_name,
            ep.email as player_email,
            ep.phone as player_phone,
            ep.gender,
            ep.handicap_index,
            ep.handicap_local,
            ep.member_number,
            ep.home_club as player_club,
            ep.notes,
            'external' as player_type,
            ep.created_at,
            ep.updated_at
        FROM external_players ep
        ORDER BY ep.full_name
    `;
    const { rows: customRows } = await executeQuery(customQuery, []);
    // 2) Socios de OTROS clubes como "visitantes" disponibles (opcional)
    const visitorsQuery = `
        SELECT 
            m.member_id as player_id,
            CONCAT(m.first_name, ' ', m.last_name) as player_name,
            m.email as player_email,
            m.phone as player_phone,
            m.handicap_index,
            m.handicap_local,
            m.member_number,
            gc.club_name as player_club,
            'visitor' as player_type,
            m.created_at,
            m.updated_at
        FROM members m
        JOIN clubs gc ON m.course_id = gc.club_id
        WHERE m.course_id != ? AND m.is_active = true
        ORDER BY gc.club_name, m.first_name, m.last_name
    `;
    const { rows: visitorRows } = await executeQuery(visitorsQuery, [clubId]);
    return [...(customRows || []), ...(visitorRows || [])];
}

async function updateExternalPlayer(playerId, playerData) {
    const query = `
        UPDATE external_players 
        SET full_name = ?, 
            email = ?, 
            phone = ?, 
            gender = ?,
            handicap_index = ?, 
            handicap_local = ?, 
            member_number = ?, 
            home_club = ?, 
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE external_id = ?
    `;
    
    const toNumOrNull = (v) => (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);
    const params = [
        playerData.full_name,
        playerData.email || null,
        playerData.phone || null,
        playerData.gender || null,
        toNumOrNull(playerData.handicap_index),
        toNumOrNull(playerData.handicap_local),
        playerData.member_number || null,
        playerData.home_club || null,
        playerData.notes || null,
        playerId
    ];
    
    const { rows } = await executeQuery(query, params);
    return { external_id: playerId, ...playerData, success: true };
}

async function deleteExternalPlayer(playerId) {
    const query = `DELETE FROM external_players WHERE external_id = ?`;
    const { rows } = await executeQuery(query, [playerId]);
    return { success: true, affectedRows: rows.affectedRows };
}

async function getTournamentGroups(courseId, tournamentId) {
    const query = `
        SELECT tp.group_number,
               tp.tee_time,
               tp.starting_hole,
               (SELECT IF(SUM(CASE WHEN tp2.tee_time_preference = 'afternoon' THEN 1 ELSE 0 END) > 0, 'afternoon', IF(SUM(CASE WHEN tp2.tee_time_preference = 'morning' THEN 1 ELSE 0 END) > 0, 'morning', NULL)) FROM tournament_participants tp2 WHERE tp2.tournament_id = tp.tournament_id AND tp2.group_number = tp.group_number AND (tp2.tee_time <=> tp.tee_time) AND (tp2.starting_hole <=> tp.starting_hole)) as group_tee_preference,
               COUNT(*) as participants_count,
               AVG(CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.handicap_used, ep.handicap_local, ep.handicap_index)
                   ELSE 
                       COALESCE(tp.handicap_used, m.handicap_local, m.handicap_index)
               END) as avg_handicap,
               GROUP_CONCAT(
                   JSON_OBJECT(
                       'participation_id', tp.participation_id,
                       'member_id', CASE WHEN tp.player_type = 'member' THEN tp.member_id ELSE NULL END,
                       'external_player_id', CASE WHEN tp.player_type = 'external' THEN tp.external_player_id ELSE NULL END,
                       'player_name', CASE 
                           WHEN tp.player_type = 'external' THEN 
                               COALESCE(tp.player_name, ep.full_name)
                           ELSE 
                               CONCAT(m.first_name, ' ', m.last_name)
                       END,
                       'handicap_index', CASE 
                           WHEN tp.player_type = 'external' THEN 
                               CASE 
                                   WHEN tp.handicap_used IS NOT NULL THEN tp.handicap_used
                                   ELSE ep.handicap_index
                               END
                           ELSE 
                               CASE 
                                   WHEN tp.handicap_used IS NOT NULL THEN tp.handicap_used
                                   ELSE m.handicap_index
                               END
                       END,
                       'handicap_local', CASE 
                           WHEN tp.player_type = 'external' THEN 
                               ep.handicap_local
                           ELSE 
                               m.handicap_local
                       END,
                       'email', CASE 
                           WHEN tp.player_type = 'external' THEN 
                               COALESCE(tp.player_email, ep.email)
                           ELSE 
                               m.email
                       END,
                       'phone', CASE 
                           WHEN tp.player_type = 'external' THEN 
                               COALESCE(tp.player_phone, ep.phone)
                           ELSE 
                               m.phone
                       END,
                       'player_type', tp.player_type,
                       'status', tp.status
                   )
               ) as participants
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        WHERE tp.tournament_id = ? AND tp.group_number IS NOT NULL AND tp.participation_id > 0
        GROUP BY tp.group_number, tp.tee_time, tp.starting_hole
        ORDER BY tp.group_number ASC
    `;
    
    const { rows } = await executeQuery(query, [tournamentId]);
    
    // 🔍 DEBUG específico en getTournamentGroups - buscar Juan de la Cruz
    console.log('🔍 DEBUG getTournamentGroups - Buscando Juan de la Cruz en grupos existentes...');
    
    // Parsear los participantes JSON
    const groupsWithParticipants = rows.map(group => {
        console.log(`🔍 DEBUG Group ${group.group_number} raw participants:`, group.participants);
        let parsedParticipants = [];
        if (group.participants) {
            try {
                parsedParticipants = JSON.parse(`[${group.participants}]`);
                console.log(`🔍 DEBUG Group ${group.group_number} parsed participants:`, parsedParticipants.map(p => p.player_name));
                
                // 🔍 Buscar específicamente a jugadores problemáticos en este grupo
                const problemPlayers = parsedParticipants.filter(p => 
                    p.player_name && (
                        p.player_name.toLowerCase().includes('juan') ||
                        p.player_name.toLowerCase().includes('eduardo') ||
                        p.player_name.toLowerCase().includes('dardo') ||
                        p.player_name.toLowerCase().includes('carlos')
                    )
                );
                if (problemPlayers.length > 0) {
                    console.log(`🎯 GRUPO ${group.group_number} - Jugadores problemáticos:`, problemPlayers.map(p => ({
                        player_name: p.player_name,
                        handicap_index: p.handicap_index,
                        handicap_local: p.handicap_local,
                        player_type: p.player_type,
                        valores_reales: `Index: ${p.handicap_index}, HCP: ${p.handicap_local}`
                    })));
                }
            } catch (error) {
                console.error(`❌ Error parsing participants for group ${group.group_number}:`, error);
            }
        }
        return {
            ...group,
            participants: parsedParticipants,
            group_tee_preference: group.group_tee_preference || null,
            starting_hole: (group.starting_hole === null || group.starting_hole === undefined) ? null : group.starting_hole
        };
    });
    
    // Obtener también los grupos vacíos de la tabla auxiliar
    const emptyGroupsQuery = `
        SELECT group_number, tee_time, starting_hole
        FROM empty_tournament_groups 
        WHERE tournament_id = ?
        ORDER BY group_number ASC
    `;
    
    let emptyGroups = [];
    try {
        const [rows] = await getPool().execute(emptyGroupsQuery, [tournamentId]);
        emptyGroups = rows || [];
    } catch (error) {
        // Si la tabla no existe aún, se creará cuando se necesite
        console.log('📋 Empty groups table not yet created, will be created when needed');
        emptyGroups = [];
    }
    
    // Combinar grupos con participantes y grupos vacíos
    const allGroups = [...groupsWithParticipants];
    
    // Agregar grupos vacíos que no estén ya representados
    emptyGroups.forEach(emptyGroup => {
        const existingGroup = allGroups.find(g => g.group_number === emptyGroup.group_number);
        if (!existingGroup) {
            allGroups.push({
                group_number: emptyGroup.group_number,
                tee_time: emptyGroup.tee_time,
                starting_hole: emptyGroup.starting_hole,
                participants_count: 0,
                avg_handicap: null,
                participants: []
            });
        }
    });
    
    // Ordenar por número de grupo
    return allGroups.sort((a, b) => a.group_number - b.group_number);
}



// Función para generar grupos automáticamente por handicap
async function generateTournamentGroups(courseId, tournamentId, options = {}) {
    const { 
        groupSize = 4, 
        startingHole = 1,
        autoAssignByHandicap = true,
        preserveExistingGroups = false,
        byHcp = true
    } = options;
    
    console.log('🎯 Generating groups for tournament:', tournamentId);
    
    // Obtener participantes confirmados ordenados por handicap
    const participantsQuery = `
        SELECT tp.*,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_name, ep.full_name)
                   ELSE 
                       CONCAT(m.first_name, ' ', m.last_name)
               END as player_name,
               
               /* Normalizo vacíos y 'N/A' a NULL, y devuelvo cada fuente por separado */
               CASE 
                   WHEN tp.player_type = 'external'
                       THEN NULLIF(NULLIF(TRIM(ep.handicap_local), ''), 'N/A')
                   ELSE NULLIF(NULLIF(TRIM(m.handicap_local), ''), 'N/A')
               END AS handicap_local,

               CASE 
                   WHEN tp.player_type = 'external'
                       THEN NULLIF(NULLIF(TRIM(ep.handicap_index), ''), 'N/A')
                   ELSE NULLIF(NULLIF(TRIM(m.handicap_index), ''), 'N/A')
               END AS handicap_index_original,

               /* Si existe en la tabla de participantes */
               NULLIF(NULLIF(TRIM(tp.handicap_used), ''), 'N/A') AS handicap_used,

               /* Handicap efectivo con prioridad: used > local > index */
               CASE 
                   WHEN tp.player_type = 'external' THEN
                       COALESCE(NULLIF(NULLIF(TRIM(tp.handicap_used), ''), 'N/A'),
                                NULLIF(NULLIF(TRIM(ep.handicap_local), ''), 'N/A'),
                                NULLIF(NULLIF(TRIM(ep.handicap_index), ''), 'N/A'))
                   ELSE
                       COALESCE(NULLIF(NULLIF(TRIM(tp.handicap_used), ''), 'N/A'),
                                NULLIF(NULLIF(TRIM(m.handicap_local), ''), 'N/A'),
                                NULLIF(NULLIF(TRIM(m.handicap_index), ''), 'N/A'))
               END AS handicap_effective,
               
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_email, ep.email)
                   ELSE 
                       m.email
               END as email,
               CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.player_phone, ep.phone)
                   ELSE 
                       m.phone
               END as phone
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        WHERE tp.tournament_id = ? AND tp.status IN ('registered', 'confirmed')
        ORDER BY ${autoAssignByHandicap ? 'handicap_effective IS NULL, handicap_effective ASC' : 'tp.registration_date ASC'}
    `;
    
    const { rows: participants } = await executeQuery(participantsQuery, [tournamentId]);
    
    // Convierte '', 'N/A', null, undefined → null. Mantiene 0 como válido.
    function normalizeHcp(v) {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') {
            const t = v.trim();
            if (!t || /^n\/?a$/i.test(t)) return null;
            const n = Number(t.replace(',', '.'));
            return Number.isFinite(n) ? n : null;
        }
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        return null;
    }

    // Construye el handicap efectivo para ordenar: used > local > index (para que ningún jugador quede sin valor al reorganizar).
    function getEffectiveHcp(p) {
        const used = normalizeHcp(p.handicap_used);
        const local = normalizeHcp(p.handicap_local);
        const index = normalizeHcp(p.handicap_index_original);
        if (used !== null) return used;
        if (local !== null) return local;
        return index; // puede ser null si no hay ninguno
    }

    // Clasificación robusta: 0 es válido (scratch), null es sin HCP.
    function classifyParticipants(rows) {
        const withHcp = [];
        const scratch = [];  // hcp === 0
        const noHcp = [];    // hcp == null

        for (const p of rows) {
            const hcp = getEffectiveHcp(p);
            if (hcp === null) noHcp.push({ ...p, hcp });
            else if (hcp === 0) scratch.push({ ...p, hcp });
            else withHcp.push({ ...p, hcp });
        }

        // Ordená los que tienen HCP por valor (bajo a alto)
        withHcp.sort((a, b) => a.hcp - b.hcp);

        // Orden correcto: SCRATCH PRIMERO (handicap más bajo), luego con HCP, luego sin HCP
        return [...scratch, ...withHcp, ...noHcp];
    }

    // 🔧 CORRECCIÓN: Poner NULL a jugadores sin INDEX válido (solo en primera ejecución)
    try {
        const { rows: needFix } = await executeQuery(`
            SELECT member_id, first_name, last_name, handicap_index, handicap_local
            FROM members 
            WHERE handicap_index = 0 AND handicap_local = 0
        `);
        
        if (needFix.length > 0) {
            console.log('🔧 Corrigiendo handicaps de principiantes...');
            for (const member of needFix) {
                console.log(`❌ ${member.first_name} ${member.last_name}: Index=${member.handicap_index}, HCP=${member.handicap_local} → HCP=NULL`);
            }
            
            await executeQuery(`
                UPDATE members 
                SET handicap_local = NULL 
                WHERE handicap_index = 0 AND handicap_local = 0
            `);
            
            console.log(`✅ Corregidos ${needFix.length} jugadores principiantes`);
        }
    } catch (error) {
        console.log('⚠️ Error corrigiendo handicaps:', error.message);
    }

    console.log('🎯 Found participants:', participants.length);
    console.log('🎯 Participants details:', participants.map(p => ({
        name: p.player_name,
        type: p.player_type,
        handicap_local: p.handicap_local,
        handicap_index_original: p.handicap_index_original,
        handicap_used: p.handicap_used,
        handicap_effective: p.handicap_effective
    })));
    
    // 🔍 DEBUG: Verificar datos específicos de Gustavo Vera
    const gustavoVera = participants.find(p => p.player_name && p.player_name.includes('Gustavo Vera'));
    if (gustavoVera) {
        console.log('🔍 DEBUG Gustavo Vera:', {
            name: gustavoVera.player_name,
            member_id: gustavoVera.member_id,
            handicap_index_computed: gustavoVera.handicap_index,
            handicap_used: gustavoVera.handicap_used,
            player_type: gustavoVera.player_type
        });
        
        // 🔍 DEBUG: Verificar datos DIRECTOS de la tabla members
        const directQuery = `
            SELECT first_name, last_name, handicap_index, handicap_local, member_id 
            FROM members 
            WHERE member_id = ?
        `;
        const { rows: directData } = await executeQuery(directQuery, [gustavoVera.member_id]);
        if (directData.length > 0) {
            console.log('🔍 DEBUG Gustavo Vera DIRECTO desde members:', directData[0]);
        }
    }
    
    if (participants.length === 0) {
        return [];
    }
    
    // Nueva clasificación usando las funciones robustas
    const sortedParticipants = classifyParticipants(participants);
    
    // 🔍 DEBUG específico para jugadores problemáticos usando nueva lógica
    const problematicPlayers = ['Eduardo', 'Dardo', 'Carlos', 'Juan'];
    problematicPlayers.forEach(name => {
        const player = participants.find(p => p.player_name && p.player_name.toLowerCase().includes(name.toLowerCase()));
        if (player) {
            const effectiveHcp = getEffectiveHcp(player);
            let classification = '';
            
            if (effectiveHcp === null) classification = 'SIN HANDICAP';
            else if (effectiveHcp === 0) classification = 'SCRATCH GOLFER (HCP: 0)';
            else classification = `CON HANDICAP (HCP: ${effectiveHcp})`;
            
            console.log(`🔍 DEBUG ${name} (${player.player_name}):`, {
                handicap_local: player.handicap_local,
                handicap_index_original: player.handicap_index_original,
                handicap_used: player.handicap_used,
                handicap_effective: player.handicap_effective,
                computed_hcp: effectiveHcp,
                classification: classification,
                player_type: player.player_type,
                member_id: player.member_id
            });
        } else {
            console.log(`❌ DEBUG ${name}: NO ENCONTRADO en participants`);
        }
    });
    
    // 🔍 DEBUG buscar específicamente a Juan de la Cruz Pereyra
    const juanPlayers = participants.filter(p => p.player_name && p.player_name.toLowerCase().includes('juan'));
    console.log('🔍 DEBUG Todos los jugadores llamados Juan:', juanPlayers.map(p => ({
        name: p.player_name,
        handicap_local: p.handicap_local,
        handicap_index_original: p.handicap_index_original,
        handicap_effective: p.handicap_effective,
        computed_hcp: getEffectiveHcp(p)
    })));
    
    // DEBUG nueva clasificación
    const classified = classifyParticipants(participants);
    const withHcp = classified.filter(p => p.hcp !== null && p.hcp !== 0);
    const scratch = classified.filter(p => p.hcp === 0);
    const noHcp = classified.filter(p => p.hcp === null);
    
    console.log('🏌️ Jugadores con handicap:', withHcp.length);
    console.log('🎯 Scratch golfers (HCP 0):', scratch.length);
    console.log('🔰 Sin handicap:', noHcp.length);
    console.log('🏌️ Lista con handicap:', withHcp.slice(0, 5).map(p => ({ name: p.player_name, hcp: p.hcp })));
    console.log('🎯 Lista scratch:', scratch.map(p => ({ name: p.player_name, hcp: p.hcp })));
    console.log('🔰 Lista sin handicap:', noHcp.slice(0, 5).map(p => ({ name: p.player_name, hcp: p.hcp })));

    // Limpiar grupos existentes solo si no estamos preservando
    if (!preserveExistingGroups) {
        console.log('🔄 Clearing existing groups (full regeneration)');
        console.log('🔄 Clearing handicap_used to use current member data');
        await executeQuery(
            'UPDATE tournament_participants SET group_number = NULL, tee_time = NULL, starting_hole = ?, handicap_used = NULL WHERE tournament_id = ?',
            [startingHole, tournamentId]
        );
        
        // También eliminar grupos vacíos
        try {
            await getPool().execute(
                'DELETE FROM empty_tournament_groups WHERE tournament_id = ?',
                [tournamentId]
            );
            console.log('🗑️ Cleared empty groups table');
        } catch (error) {
            console.log('📋 Empty groups table does not exist or no empty groups to clear');
        }
    } else {
        console.log('🔒 Preserving existing groups (adding new players only)');
    }
    
    // Generar grupos
    const groups = [];
    
    if (preserveExistingGroups) {
        // Modo: Solo agregar nuevos jugadores
        console.log('🔒 Adding only new players to existing groups');
        
        // Filtrar solo jugadores sin grupo asignado
        const unassignedPlayers = participants.filter(p => !p.group_number);
        console.log(`🎯 Found ${unassignedPlayers.length} unassigned players`);
        
        if (unassignedPlayers.length > 0) {
            // Obtener el número de grupo más alto existente
            const maxGroupQuery = 'SELECT MAX(group_number) as max_group FROM tournament_participants WHERE tournament_id = ? AND group_number IS NOT NULL';
            const { rows: maxGroupResult } = await executeQuery(maxGroupQuery, [tournamentId]);
            let currentGroup = (maxGroupResult[0]?.max_group || 0) + 1;
            
            // Asignar nuevos jugadores a grupos nuevos
            for (let i = 0; i < unassignedPlayers.length; i += groupSize) {
                const groupParticipants = unassignedPlayers.slice(i, i + groupSize);
                
                for (const participant of groupParticipants) {
                    await executeQuery(
                        'UPDATE tournament_participants SET group_number = ?, starting_hole = ? WHERE participation_id = ?',
                        [currentGroup, startingHole, participant.participation_id]
                    );
                }
                
                groups.push({
                    group_number: currentGroup,
                    participants: groupParticipants,
                    tee_time: null,
                    starting_hole: startingHole
                });
                
                currentGroup++;
            }
        }
        
        // Retornar todos los grupos (existentes + nuevos)
        return await getTournamentGroups(courseId, tournamentId);
        
    } else {
        let orderedForGroups;
        const tournament = await getTournamentById(courseId, tournamentId);
        const resultsMode = (tournament && tournament.results_mode === 'scratch_bands') ? 'scratch_bands' : 'standard';

        if (byHcp && resultsMode === 'scratch_bands') {
            // Modalidad Scratch + Bandas: 1ra (-5 a 7.9), 2da (8 a 13.9), 3ra (14 a 21.9), 4ta (22 a 54). No mezclar bandas.
            console.log('🔄 Regenerating groups by scratch_bands (no mixing bands)');
            const band1 = [];   // -5 <= HCP <= 7.9
            const band2 = [];   // 8 <= HCP <= 13.9
            const band3 = [];   // 14 <= HCP <= 21.9
            const band4 = [];   // 22 <= HCP <= 54
            const noHcpBand = []; // sin HCP

            for (const p of sortedParticipants) {
                const h = getEffectiveHcp(p);
                if (h === null) noHcpBand.push(p);
                else if (h <= 7.9) band1.push(p);
                else if (h <= 13.9) band2.push(p);
                else if (h <= 21.9) band3.push(p);
                else if (h <= 54) band4.push(p);
                else noHcpBand.push(p);
            }

            const bandOrder = [band1, band2, band3, band4, noHcpBand];
            let nextGroupNumber = 1;

            for (const bandParticipants of bandOrder) {
                if (bandParticipants.length === 0) continue;
                const numGroupsInBand = Math.ceil(bandParticipants.length / groupSize) || 1;
                const groupListsBand = Array.from({ length: numGroupsInBand }, () => []);

                for (let i = 0; i < bandParticipants.length; i++) {
                    const round = Math.floor(i / numGroupsInBand);
                    const posInRound = i % numGroupsInBand;
                    const groupIndex = round % 2 === 0 ? posInRound : numGroupsInBand - 1 - posInRound;
                    groupListsBand[groupIndex].push(bandParticipants[i]);
                }

                for (const g of groupListsBand) {
                    for (const participant of g) {
                        await executeQuery(
                            'UPDATE tournament_participants SET group_number = ?, starting_hole = ? WHERE participation_id = ?',
                            [nextGroupNumber, startingHole, participant.participation_id]
                        );
                    }
                    groups.push({
                        group_number: nextGroupNumber,
                        participants: g,
                        tee_time: null,
                        starting_hole: startingHole
                    });
                    nextGroupNumber++;
                }
            }
        } else {
            if (byHcp) {
                orderedForGroups = sortedParticipants;
                console.log('🔄 Regenerating all groups from scratch (HCP spread / serpentina)');
            } else {
                orderedForGroups = [...participants].sort((a, b) => {
                    const da = a.registration_date ? new Date(a.registration_date).getTime() : 0;
                    const db = b.registration_date ? new Date(b.registration_date).getTime() : 0;
                    if (da !== db) return da - db;
                    return (a.participation_id || 0) - (b.participation_id || 0);
                });
                console.log('🔄 Regenerating all groups from scratch (by registration order)');
            }

            const numGroups = Math.ceil(orderedForGroups.length / groupSize) || 1;
            const groupLists = Array.from({ length: numGroups }, () => []);

            if (byHcp) {
                for (let i = 0; i < orderedForGroups.length; i++) {
                    const round = Math.floor(i / numGroups);
                    const posInRound = i % numGroups;
                    const groupIndex = round % 2 === 0 ? posInRound : numGroups - 1 - posInRound;
                    groupLists[groupIndex].push(orderedForGroups[i]);
                }
            } else {
                for (let i = 0; i < orderedForGroups.length; i += groupSize) {
                    const chunk = orderedForGroups.slice(i, i + groupSize);
                    const g = Math.floor(i / groupSize);
                    if (g < numGroups) groupLists[g].push(...chunk);
                }
            }

            for (let g = 0; g < numGroups; g++) {
                const groupNumber = g + 1;
                const groupParticipants = groupLists[g];
                for (const participant of groupParticipants) {
                    await executeQuery(
                        'UPDATE tournament_participants SET group_number = ?, starting_hole = ? WHERE participation_id = ?',
                        [groupNumber, startingHole, participant.participation_id]
                    );
                }
                groups.push({
                    group_number: groupNumber,
                    participants: groupParticipants,
                    tee_time: null,
                    starting_hole: startingHole
                });
            }
        }

        try {
            await executeQuery(
                'UPDATE tournaments SET groups_by_hcp = ? WHERE tournament_id = ? AND course_id = ?',
                [byHcp ? 1 : 0, tournamentId, courseId]
            );
        } catch (e) {
            if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
        }
    }
    
    console.log(`✅ Generated ${groups.length} groups with ${sortedParticipants.length} participants`);
    return groups;
}

// Función auxiliar para sumar minutos a una hora
function addMinutesToTime(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return date.toTimeString().slice(0, 5); // Format HH:MM
}

// Normalizar hora a HH:MM (24h) para uso interno
function toHHMM(v) {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    const match = s.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return s.length >= 5 ? s.slice(0, 5) : s;
}

// Función para asignar tee times a los grupos
async function assignTeeTimesToGroups(courseId, tournamentId, teeTimeData) {
    const raw = {
        start_time: teeTimeData.start_time ?? '08:00',
        interval_minutes: teeTimeData.interval_minutes ?? 12,
        course_holes: teeTimeData.course_holes ?? 18,
        enable_two_sessions: teeTimeData.enable_two_sessions ?? false,
        enable_simultaneous_starts: teeTimeData.enable_simultaneous_starts ?? false,
        morning_end_time: teeTimeData.morning_end_time ?? '12:00',
        afternoon_start_time: teeTimeData.afternoon_start_time ?? '14:00',
        preferred_session: teeTimeData.preferred_session ?? 'morning'
    };
    const start_time = toHHMM(raw.start_time) || '08:00';
    const afternoon_start_time = toHHMM(raw.afternoon_start_time) || '14:00';
    const interval_minutes = Number(raw.interval_minutes) || 12;
    const course_holes = Number(raw.course_holes) || 18;
    const enable_two_sessions = !!raw.enable_two_sessions;
    const enable_simultaneous_starts = !!raw.enable_simultaneous_starts;
    const preferred_session = (raw.preferred_session || 'morning').toLowerCase();

    console.log('🕐 Assigning tee times for tournament:', tournamentId, 'morning start:', start_time, 'afternoon start:', afternoon_start_time);
    console.log('🔍 DEBUG enable_simultaneous_starts:', enable_simultaneous_starts, typeof enable_simultaneous_starts);
    console.log('🔍 DEBUG enable_two_sessions:', enable_two_sessions, typeof enable_two_sessions);
    
    // Obtener grupos existentes con información detallada de handicap
    const groupsQuery = `
        SELECT tp.group_number,
               COUNT(*) as participants_count,
               AVG(CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.handicap_used, ep.handicap_local, ep.handicap_index)
                   ELSE 
                       COALESCE(tp.handicap_used, m.handicap_local, m.handicap_index)
               END) as avg_handicap,
               MIN(CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.handicap_used, ep.handicap_local, ep.handicap_index, 999)
                   ELSE 
                       COALESCE(tp.handicap_used, m.handicap_local, m.handicap_index, 999)
               END) as min_handicap,
               MAX(CASE 
                   WHEN tp.player_type = 'external' THEN 
                       COALESCE(tp.handicap_used, ep.handicap_local, ep.handicap_index, 0)
                   ELSE 
                       COALESCE(tp.handicap_used, m.handicap_local, m.handicap_index, 0)
               END) as max_handicap,
               GROUP_CONCAT(
                   CASE 
                       WHEN tp.player_type = 'external' THEN 
                           COALESCE(tp.player_name, ep.full_name)
                       ELSE 
                           CONCAT(m.first_name, ' ', m.last_name)
                   END
                   ORDER BY 
                   CASE 
                       WHEN tp.player_type = 'external' THEN 
                           COALESCE(tp.handicap_used, ep.handicap_local, ep.handicap_index, 999)
                       ELSE 
                           COALESCE(tp.handicap_used, m.handicap_local, m.handicap_index, 999)
                   END ASC 
                   SEPARATOR ', '
               ) as player_names,
               (SELECT tp2.tee_time_preference FROM tournament_participants tp2
                WHERE tp2.tournament_id = tp.tournament_id AND tp2.group_number = tp.group_number
                  AND tp2.tee_time_preference IS NOT NULL AND tp2.tee_time_preference = 'afternoon'
                LIMIT 1) as group_tee_preference
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        WHERE tp.tournament_id = ? AND tp.group_number IS NOT NULL
        GROUP BY tp.group_number
        ORDER BY tp.group_number ASC
    `;
    
    const { rows: groups } = await executeQuery(groupsQuery, [tournamentId]);
    
    if (groups.length === 0) {
        throw new Error('No hay grupos generados. Primero genera los grupos.');
    }
    
    // PRIORIDAD 1: SALIDAS SIMULTÁNEAS (tiene prioridad máxima)
    console.log(`🔍 VERIFICANDO SALIDAS SIMULTÁNEAS: enable_simultaneous_starts=${enable_simultaneous_starts}, groups.length=${groups.length}`);
    if (enable_simultaneous_starts && groups.length > 0) {
        // SALIDAS SIMULTÁNEAS: Un grupo por hoyo, empezando desde hoyo 1
        console.log('⛳ SALIDAS SIMULTÁNEAS: Asignando un grupo por hoyo');
        
        let currentTime = start_time;
        let currentRound = 1;
        
        const allGroupsSorted = groups.sort((a, b) => a.group_number - b.group_number);
        
        for (let i = 0; i < allGroupsSorted.length; i++) {
            const group = allGroupsSorted[i];
            if (i > 0 && i % course_holes === 0) {
                currentRound++;
                currentTime = addMinutesToTime(start_time, (currentRound - 1) * 30);
                console.log(`🔄 Nueva tanda ${currentRound}: horario ${currentTime}`);
            }
            await executeQuery(
                'UPDATE tournament_participants SET tee_time = ?, starting_hole = NULL WHERE tournament_id = ? AND group_number = ?',
                [currentTime, tournamentId, group.group_number]
            );
            console.log(`⛳ Grupo ${group.group_number}: ${currentTime} (Tanda ${currentRound}, hoyo sin asignar)`);
        }
        console.log(`✅ Asignados ${allGroupsSorted.length} grupos en salidas simultáneas`);
        const { rows: updatedGroups } = await executeQuery(groupsQuery, [tournamentId]);
        return updatedGroups;
    }

    // RESPETAR PREFERENCIA MAÑANA/TARDE de cada grupo (inscripción pública)
    const morningPreferGroups = [];
    const afternoonPreferGroups = [];
    groups.forEach(group => {
        const pref = (group.group_tee_preference || '').toString().toLowerCase().trim();
        if (pref === 'afternoon') {
            afternoonPreferGroups.push(group);
        } else {
            morningPreferGroups.push(group);
        }
    });

    const sortByHandicap = (a, b) => {
        const avgA = parseFloat(a.avg_handicap);
        const avgB = parseFloat(b.avg_handicap);
        const minA = parseFloat(a.min_handicap);
        const minB = parseFloat(b.min_handicap);
        const lowA = (!isNaN(avgA) && avgA <= 15) || (!isNaN(minA) && (minA <= 10 || minA === 0));
        const lowB = (!isNaN(avgB) && avgB <= 15) || (!isNaN(minB) && (minB <= 10 || minB === 0));
        if (lowA && !lowB) return -1;
        if (!lowA && lowB) return 1;
        return (avgA - avgB) || (a.group_number - b.group_number);
    };
    morningPreferGroups.sort(sortByHandicap);
    afternoonPreferGroups.sort(sortByHandicap);

    console.log(`⏰ Grupos que eligieron mañana: ${morningPreferGroups.length}`);
    console.log(`⏰ Grupos que eligieron tarde: ${afternoonPreferGroups.length}`);

    let slotIndex = 0;
    for (const group of morningPreferGroups) {
        const teeTime = addMinutesToTime(start_time, slotIndex * interval_minutes);
        await executeQuery(
            'UPDATE tournament_participants SET tee_time = ?, starting_hole = NULL WHERE tournament_id = ? AND group_number = ?',
            [teeTime, tournamentId, group.group_number]
        );
        console.log(`⛳ Grupo ${group.group_number}: Mañana, ${teeTime} (hoyo sin asignar)`);
        slotIndex++;
    }
    slotIndex = 0;
    for (const group of afternoonPreferGroups) {
        const teeTime = addMinutesToTime(afternoon_start_time, slotIndex * interval_minutes);
        await executeQuery(
            'UPDATE tournament_participants SET tee_time = ?, starting_hole = NULL WHERE tournament_id = ? AND group_number = ?',
            [teeTime, tournamentId, group.group_number]
        );
        console.log(`⛳ Grupo ${group.group_number}: Tarde, ${teeTime} (hoyo sin asignar)`);
        slotIndex++;
    }

    const { rows: updatedGroups } = await executeQuery(groupsQuery, [tournamentId]);
    console.log(`✅ Asignados tee times respetando preferencia: ${morningPreferGroups.length} mañana, ${afternoonPreferGroups.length} tarde`);
    return updatedGroups;
}

// Reacomodar todos los participantes por HCP: mover a cada uno al grupo con número más bajo que tenga su banda y espacio (ej. del 4 al 3)
async function rebalanceGroupsByHcp(courseId, tournamentId) {
    const tournament = await getTournamentById(courseId, tournamentId);
    if (!tournament || tournament.results_mode !== 'scratch_bands') {
        return { moved: 0, message: 'El torneo no es por bandas HCP' };
    }
    const toGn = (v) => (v != null && v !== '' ? Number(v) : null);
    const { rows: participants } = await executeQuery(
        'SELECT participation_id, group_number, handicap_used FROM tournament_participants WHERE tournament_id = ? AND group_number IS NOT NULL',
        [tournamentId]
    );
    if (!participants || participants.length === 0) return { moved: 0 };

    const groupCount = {};
    const groupBands = {};
    for (const r of participants) {
        const gn = toGn(r.group_number);
        if (gn == null || !Number.isFinite(gn)) continue;
        groupCount[gn] = (groupCount[gn] || 0) + 1;
        const band = getBandFromHcp(r.handicap_used != null && r.handicap_used !== '' ? Number(r.handicap_used) : null);
        if (!groupBands[gn]) groupBands[gn] = new Set();
        groupBands[gn].add(band);
    }
    try {
        const { rows: emptyGroups } = await executeQuery(
            'SELECT group_number FROM empty_tournament_groups WHERE tournament_id = ?',
            [tournamentId]
        );
        for (const eg of emptyGroups || []) {
            const gn = toGn(eg.group_number);
            if (gn != null && Number.isFinite(gn) && groupCount[gn] === undefined) {
                groupCount[gn] = 0;
                groupBands[gn] = new Set();
            }
        }
    } catch (_) {}
    const getCandidates = (playerBand) => {
        if (!playerBand) return [];
        return Object.keys(groupCount).map(Number).filter(gn => {
            const cnt = groupCount[gn] || 0;
            const hasBand = groupBands[gn] && groupBands[gn].has(playerBand);
            const isEmpty = cnt === 0;
            return (hasBand || isEmpty) && cnt < 4;
        }).sort((a, b) => (a !== b ? a - b : (groupCount[a] || 0) - (groupCount[b] || 0)));
    };

    let moved = 0;
    const sorted = [...participants].sort((a, b) => (toGn(b.group_number) || 0) - (toGn(a.group_number) || 0));
    for (const p of sorted) {
        const pid = p.participation_id;
        const currentGroup = toGn(p.group_number);
        if (currentGroup == null || !Number.isFinite(currentGroup)) continue;
        const playerBand = getBandFromHcp(p.handicap_used != null && p.handicap_used !== '' ? Number(p.handicap_used) : null);
        const candidates = getCandidates(playerBand);
        const targetGroup = candidates.find(gn => gn < currentGroup) || candidates[0];
        if (targetGroup != null && targetGroup !== currentGroup) {
            await executeQuery(
                'UPDATE tournament_participants SET group_number = ? WHERE participation_id = ? AND tournament_id = ?',
                [targetGroup, pid, tournamentId]
            );
            groupCount[currentGroup] = (groupCount[currentGroup] || 1) - 1;
            groupCount[targetGroup] = (groupCount[targetGroup] || 0) + 1;
            if (!groupBands[targetGroup]) groupBands[targetGroup] = new Set();
            groupBands[targetGroup].add(playerBand);
            moved++;
            console.log(`✅ Rebalance: participante ${pid} movido del grupo ${currentGroup} al ${targetGroup} (banda ${playerBand})`);
        }
    }
    return { moved };
}

// Función para mover un jugador entre grupos
async function movePlayerToGroup(courseId, tournamentId, participationId, newGroupNumber) {
    console.log(`🔄 Moving player ${participationId} to group ${newGroupNumber} in tournament ${tournamentId}`);
    
    // Primero, verificar que el grupo destino existe y obtener su información
    // Buscar en grupos con participantes
    const groupInfoQuery = `
        SELECT DISTINCT group_number, tee_time, starting_hole
        FROM tournament_participants 
        WHERE tournament_id = ? AND group_number = ?
        LIMIT 1
    `;
    
    let [groupInfo] = await getPool().execute(groupInfoQuery, [tournamentId, newGroupNumber]);
    let targetGroup = null;
    
    if (groupInfo.length > 0) {
        targetGroup = groupInfo[0];
    } else {
        // Si no existe en tournament_participants, buscar en grupos vacíos
        const emptyGroupQuery = `
            SELECT group_number, tee_time, starting_hole
            FROM empty_tournament_groups 
            WHERE tournament_id = ? AND group_number = ?
            LIMIT 1
        `;
        
        try {
            const [emptyGroupInfo] = await getPool().execute(emptyGroupQuery, [tournamentId, newGroupNumber]);
            if (emptyGroupInfo.length > 0) {
                targetGroup = emptyGroupInfo[0];
                
                // Eliminar el grupo de la tabla de grupos vacíos ya que ahora tendrá un participante
                await getPool().execute(
                    'DELETE FROM empty_tournament_groups WHERE tournament_id = ? AND group_number = ?',
                    [tournamentId, newGroupNumber]
                );
                console.log(`🗑️ Removed empty group ${newGroupNumber} as it now has a participant`);
            }
        } catch (error) {
            console.log('📋 Empty groups table does not exist yet');
        }
    }
    
    if (!targetGroup) {
        console.error(`❌ Target group ${newGroupNumber} does not exist in tournament ${tournamentId}`);
        throw new Error(`Target group ${newGroupNumber} does not exist in tournament ${tournamentId}`);
    }
    console.log(`🎯 Target group info:`, targetGroup);

    // Máximo 4 jugadores por grupo: no permitir mover si el grupo destino ya está lleno
    const [countResult] = await getPool().execute(
        'SELECT COUNT(*) as c FROM tournament_participants WHERE tournament_id = ? AND group_number = ?',
        [tournamentId, newGroupNumber]
    );
    const currentInGroup = Number(countResult?.[0]?.c ?? 0);
    if (currentInGroup >= 4) {
        const [alreadyInGroup] = await getPool().execute(
            'SELECT 1 FROM tournament_participants WHERE tournament_id = ? AND participation_id = ? AND group_number = ? LIMIT 1',
            [tournamentId, participationId, newGroupNumber]
        );
        if (!alreadyInGroup.length) {
            throw new Error(`El grupo ${newGroupNumber} ya tiene 4 jugadores (máximo permitido). Elige otro grupo.`);
        }
    }
    
    // Actualizar el jugador con la información del grupo destino
    const updateQuery = `
        UPDATE tournament_participants 
        SET group_number = ?, 
            tee_time = ?, 
            starting_hole = ?
        WHERE participation_id = ? AND tournament_id = ?
    `;
    
    const [result] = await getPool().execute(updateQuery, [
        newGroupNumber, 
        targetGroup.tee_time, 
        targetGroup.starting_hole,
        participationId, 
        tournamentId
    ]);
    
    if (result.affectedRows > 0) {
        // Log activity
        try {
            await logActivity(
                courseId,
                null,
                'admin',
                'player_moved',
                'tournament',
                tournamentId,
                {
                    message: `Jugador movido al grupo ${newGroupNumber}`,
                    participation_id: participationId,
                    new_group: newGroupNumber,
                    tee_time: targetGroup.tee_time,
                    starting_hole: targetGroup.starting_hole
                },
                null,
                null
            );
        } catch (logError) {
            console.warn('Error logging activity:', logError);
        }
        
        console.log(`✅ Player moved successfully to group ${newGroupNumber} with tee time ${targetGroup.tee_time}`);
        return true;
    }
    
    return false;
}

// Move entire group to a different starting hole
async function moveGroupToHole(courseId, tournamentId, groupNumber, newStartingHole, newTeeTime = null) {
    console.log(`🔄 Moving group ${groupNumber} to hole ${newStartingHole} in tournament ${tournamentId}`, {
        courseId, tournamentId, groupNumber, newStartingHole, newTeeTime
    });

    try {
        // 🎯 VERIFICAR SI HAY SALIDAS SIMULTÁNEAS ACTIVAS (si las columnas existen)
        const simultaneousStartsQuery = `
            SELECT enable_simultaneous_starts, start_time, afternoon_start_time, preferred_session
            FROM tournaments 
            WHERE tournament_id = ?
        `;

        let isSimultaneousStarts = false;
        let tournamentConfig = [];
        try {
            const [cfg] = await getPool().execute(simultaneousStartsQuery, [tournamentId]);
            tournamentConfig = cfg;
            isSimultaneousStarts = tournamentConfig.length > 0 && !!tournamentConfig[0].enable_simultaneous_starts;
        } catch (cfgErr) {
            // Si faltan columnas, desactivar lógica de simultáneas y continuar
            if (cfgErr && cfgErr.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Columns for simultaneous starts not found. Proceeding without simultaneous logic.');
                isSimultaneousStarts = false;
                tournamentConfig = [];
            } else {
                throw cfgErr;
            }
        }

        console.log(`🔍 SALIDAS SIMULTÁNEAS: ${isSimultaneousStarts ? 'ACTIVAS' : 'INACTIVAS'}`);

        let finalTeeTime = newTeeTime;

        // Respetar la hora elegida por el usuario: si newTeeTime viene, NO sobreescribirla.
        // Solo aplicar lógica de salidas simultáneas cuando NO se proporcionó una hora explícita y la config está disponible
        if (isSimultaneousStarts && (newTeeTime === null || newTeeTime === undefined)) {
            // 🚨 EN SALIDAS SIMULTÁNEAS: Determinar la hora base según el hoyo de destino
            const config = tournamentConfig[0] || {};
            const morningTime = config.start_time || '08:00:00';
            const afternoonTime = config.afternoon_start_time || '14:00:00';

            // Verificar qué grupos están en cada sesión para determinar la hora correcta
            const existingGroupsQuery = `
                SELECT starting_hole, tee_time, COUNT(*) as group_count
                FROM tournament_participants 
                WHERE tournament_id = ? AND starting_hole = ? AND tee_time IS NOT NULL
                GROUP BY starting_hole, tee_time
                ORDER BY group_count DESC
                LIMIT 1
            `;

            const [existingGroups] = await getPool().execute(existingGroupsQuery, [tournamentId, newStartingHole]);

            if (existingGroups.length > 0) {
                // Usar la hora que ya tienen otros grupos en ese hoyo
                finalTeeTime = existingGroups[0].tee_time;
                console.log(`⛳ SALIDAS SIMULTÁNEAS: Manteniendo hora ${finalTeeTime} para hoyo ${newStartingHole} (misma que otros grupos)`);
            } else {
                // Si no hay otros grupos en ese hoyo, usar la hora base apropiada
                // Hoyos 1-9 generalmente mañana, 10-18 tarde (o según configuración)
                finalTeeTime = newStartingHole <= 9 ? morningTime : afternoonTime;
                console.log(`⛳ SALIDAS SIMULTÁNEAS: Asignando hora base ${finalTeeTime} para hoyo ${newStartingHole}`);
            }
        }

        // Normalizar hoyo: 0 => NULL (sin asignar)
        const normalizedHole = (newStartingHole === 0 || newStartingHole === '0') ? null : newStartingHole;

        // Actualizar todos los jugadores del grupo con el nuevo hoyo de salida y el tee time corregido
        let updateQuery, params;
        
        if (finalTeeTime !== null && finalTeeTime !== undefined) {
            updateQuery = `
                UPDATE tournament_participants 
                SET starting_hole = ?, tee_time = ?
                WHERE tournament_id = ? AND group_number = ?
            `;
            params = [normalizedHole, finalTeeTime, tournamentId, groupNumber];
        } else {
            // Si newTeeTime es null, limpiar el horario (establecer a NULL)
            updateQuery = `
                UPDATE tournament_participants 
                SET starting_hole = ?, tee_time = NULL
                WHERE tournament_id = ? AND group_number = ?
            `;
            params = [normalizedHole, tournamentId, groupNumber];
        }

        console.log('🎯 SQL Query:', updateQuery);
        console.log('🎯 SQL Params:', params);

        const { rows } = await executeQuery(updateQuery, params);

        // También intentar actualizar grupos vacíos si existen
        try {
            if (finalTeeTime !== null && finalTeeTime !== undefined) {
                await getPool().execute(
                    'UPDATE empty_tournament_groups SET starting_hole = ?, tee_time = ? WHERE tournament_id = ? AND group_number = ?',
                    [normalizedHole, finalTeeTime, tournamentId, groupNumber]
                );
            } else {
                // Si finalTeeTime es null, limpiar el horario
                await getPool().execute(
                    'UPDATE empty_tournament_groups SET starting_hole = ?, tee_time = NULL WHERE tournament_id = ? AND group_number = ?',
                    [normalizedHole, tournamentId, groupNumber]
                );
            }
        } catch (emptyGroupError) {
            // Los grupos vacíos pueden no existir, esto es normal
            console.log('📋 No empty groups to update (this is normal)');
        }

        // Log activity si se actualizó al menos algo (jugadores o grupos vacíos)
        const totalUpdated = rows.affectedRows;
        
        if (totalUpdated > 0) {
            // Log activity
            try {
                await logActivity(
                    courseId,
                    null,
                    'admin',
                    'group_moved',
                    'tournament',
                    tournamentId,
                    {
                        message: `Grupo ${groupNumber} movido al hoyo ${newStartingHole}${newTeeTime ? ` con horario ${newTeeTime}` : ' (sin horario asignado)'}`,
                        group_number: groupNumber,
                        new_starting_hole: newStartingHole,
                        new_tee_time: newTeeTime,
                        affected_players: totalUpdated
                    },
                    null,
                    null
                );
            } catch (logError) {
                console.warn('Error logging activity:', logError);
            }

            console.log(`✅ Group ${groupNumber} moved successfully to hole ${newStartingHole}. Updated ${totalUpdated} players.`);
            return true;
        } else {
            // Posiblemente es un grupo vacío - garantizar persistencia en empty_tournament_groups
            try {
                const pool = getPool();
                // Crear tabla si no existe
                await pool.execute(`
                    CREATE TABLE IF NOT EXISTS empty_tournament_groups (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        tournament_id INT NOT NULL,
                        group_number INT NOT NULL,
                        starting_hole INT DEFAULT 1,
                        tee_time TIME NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_tournament_group (tournament_id, group_number),
                        FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE
                    )
                `);

                // Upsert del grupo vacío con el hoyo y la hora solicitados (normalizedHole: 0 => NULL)
                if (finalTeeTime !== null && finalTeeTime !== undefined) {
                    await pool.execute(
                        'INSERT INTO empty_tournament_groups (tournament_id, group_number, starting_hole, tee_time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE starting_hole = VALUES(starting_hole), tee_time = VALUES(tee_time)',
                        [tournamentId, groupNumber, normalizedHole, finalTeeTime]
                    );
                } else {
                    await pool.execute(
                        'INSERT INTO empty_tournament_groups (tournament_id, group_number, starting_hole) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE starting_hole = VALUES(starting_hole), tee_time = NULL',
                        [tournamentId, groupNumber, normalizedHole]
                    );
                }

                console.log(`✅ Persisted empty group ${groupNumber} to hole ${newStartingHole}${finalTeeTime ? ` with time ${finalTeeTime}` : ''}.`);
                return true;
            } catch (error) {
                console.log(`⚠️ Failed to persist empty group ${groupNumber} in tournament ${tournamentId}:`, error);
                return false;
            }
        }
    } catch (error) {
        console.error('Error moving group to hole:', error);
        return false;
    }
}

// Función para intercambiar números de grupo (reorganización)
async function swapGroupNumbers(courseId, tournamentId, groupNumber1, groupNumber2) {
    console.log(`🔄 Swapping group numbers ${groupNumber1} ↔ ${groupNumber2} in tournament ${tournamentId}`);
    
    try {
        const pool = getPool();
        
        // Usar un número temporal único para evitar conflictos de clave única
        const tempGroupNumber = 99999;
        
        // Preparar todas las queries para la transacción
        const queries = [
            // Paso 1: Mover grupo 1 a número temporal
            {
                query: 'UPDATE tournament_participants SET group_number = ? WHERE tournament_id = ? AND group_number = ?',
                params: [tempGroupNumber, tournamentId, groupNumber1]
            },
            // Paso 2: Mover grupo 2 al número del grupo 1
            {
                query: 'UPDATE tournament_participants SET group_number = ? WHERE tournament_id = ? AND group_number = ?',
                params: [groupNumber1, tournamentId, groupNumber2]
            },
            // Paso 3: Mover grupo temporal al número del grupo 2
            {
                query: 'UPDATE tournament_participants SET group_number = ? WHERE tournament_id = ? AND group_number = ?',
                params: [groupNumber2, tournamentId, tempGroupNumber]
            }
        ];
        
        // Ejecutar la transacción
        await executeTransaction(queries);
        
        // También intentar actualizar grupos vacíos (esto puede fallar y está bien)
        try {
            const emptyGroupQueries = [
                {
                    query: 'UPDATE empty_tournament_groups SET group_number = ? WHERE tournament_id = ? AND group_number = ?',
                    params: [tempGroupNumber, tournamentId, groupNumber1]
                },
                {
                    query: 'UPDATE empty_tournament_groups SET group_number = ? WHERE tournament_id = ? AND group_number = ?',
                    params: [groupNumber1, tournamentId, groupNumber2]
                },
                {
                    query: 'UPDATE empty_tournament_groups SET group_number = ? WHERE tournament_id = ? AND group_number = ?',
                    params: [groupNumber2, tournamentId, tempGroupNumber]
                }
            ];
            
            await executeTransaction(emptyGroupQueries);
        } catch (error) {
            console.log('📋 No empty groups to update (this is normal)');
        }
        
        // Log activity
        try {
            await logActivity(
                courseId,
                null,
                'admin',
                'groups_renumbered',
                'tournament',
                tournamentId,
                {
                    message: `Grupos renumerados: ${groupNumber1} ↔ ${groupNumber2}`,
                    group1: groupNumber1,
                    group2: groupNumber2
                },
                null,
                null
            );
        } catch (logError) {
            console.warn('Error logging activity:', logError);
        }
        
        console.log(`✅ Groups ${groupNumber1} and ${groupNumber2} numbers swapped successfully`);
        return true;
        
    } catch (error) {
        console.error('❌ Error swapping group numbers:', error);
        throw error;
    }
}

// Función para crear un grupo vacío
async function createEmptyGroup(tournamentId, config = {}) {
    console.log('➕ Creating empty group for tournament:', tournamentId)
    console.log('➕ Tournament ID type:', typeof tournamentId)
    
    const pool = getPool();
    console.log('➕ Pool available:', !!pool)
    
    try {
        // Primero, encontrar el siguiente número de grupo disponible
        const [groupNumbers] = await pool.execute(`
            SELECT DISTINCT group_number 
            FROM tournament_participants 
            WHERE tournament_id = ? 
            ORDER BY group_number
        `, [tournamentId])
        
        console.log('📋 Existing group numbers:', groupNumbers)
        
        let nextGroupNumber = 1
        if (groupNumbers && groupNumbers.length > 0) {
            // Encontrar el primer hueco o el siguiente número después del último
            const existingNumbers = groupNumbers.map(row => row.group_number).sort((a, b) => a - b)
            
            for (let i = 0; i < existingNumbers.length; i++) {
                if (existingNumbers[i] !== nextGroupNumber) {
                    break
                }
                nextGroupNumber++
            }
        }
        
        console.log('📋 Next available group number:', nextGroupNumber)
        
        // Crear una tabla temporal para grupos vacíos si no existe
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS empty_tournament_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tournament_id INT NOT NULL,
                group_number INT NOT NULL,
                starting_hole INT DEFAULT 1,
                tee_time TIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_tournament_group (tournament_id, group_number),
                FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE
            )
        `)
        
        // Usar configuración proporcionada o determinar automáticamente
        let assignedHole = config.hole || 1;
        let assignedTime = config.time || null;
        
        console.log(`🎯 Configuration received:`, config);
        console.log(`🎯 Assigned hole ${assignedHole} and time ${assignedTime} to new group ${nextGroupNumber}`);
        
        // Insertar el grupo vacío
        let insertQuery, insertParams;
        if (assignedTime) {
            insertQuery = `
                INSERT INTO empty_tournament_groups (tournament_id, group_number, starting_hole, tee_time) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE starting_hole = VALUES(starting_hole), tee_time = VALUES(tee_time)
            `;
            insertParams = [tournamentId, nextGroupNumber, assignedHole, assignedTime];
        } else {
            insertQuery = `
                INSERT INTO empty_tournament_groups (tournament_id, group_number, starting_hole) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE starting_hole = VALUES(starting_hole)
            `;
            insertParams = [tournamentId, nextGroupNumber, assignedHole];
        }
        
        const [insertResult] = await pool.execute(insertQuery, insertParams)
        
        console.log('📋 Insert result:', insertResult)
        
        console.log(`✅ Empty group ${nextGroupNumber} created successfully`)
        
        return { 
            group_number: nextGroupNumber, 
            participants: [],
            tee_time: assignedTime,
            starting_hole: assignedHole
        }
    } catch (error) {
        console.error('❌ Error creating empty group:', error)
        throw error
    }
}

// Función para eliminar un grupo vacío
async function deleteEmptyGroup(tournamentId, groupNumber) {
    console.log(`🗑️ Deleting empty group ${groupNumber} from tournament ${tournamentId}`);
    
    try {
        const pool = getPool();
        
        // Verificar que el grupo esté vacío
        const [participants] = await pool.execute(
            'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ? AND group_number = ?',
            [tournamentId, groupNumber]
        );
        
        if (participants[0].count > 0) {
            throw new Error('No se puede eliminar un grupo que tiene participantes');
        }
        
        // Eliminar de la tabla de grupos vacíos
        const [result] = await pool.execute(
            'DELETE FROM empty_tournament_groups WHERE tournament_id = ? AND group_number = ?',
            [tournamentId, groupNumber]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('Grupo no encontrado o ya eliminado');
        }
        
        console.log(`✅ Empty group ${groupNumber} deleted successfully`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting empty group:', error);
        throw error;
    }
}

// ================================
// SCORECARD FUNCTIONS
// ================================

/**
 * Save a scorecard for a player in a tournament
 */
async function saveScorecard(clubId, tournamentId, scorecardData) {
    console.log('📝 Saving scorecard:', { clubId, tournamentId, playerData: scorecardData });
    
    try {
        const {
            member_id,
            external_player_id,
            scores,
            entry_method = 'manual',
            verified_card = false,
            original_archived = false,
            entry_notes = '',
            entered_by,
            did_not_present = false
        } = scorecardData;

        // Ensure null instead of undefined for database
        const safeMemberId = member_id || null;
        const safeExternalPlayerId = external_player_id || null;
        const safeEnteredBy = entered_by || null;

        // Validate that either member_id or external_player_id is provided
        if (!safeMemberId && !safeExternalPlayerId) {
            throw new Error('Either member_id or external_player_id must be provided');
        }
        if (safeMemberId && safeExternalPlayerId) {
            throw new Error('Cannot provide both member_id and external_player_id');
        }

        // Calculate totals (si no presentó tarjeta, todos en 0)
        const holes = Object.keys(scores);
        const totalGross = did_not_present ? 0 : Object.values(scores).reduce((sum, score) => sum + score, 0);
        const front9 = did_not_present ? 0 : Object.entries(scores)
            .filter(([hole]) => parseInt(hole) <= 9)
            .reduce((sum, [, score]) => sum + score, 0);
        const back9 = did_not_present ? 0 : Object.entries(scores)
            .filter(([hole]) => parseInt(hole) > 9)
            .reduce((sum, [, score]) => sum + score, 0);

        // Check if scorecard already exists
        const checkQuery = `
            SELECT scorecard_id FROM scorecards 
            WHERE tournament_id = ? AND 
                  (member_id = ? OR external_player_id = ?)
        `;
        
        const existingResult = await executeQuery(checkQuery, [
            tournamentId, safeMemberId, safeExternalPlayerId
        ]);
        
        let insertId;
        
        if (existingResult.rows && existingResult.rows.length > 0) {
            // Update existing scorecard
            insertId = existingResult.rows[0].scorecard_id;
            console.log('🔄 Updating existing scorecard:', insertId);
            
            const updateQuery = `
                UPDATE scorecards SET
                    total_gross = ?, front_nine = ?, back_nine = ?,
                    holes_completed = ?, entry_method = ?, verified_card = ?,
                    original_archived = ?, entry_notes = ?, entered_by = ?,
                    did_not_present = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE scorecard_id = ?
            `;
            
            await executeQuery(updateQuery, [
                totalGross, front9, back9,
                holes.length, entry_method, verified_card,
                original_archived, entry_notes, safeEnteredBy,
                did_not_present,
                insertId
            ]);
            
            // Delete existing hole scores
            await executeQuery('DELETE FROM scorecard_holes WHERE scorecard_id = ?', [insertId]);
            
        } else {
            // Insert new scorecard
            console.log('➕ Creating new scorecard');
            
            const insertQuery = `
                INSERT INTO scorecards (
                    tournament_id, member_id, external_player_id, course_id, 
                    total_gross, front_nine, back_nine,
                    holes_completed, entry_method, verified_card,
                    original_archived, entry_notes, entered_by, did_not_present
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            console.log('🔍 SQL Parameters Debug:', {
                tournamentId, 
                safeMemberId, 
                safeExternalPlayerId, 
                clubId,
                totalGross, 
                front9, 
                back9,
                holesLength: holes.length, 
                entry_method, 
                verified_card,
                original_archived, 
                entry_notes, 
                safeEnteredBy
            });

            const result = await executeQuery(insertQuery, [
                tournamentId, safeMemberId, safeExternalPlayerId, clubId,
                totalGross, front9, back9,
                holes.length, entry_method, verified_card,
                original_archived, entry_notes, safeEnteredBy, did_not_present
            ]);

            console.log('🔍 INSERT Result:', result);
            insertId = result.rows?.insertId || result.insertId;
        }
        
        if (!insertId) {
            throw new Error('No insertId returned from scorecard insert');
        }

        console.log('✅ Scorecard inserted with ID:', insertId);

        // Insert individual hole scores
        const scoreQueries = [];
        for (const [hole, score] of Object.entries(scores)) {
            if (score === undefined || score === null) {
                console.log(`⚠️ Skipping hole ${hole} with undefined/null score`);
                continue;
            }
            scoreQueries.push({
                query: 'INSERT INTO scorecard_holes (scorecard_id, hole_number, strokes) VALUES (?, ?, ?)',
                params: [insertId, parseInt(hole), score]
            });
        }

        if (scoreQueries.length > 0) {
            console.log('🎯 Executing score queries:', scoreQueries);
            await executeTransaction(scoreQueries);
            console.log('✅ Score queries executed successfully');
        } else {
            console.log('❌ No score queries to execute - scores may be empty');
        }

        await logActivity(clubId, safeMemberId || safeExternalPlayerId, 'member', 'scorecard_saved', 'scorecard', insertId, {
            message: `Tarjeta guardada: ${holes.length} hoyos, ${totalGross} golpes`,
            method: entry_method,
            verified: verified_card
        }, null, null);

        console.log('✅ Scorecard saved successfully:', insertId);
        return { scorecard_id: insertId, message: 'Tarjeta guardada exitosamente' };

    } catch (error) {
        console.error('❌ Error saving scorecard:', error);
        throw error;
    }
}

/**
 * Get all scorecards for a tournament
 */
async function getScorecardsByTournament(clubId, tournamentId, includeDidNotPresent = false) {
    console.log('📊 Getting scorecards for tournament:', { clubId, tournamentId, includeDidNotPresent });
    
    const whereClause = includeDidNotPresent 
        ? 'WHERE s.tournament_id = ?' 
        : 'WHERE s.tournament_id = ? AND (s.did_not_present = 0 OR s.did_not_present IS NULL)';
    
    const query = `
        SELECT 
            s.*,
            COALESCE(CONCAT(m.first_name, ' ', m.last_name), ep.full_name) as player_name,
            COALESCE(m.handicap_index, ep.handicap_index) as handicap_index,
            COALESCE(m.handicap_local, ep.handicap_local) as handicap_local,
            COALESCE(m.gender, ep.gender) as gender,
            m.member_number,
            t.tournament_name,
            gc.club_name as club_name,
            tp.player_type
        FROM scorecards s
        LEFT JOIN members m ON s.member_id = m.member_id
        LEFT JOIN external_players ep ON s.external_player_id = ep.external_id
        LEFT JOIN tournaments t ON s.tournament_id = t.tournament_id
        LEFT JOIN clubs gc ON s.course_id = gc.club_id
        LEFT JOIN tournament_participants tp ON tp.tournament_id = s.tournament_id 
            AND ((tp.member_id = s.member_id AND s.member_id IS NOT NULL) 
                OR (tp.external_player_id = s.external_player_id AND s.external_player_id IS NOT NULL))
        ${whereClause}
        ORDER BY s.total_gross ASC, s.created_at DESC
    `;

    const result = await executeQuery(query, [tournamentId]);
    const rows = result.rows || result;
    
    console.log('✅ Found scorecards:', rows.length);
    
    // Get hole scores for each scorecard
    for (const scorecard of rows) {
        const holesQuery = `
            SELECT hole_number, strokes 
            FROM scorecard_holes 
            WHERE scorecard_id = ? 
            ORDER BY hole_number
        `;
        const holesResult = await executeQuery(holesQuery, [scorecard.scorecard_id]);
        const holes = holesResult.rows || holesResult;
        scorecard.hole_scores = holes.reduce((acc, hole) => {
            acc[hole.hole_number] = hole.strokes;
            return acc;
        }, {});
    }

    console.log(`✅ Found ${rows.length} scorecards`);
    return rows;
}

/**
 * Get scorecard for a specific player in a tournament
 */
async function getScorecardByPlayer(clubId, tournamentId, playerId, isExternal = false) {
    console.log('📋 Getting player scorecard:', { clubId, tournamentId, playerId, isExternal });
    
    const query = `
        SELECT 
            s.*,
            COALESCE(m.first_name, ep.first_name) as player_first_name,
            COALESCE(m.last_name, ep.last_name) as player_last_name,
            COALESCE(CONCAT(m.first_name, ' ', m.last_name), CONCAT(ep.first_name, ' ', ep.last_name)) as player_name,
            m.handicap_index
        FROM scorecards s
        LEFT JOIN members m ON s.member_id = m.member_id
        LEFT JOIN external_players ep ON s.external_player_id = ep.external_id
        WHERE s.tournament_id = ? AND s.course_id = ? 
        AND ${isExternal ? 's.external_player_id = ?' : 's.member_id = ?'}
        ORDER BY s.updated_at DESC
        LIMIT 1
    `;

    const result = await executeQuery(query, [tournamentId, clubId, playerId]);
    const rows = result.rows || result;
    
    if (rows.length > 0) {
        const scorecard = rows[0];
        
        // Get hole scores
        const holesQuery = `
            SELECT hole_number, strokes 
            FROM scorecard_holes 
            WHERE scorecard_id = ? 
            ORDER BY hole_number
        `;
        const holesResult = await executeQuery(holesQuery, [scorecard.scorecard_id]);
        const holes = holesResult.rows || holesResult;
        scorecard.hole_scores = holes.reduce((acc, hole) => {
            acc[hole.hole_number] = hole.strokes;
            return acc;
        }, {});

        console.log('✅ Found player scorecard');
        return scorecard;
    }

    console.log('❌ No scorecard found for player');
    return null;
}

/**
 * Update an existing scorecard
 */
async function updateScorecard(clubId, scorecardId, updateData) {
    console.log('📝 Updating scorecard:', { clubId, scorecardId, updateData });
    
    try {
        const { scores, entry_notes, verified_card } = updateData;

        if (scores) {
            // Recalculate totals
            const totalGross = Object.values(scores).reduce((sum, score) => sum + score, 0);
            const front9 = Object.entries(scores)
                .filter(([hole]) => parseInt(hole) <= 9)
                .reduce((sum, [, score]) => sum + score, 0);
            const back9 = Object.entries(scores)
                .filter(([hole]) => parseInt(hole) > 9)
                .reduce((sum, [, score]) => sum + score, 0);

            // Update scorecard
            await executeQuery(`
                UPDATE scorecards 
                SET total_gross = ?, front_nine = ?, back_nine = ?, 
                    holes_completed = ?, entry_notes = ?, verified_card = ?,
                    updated_at = NOW()
                WHERE scorecard_id = ?
            `, [totalGross, front9, back9, Object.keys(scores).length, entry_notes, verified_card, scorecardId]);

            // Delete existing hole scores
            await executeQuery('DELETE FROM scorecard_holes WHERE scorecard_id = ?', [scorecardId]);

            // Insert new hole scores
            const scoreQueries = [];
            for (const [hole, score] of Object.entries(scores)) {
                scoreQueries.push({
                    query: 'INSERT INTO scorecard_holes (scorecard_id, hole_number, strokes) VALUES (?, ?, ?)',
                    params: [scorecardId, parseInt(hole), score]
                });
            }

            if (scoreQueries.length > 0) {
                await executeTransaction(scoreQueries);
            }
        }

        await logActivity(clubId, null, 'admin', 'scorecard_updated', 'scorecard', scorecardId, {
            message: 'Tarjeta actualizada'
        }, null, null);

        console.log('✅ Scorecard updated successfully');
        return { message: 'Tarjeta actualizada exitosamente' };

    } catch (error) {
        console.error('❌ Error updating scorecard:', error);
        throw error;
    }
}

/**
 * Delete a scorecard
 */
async function deleteScorecard(clubId, scorecardId) {
    console.log('🗑️ Deleting scorecard:', { clubId, scorecardId });
    
    try {
        // Delete hole scores first
        await executeQuery('DELETE FROM scorecard_holes WHERE scorecard_id = ?', [scorecardId]);
        
        // Delete scorecard
        await executeQuery('DELETE FROM scorecards WHERE scorecard_id = ?', [scorecardId]);

        await logActivity(clubId, null, 'admin', 'scorecard_deleted', 'scorecard', scorecardId, {
            message: 'Tarjeta eliminada'
        }, null, null);

        console.log('✅ Scorecard deleted successfully');
        return { message: 'Tarjeta eliminada exitosamente' };

    } catch (error) {
        console.error('❌ Error deleting scorecard:', error);
        throw error;
    }
}



/**
 * Get scorecard with all related data for printing
 */
async function getScorecardForPrint(clubId, tournamentId, scorecardId) {
    console.log('🖨️ Getting scorecard for print:', { clubId, tournamentId, scorecardId });
    
    try {
        // Get main scorecard data with player and tournament info
        const mainQuery = `
            SELECT 
                s.*,
                COALESCE(CONCAT(m.first_name, ' ', m.last_name), ep.full_name) as player_name,
                m.member_number,
                COALESCE(m.handicap_index, ep.handicap_index) as handicap_index,
                COALESCE(m.handicap_local, ep.handicap_local) as handicap_local,
                t.tournament_name,
                t.tournament_date
            FROM scorecards s
            LEFT JOIN members m ON s.member_id = m.member_id
            LEFT JOIN external_players ep ON s.external_player_id = ep.external_id
            LEFT JOIN tournaments t ON s.tournament_id = t.tournament_id
            WHERE s.scorecard_id = ? AND s.tournament_id = ?
        `;
        
        const scorecardsResult = await executeQuery(mainQuery, [scorecardId, tournamentId]);
        const scorecards = scorecardsResult.rows || scorecardsResult;
        
        if (scorecards.length === 0) {
            throw new Error('Scorecard not found');
        }
        
        const scorecard = scorecards[0];
        
        // Get hole scores
        const holesQuery = `
            SELECT hole_number, strokes
            FROM scorecard_holes
            WHERE scorecard_id = ?
            ORDER BY hole_number
        `;
        
        const holesResult = await executeQuery(holesQuery, [scorecardId]);
        const holes = holesResult.rows || holesResult;
        console.log('🔍 Found holes in database:', holes);
        
        // Add handicap information per hole (from course setup if available)
        const courseHolesQuery = `
            SELECT hole_number, par, handicap
            FROM course_holes
            WHERE course_id = ?
            ORDER BY hole_number
        `;
        
        let courseHoles = [];
        try {
            const courseHolesResult = await executeQuery(courseHolesQuery, [scorecard.course_id]);
            courseHoles = courseHolesResult.rows || courseHolesResult;
        } catch (error) {
            console.log('No course holes data found, using defaults');
            // If no course holes data, create default par 4 with sequential handicaps
            courseHoles = Array.from({length: 18}, (_, i) => ({
                hole_number: i + 1,
                par: 4,
                handicap: i + 1
            }));
        }
        
        // Merge hole scores with course info
        const holesWithInfo = holes.map(hole => {
            const courseHole = courseHoles.find(ch => ch.hole_number === hole.hole_number) || 
                              { par: 4, handicap: hole.hole_number };
            return {
                hole: hole.hole_number,
                strokes: hole.strokes,
                par: courseHole.par,
                handicap: courseHole.handicap
            };
        });
        
        // Fill missing holes if any
        for (let i = 1; i <= 18; i++) {
            if (!holesWithInfo.find(h => h.hole === i)) {
                const courseHole = courseHoles.find(ch => ch.hole_number === i) || 
                                  { par: 4, handicap: i };
                holesWithInfo.push({
                    hole: i,
                    strokes: 0,
                    par: courseHole.par,
                    handicap: courseHole.handicap
                });
            }
        }
        
        // Sort holes
        holesWithInfo.sort((a, b) => a.hole - b.hole);
        
        scorecard.holes = holesWithInfo;
        
        // Create hole_scores object for frontend compatibility
        scorecard.hole_scores = {};
        holesWithInfo.forEach(hole => {
            scorecard.hole_scores[hole.hole] = hole.strokes;
        });
        
        console.log('✅ Scorecard for print retrieved successfully');
        return scorecard;
        
    } catch (error) {
        console.error('❌ Error getting scorecard for print:', error);
        throw error;
    }
}

// ================================
// MEMBER DETAILS FUNCTIONS
// ================================

/**
 * Get tournaments a member has participated in
 */
async function getMemberTournaments(clubId, memberId) {
    // Obtener torneos con scorecards del miembro
    const query = `
        SELECT DISTINCT
            t.tournament_id,
            t.tournament_name,
            t.tournament_date as start_date,
            t.tournament_date as end_date,
            t.status,
            t.tournament_date as participation_date,
            t.results_mode,
            sc.total_gross,
            sc.total_net,
            sc.did_not_present,
            tp.handicap_used,
            tp.payment_status,
            tp.fee_amount,
            tp.paid_amount,
            m.handicap_local,
            m.handicap_index
        FROM tournaments t
        INNER JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id
        LEFT JOIN scorecards sc ON sc.tournament_id = t.tournament_id AND sc.member_id = tp.member_id
        LEFT JOIN members m ON tp.member_id = m.member_id
        WHERE tp.member_id = ? AND t.course_id = ?
        ORDER BY t.tournament_date DESC
    `;
    
    const { rows: tournaments } = await executeQuery(query, [memberId, clubId]);
    
    // Para cada torneo, calcular la posición por categoría
    for (let tournament of tournaments) {
        if (!tournament.total_gross) {
            tournament.position = null;
            continue;
        }
        
        // Determinar la categoría del jugador según su handicap
        const handicap = tournament.handicap_used || tournament.handicap_local || tournament.handicap_index || 0;
        const hcp = parseFloat(handicap);
        
        let categoryCondition = '';
        if (hcp >= 0 && hcp <= 7.9) {
            categoryCondition = 'BETWEEN 0 AND 7.9';
        } else if (hcp >= 8.0 && hcp <= 17.9) {
            categoryCondition = 'BETWEEN 8.0 AND 17.9';
        } else if (hcp >= 18.0 && hcp <= 36.0) {
            categoryCondition = 'BETWEEN 18.0 AND 36.0';
        } else {
            categoryCondition = 'IS NOT NULL'; // Sin categoría definida
        }
        
        // Calcular posición dentro de su categoría
        const positionQuery = `
            SELECT COUNT(*) + 1 as position
            FROM scorecards sc2
            INNER JOIN tournament_participants tp2 ON sc2.tournament_id = tp2.tournament_id AND sc2.member_id = tp2.member_id
            INNER JOIN members m2 ON tp2.member_id = m2.member_id
            WHERE sc2.tournament_id = ?
            AND COALESCE(tp2.handicap_used, m2.handicap_local, m2.handicap_index, 0) ${categoryCondition}
            AND sc2.total_net < ?
        `;
        
        const { rows: positionResult } = await executeQuery(positionQuery, [
            tournament.tournament_id,
            tournament.total_net || 999
        ]);
        
        tournament.position = positionResult[0]?.position || null;
    }
    
    return tournaments;
}

/**
 * Get scorecards for a member
 */
async function getMemberScorecards(clubId, memberId) {
    const query = `
        SELECT 
            sc.scorecard_id,
            sc.total_gross,
            sc.total_net,
            sc.front_nine,
            sc.back_nine,
            sc.holes_completed,
            sc.created_at as date,
            t.tournament_name,
            t.tournament_date as start_date
        FROM scorecards sc
        INNER JOIN tournaments t ON sc.tournament_id = t.tournament_id
        WHERE sc.member_id = ? AND t.course_id = ?
        ORDER BY sc.created_at DESC
        LIMIT 20
    `;
    
    const { rows } = await executeQuery(query, [memberId, clubId]);
    return rows;
}

/**
 * Get handicap history for a member
 */
async function getMemberHandicapHistory(clubId, memberId) {
    const currentQuery = `
        SELECT 
            handicap_index,
            handicap_local,
            updated_at as date,
            'current' as type
        FROM members 
        WHERE member_id = ? AND course_id = ?
    `;
    
    const scorecardQuery = `
        SELECT DISTINCT
            DATE(sc.created_at) as date,
            t.tournament_name,
            m.handicap_index,
            m.handicap_local
        FROM scorecards sc
        INNER JOIN tournaments t ON sc.tournament_id = t.tournament_id
        INNER JOIN members m ON sc.member_id = m.member_id
        WHERE sc.member_id = ? AND t.course_id = ?
        GROUP BY DATE(sc.created_at), t.tournament_name, m.handicap_index, m.handicap_local
        ORDER BY DATE(sc.created_at) DESC
        LIMIT 10
    `;
    
    try {
        const [currentResult, scorecardResult] = await Promise.all([
            executeQuery(currentQuery, [memberId, clubId]),
            executeQuery(scorecardQuery, [memberId, clubId])
        ]);
        
        return [...currentResult.rows, ...scorecardResult.rows];
    } catch (error) {
        console.error('❌ Error getting member handicap history:', error);
        return [];
    }
}

// ================================
// CUSTODIAN ACCOUNTS FUNCTIONS
// ================================

/**
 * Get all accounts for a club
 * @param {number} clubId - Club ID
 * @param {boolean} includeInactive - If true, includes inactive (closed) accounts
 */
async function getAccounts(clubId, includeInactive = false) {
    try {
        let query = `
            SELECT 
                account_id,
                account_name,
                description,
                current_balance_ars,
                current_balance_usd,
                is_active,
                created_at
            FROM custodian_accounts
            WHERE club_id = ?
        `;
        
        const params = [clubId];
        
        if (!includeInactive) {
            query += ` AND is_active = TRUE`;
        }
        
        query += ` ORDER BY is_active DESC, account_name`;
        
        const { rows } = await executeQuery(query, params);
        return rows;
    } catch (error) {
        console.error('❌ Error getting accounts:', error);
        throw error;
    }
}

/**
 * Create new account
 */
async function createAccount(clubId, accountData) {
    try {
        const query = `
            INSERT INTO custodian_accounts (
                club_id, account_name, description, 
                current_balance_ars, current_balance_usd
            ) VALUES (?, ?, ?, 0, 0)
        `;
        const { rows } = await executeQuery(query, [
            clubId,
            accountData.account_name,
            accountData.description || null
        ]);
        return { account_id: rows.insertId };
    } catch (error) {
        console.error('❌ Error creating account:', error);
        throw error;
    }
}

/**
 * Update account
 */
async function updateAccount(clubId, accountId, accountData) {
    try {
        const query = `
            UPDATE custodian_accounts 
            SET account_name = ?, description = ?
            WHERE club_id = ? AND account_id = ?
        `;
        await executeQuery(query, [
            accountData.account_name,
            accountData.description || null,
            clubId,
            accountId
        ]);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating account:', error);
        throw error;
    }
}

/**
 * Delete (deactivate) account
 */
async function deleteAccount(clubId, accountId) {
    try {
        const query = `
            UPDATE custodian_accounts 
            SET is_active = FALSE
            WHERE club_id = ? AND account_id = ?
        `;
        await executeQuery(query, [clubId, accountId]);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting account:', error);
        throw error;
    }
}

/**
 * Update account balance
 */
async function updateAccountBalance(accountId, amount, currency, operation = 'add') {
    try {
        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum < 0) {
            throw new Error(`Monto inválido para actualizar saldo: ${amount}`);
        }
        const field = currency === 'USD' ? 'current_balance_usd' : 'current_balance_ars';
        const operator = operation === 'add' ? '+' : '-';
        
        const query = `
            UPDATE custodian_accounts 
            SET ${field} = ${field} ${operator} ?
            WHERE account_id = ?
        `;
        await executeQuery(query, [amountNum, accountId]);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating account balance:', error);
        throw error;
    }
}

// ================================
// ACCOUNT TRANSACTIONS FUNCTIONS
// ================================

/**
 * Get all transactions for a club
 */
async function getTransactions(clubId, fromDate, toDate) {
    try {
        let query = `
            SELECT 
                t.transaction_id,
                t.transaction_date,
                t.transaction_type,
                t.amount,
                t.currency,
                NULL as to_amount,
                NULL as to_currency,
                t.description,
                t.reference_type,
                t.reference_id,
                t.created_at,
                t.from_account_id,
                t.to_account_id,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name,
                -- Información adicional según el tipo de transacción
                -- Primero intenta con reference_type y reference_id, luego busca por coincidencia
                COALESCE(
                    CASE WHEN t.reference_type = 'other_income' THEN oi1.member_id END,
                    CASE WHEN t.transaction_type = 'income_other' AND t.to_account_id = oi2_ranked.account_id 
                         AND t.transaction_date = oi2_ranked.income_date AND t.amount = oi2_ranked.amount 
                         AND t.currency = oi2_ranked.currency THEN oi2_ranked.member_id END
                ) as member_id,
                COALESCE(
                    CASE WHEN t.reference_type = 'other_income' THEN CONCAT(m1.first_name, ' ', m1.last_name) END,
                    CASE WHEN t.transaction_type = 'income_other' AND t.to_account_id = oi2_ranked.account_id 
                         AND t.transaction_date = oi2_ranked.income_date AND t.amount = oi2_ranked.amount 
                         AND t.currency = oi2_ranked.currency THEN CONCAT(m2.first_name, ' ', m2.last_name) END
                ) as member_name,
                COALESCE(
                    CASE WHEN t.reference_type = 'other_income' THEN oi1.payment_type END,
                    CASE WHEN t.reference_type = 'expense' THEN e1.receipt_number END,
                    CASE WHEN t.transaction_type = 'income_other' AND t.to_account_id = oi2_ranked.account_id 
                         AND t.transaction_date = oi2_ranked.income_date AND t.amount = oi2_ranked.amount 
                         AND t.currency = oi2_ranked.currency THEN oi2_ranked.payment_type END,
                    CASE WHEN t.transaction_type = 'expense' AND t.from_account_id = e2.account_id 
                         AND t.transaction_date = e2.expense_date AND t.amount = e2.amount 
                         AND t.currency = e2.currency THEN e2.receipt_number END
                ) as additional_info,
                COALESCE(
                    CASE WHEN t.reference_type = 'other_income' THEN oi1.custodian END,
                    CASE WHEN t.reference_type = 'expense' THEN e1.custodian END,
                    CASE WHEN t.transaction_type = 'income_other' AND t.to_account_id = oi2_ranked.account_id 
                         AND t.transaction_date = oi2_ranked.income_date AND t.amount = oi2_ranked.amount 
                         AND t.currency = oi2_ranked.currency THEN oi2_ranked.custodian END,
                    CASE WHEN t.transaction_type = 'expense' AND t.from_account_id = e2.account_id 
                         AND t.transaction_date = e2.expense_date AND t.amount = e2.amount 
                         AND t.currency = e2.currency THEN e2.custodian END
                ) as custodian
            FROM account_transactions t
            LEFT JOIN custodian_accounts fa ON t.from_account_id = fa.account_id
            LEFT JOIN custodian_accounts ta ON t.to_account_id = ta.account_id
            -- JOINs con reference_type y reference_id
            LEFT JOIN other_incomes oi1 ON t.reference_type = 'other_income' AND t.reference_id = oi1.income_id AND oi1.club_id = t.club_id
            LEFT JOIN members m1 ON oi1.member_id = m1.member_id
            LEFT JOIN club_expenses e1 ON t.reference_type = 'expense' AND t.reference_id = e1.expense_id AND e1.club_id = t.club_id
            -- JOINs por coincidencia (para transacciones antiguas sin reference_type)
            -- Usar subquery para obtener solo el primer other_income que coincida (evitar duplicados)
            LEFT JOIN (
                SELECT 
                    oi.income_id,
                    oi.member_id,
                    oi.account_id,
                    oi.income_date,
                    oi.amount,
                    oi.currency,
                    oi.payment_type,
                    oi.custodian
                FROM other_incomes oi
                INNER JOIN (
                    SELECT account_id, income_date, amount, currency, MIN(income_id) as min_income_id
                    FROM other_incomes
                    GROUP BY account_id, income_date, amount, currency
                ) oi_min ON oi.income_id = oi_min.min_income_id
            ) oi2_ranked ON t.transaction_type = 'income_other' 
                AND t.to_account_id = oi2_ranked.account_id 
                AND t.transaction_date = oi2_ranked.income_date 
                AND t.amount = oi2_ranked.amount 
                AND t.currency = oi2_ranked.currency
                AND (t.reference_type IS NULL OR t.reference_type != 'other_income' OR t.reference_id != oi2_ranked.income_id)
            LEFT JOIN members m2 ON oi2_ranked.member_id = m2.member_id
            LEFT JOIN club_expenses e2 ON t.transaction_type = 'expense' 
                AND t.from_account_id = e2.account_id 
                AND t.transaction_date = e2.expense_date 
                AND t.amount = e2.amount 
                AND t.currency = e2.currency
                AND (t.reference_type IS NULL OR t.reference_type != 'expense' OR t.reference_id != e2.expense_id)
            WHERE t.club_id = ?
            -- Excluir transacciones huérfanas (que tienen reference_type pero el registro referenciado no existe)
            -- Las transferencias no tienen reference_type, así que siempre se incluyen
            -- Las transacciones de torneos (tournament_payment) siempre se incluyen
            AND (
                t.reference_type IS NULL 
                OR t.transaction_type = 'transfer'
                OR t.reference_type = 'tournament_payment'
                OR t.reference_type = 'tournament_payment_reversal'
                OR t.reference_type = 'tournament_payment_adjustment'
                OR (t.reference_type = 'other_income' AND EXISTS (SELECT 1 FROM other_incomes oi WHERE oi.income_id = t.reference_id AND oi.club_id = t.club_id))
                OR (t.reference_type = 'expense' AND EXISTS (SELECT 1 FROM club_expenses e WHERE e.expense_id = t.reference_id AND e.club_id = t.club_id))
            )
        `;
        
        const params = [clubId];
        
        if (fromDate) {
            query += ` AND t.transaction_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND t.transaction_date <= ?`;
            params.push(toDate);
        }
        
        // UNION con conversiones de moneda
        query += `
            UNION ALL
            SELECT 
                CONCAT('EX', ce.exchange_id) as transaction_id,
                ce.exchange_date as transaction_date,
                'exchange' as transaction_type,
                ce.from_amount as amount,
                ce.from_currency as currency,
                ce.to_amount as to_amount,
                ce.to_currency as to_currency,
                CONCAT(ce.from_amount, ' ', ce.from_currency, ' → ', ce.to_amount, ' ', ce.to_currency, IF(ce.notes IS NOT NULL, CONCAT(' (', ce.notes, ')'), '')) as description,
                'currency_exchange' as reference_type,
                ce.exchange_id as reference_id,
                ce.created_at,
                ce.from_account_id,
                ce.to_account_id,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name,
                NULL as member_id,
                NULL as member_name,
                CONCAT('Tasa: ', ce.exchange_rate) as additional_info,
                NULL as custodian
            FROM currency_exchanges ce
            LEFT JOIN custodian_accounts fa ON ce.from_account_id = fa.account_id
            LEFT JOIN custodian_accounts ta ON ce.to_account_id = ta.account_id
            WHERE ce.club_id = ?
        `;
        
        params.push(clubId);
        
        if (fromDate) {
            query += ` AND ce.exchange_date >= ?`;
            params.push(fromDate);
        }
        
        if (toDate) {
            query += ` AND ce.exchange_date <= ?`;
            params.push(toDate);
        }
        
        query += ` ORDER BY transaction_date DESC, created_at DESC`;
        
        const { rows } = await executeQuery(query, params);
        
        // Debug: log todas las transacciones para verificar tipos
        const transactionTypes = rows.reduce((acc, r) => {
            acc[r.transaction_type] = (acc[r.transaction_type] || 0) + 1;
            return acc;
        }, {});
        console.log(`📊 getTransactions para club ${clubId}:`, {
            total: rows.length,
            tipos: transactionTypes,
            fromDate,
            toDate
        });
        
        // Debug específico para transacciones de torneos
        const tournamentTransactions = rows.filter(r => r.transaction_type === 'income_tournament');
        if (tournamentTransactions.length > 0) {
            console.log(`🏆 getTransactions: Se encontraron ${tournamentTransactions.length} transacciones de torneos`);
            const totalARS = tournamentTransactions
                .filter(t => (t.currency || 'ARS') === 'ARS')
                .reduce((sum, t) => sum + Number(t.amount || 0), 0);
            console.log(`   Total ARS en transacciones de torneos: ${totalARS}`);
        } else {
            console.log(`⚠️  getTransactions: NO se encontraron transacciones de torneos para club ${clubId}`);
        }
        
        // Debug: log transferencias para verificar que se están obteniendo
        const transfers = rows.filter(r => r.transaction_type === 'transfer');
        if (transfers.length > 0) {
            console.log(`📊 getTransactions: Se encontraron ${transfers.length} transferencias para club ${clubId}`);
            transfers.forEach(t => {
                console.log(`  - ID: ${t.transaction_id}, Fecha: ${t.transaction_date}, Desde: "${t.from_account_name || 'N/A'}", Hacia: "${t.to_account_name || 'N/A'}", Monto: ${t.amount} ${t.currency}`);
            });
        } else {
            console.log(`⚠️ getTransactions: NO se encontraron transferencias para club ${clubId}. Total transacciones: ${rows.length}`);
        }
        
        // Eliminar duplicados basados en transaction_id (puede haber duplicados por los JOINs)
        const seen = new Set();
        const uniqueRows = rows.filter(row => {
            const key = `${row.transaction_id}_${row.transaction_date}_${row.amount}_${row.currency}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        
        return uniqueRows;
    } catch (error) {
        console.error('❌ Error getting transactions:', error);
        throw error;
    }
}

/**
 * Create transaction and update account balances
 */
async function createTransaction(clubId, transactionData) {
    try {
        // Validate funds for transfers
        if (transactionData.transaction_type === 'transfer') {
            if (!transactionData.from_account_id) {
                throw new Error('Debe seleccionar la cuenta de origen');
            }
            if (!transactionData.to_account_id) {
                throw new Error('Debe seleccionar la cuenta de destino');
            }
            if (transactionData.from_account_id === transactionData.to_account_id) {
                throw new Error('Las cuentas de origen y destino deben ser diferentes');
            }
            
            // Validate that source account exists
            const fromAccountQuery = `SELECT current_balance_ars, current_balance_usd FROM custodian_accounts WHERE account_id = ? AND club_id = ?`;
            const { rows: fromAccountRows } = await executeQuery(fromAccountQuery, [transactionData.from_account_id, clubId]);
            
            if (fromAccountRows.length === 0) {
                throw new Error('Cuenta de origen no encontrada');
            }
            
            // Validate that destination account exists
            const toAccountQuery = `SELECT account_id FROM custodian_accounts WHERE account_id = ? AND club_id = ?`;
            const { rows: toAccountRows } = await executeQuery(toAccountQuery, [transactionData.to_account_id, clubId]);
            
            if (toAccountRows.length === 0) {
                throw new Error('Cuenta de destino no encontrada');
            }
            
            // Validate that there are sufficient funds in the source account
            const fromAccount = fromAccountRows[0];
            const currency = transactionData.currency || 'ARS';
            const availableAmount = Number(currency === 'USD' ? fromAccount.current_balance_usd : fromAccount.current_balance_ars) || 0;
            const amountNum = Number(transactionData.amount) || 0;
            
            if (availableAmount < amountNum) {
                throw new Error(`Fondos insuficientes en la cuenta de origen. Disponible: ${availableAmount.toFixed(2)} ${currency}, Requerido: ${amountNum.toFixed(2)} ${currency}`);
            }
        }
        
        // Insert transaction
        const query = `
            INSERT INTO account_transactions (
                club_id, transaction_type, transaction_date,
                from_account_id, to_account_id, amount, currency,
                description, reference_type, reference_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const { rows } = await executeQuery(query, [
            clubId,
            transactionData.transaction_type,
            transactionData.transaction_date,
            transactionData.from_account_id || null,
            transactionData.to_account_id || null,
            transactionData.amount,
            transactionData.currency || 'ARS',
            transactionData.description || null,
            transactionData.reference_type || null,
            transactionData.reference_id || null,
            transactionData.created_by || null
        ]);
        
        // Update account balances
        if (transactionData.transaction_type === 'transfer') {
            // Subtract from source
            if (transactionData.from_account_id) {
                await updateAccountBalance(
                    transactionData.from_account_id,
                    transactionData.amount,
                    transactionData.currency,
                    'subtract'
                );
            }
            // Add to destination
            if (transactionData.to_account_id) {
                await updateAccountBalance(
                    transactionData.to_account_id,
                    transactionData.amount,
                    transactionData.currency,
                    'add'
                );
            }
        } else if (transactionData.transaction_type === 'expense') {
            // Subtract from account
            if (transactionData.from_account_id) {
                await updateAccountBalance(
                    transactionData.from_account_id,
                    transactionData.amount,
                    transactionData.currency,
                    'subtract'
                );
            }
        } else {
            // Income - add to account
            if (transactionData.to_account_id) {
                await updateAccountBalance(
                    transactionData.to_account_id,
                    transactionData.amount,
                    transactionData.currency,
                    'add'
                );
            }
        }
        
        return { transaction_id: rows.insertId };
    } catch (error) {
        console.error('❌ Error creating transaction:', error);
        throw error;
    }
}

/**
 * Get account balance breakdown (for debugging)
 */
async function getAccountBalanceBreakdown(clubId, accountName) {
    try {
        console.log(`🔍 getAccountBalanceBreakdown: clubId=${clubId}, accountName="${accountName}"`);
        // Primero obtener el account_id
        const accountQuery = `SELECT account_id, account_name, current_balance_ars, current_balance_usd FROM custodian_accounts WHERE club_id = ? AND account_name = ?`;
        const { rows: accountRows } = await executeQuery(accountQuery, [clubId, accountName]);
        
        console.log(`🔍 Account rows encontradas: ${accountRows.length}`);
        
        if (accountRows.length === 0) {
            throw new Error(`Cuenta "${accountName}" no encontrada`);
        }
        
        const account = accountRows[0];
        const accountId = account.account_id;
        
        // Obtener todas las transacciones relacionadas con esta cuenta
        const transactionsQuery = `
            SELECT 
                t.transaction_id,
                t.transaction_type,
                t.transaction_date,
                t.amount,
                t.currency,
                t.from_account_id,
                t.to_account_id,
                t.description,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name
            FROM account_transactions t
            LEFT JOIN custodian_accounts fa ON t.from_account_id = fa.account_id
            LEFT JOIN custodian_accounts ta ON t.to_account_id = ta.account_id
            WHERE t.club_id = ?
            AND (t.from_account_id = ? OR t.to_account_id = ?)
            ORDER BY t.transaction_date DESC, t.created_at DESC
        `;
        
        const { rows: transactions } = await executeQuery(transactionsQuery, [clubId, accountId, accountId]);
        
        // Obtener conversiones de moneda
        const exchangesQuery = `
            SELECT 
                ce.exchange_id,
                ce.exchange_date,
                ce.from_amount,
                ce.from_currency,
                ce.to_amount,
                ce.to_currency,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name
            FROM currency_exchanges ce
            LEFT JOIN custodian_accounts fa ON ce.from_account_id = fa.account_id
            LEFT JOIN custodian_accounts ta ON ce.to_account_id = ta.account_id
            WHERE ce.club_id = ?
            AND (ce.from_account_id = ? OR ce.to_account_id = ?)
            ORDER BY ce.exchange_date DESC
        `;
        
        const { rows: exchanges } = await executeQuery(exchangesQuery, [clubId, accountId, accountId]);
        
        // Calcular desglose USD
        let totalIngresosUSD = 0;
        let totalEgresosUSD = 0;
        const ingresosUSD = [];
        const egresosUSD = [];
        
        // Procesar transacciones
        transactions.forEach(tx => {
            if (tx.currency === 'USD') {
                if (tx.to_account_id === accountId) {
                    // Ingreso
                    totalIngresosUSD += Number(tx.amount);
                    ingresosUSD.push({
                        fecha: tx.transaction_date,
                        tipo: tx.transaction_type,
                        monto: Number(tx.amount),
                        descripcion: tx.description || `${tx.transaction_type} desde ${tx.from_account_name || 'N/A'}`
                    });
                } else if (tx.from_account_id === accountId) {
                    // Egreso
                    totalEgresosUSD += Number(tx.amount);
                    egresosUSD.push({
                        fecha: tx.transaction_date,
                        tipo: tx.transaction_type,
                        monto: Number(tx.amount),
                        descripcion: tx.description || `${tx.transaction_type} hacia ${tx.to_account_name || 'N/A'}`
                    });
                }
            }
        });
        
        // Procesar conversiones
        exchanges.forEach(ex => {
            if (ex.to_account_id === accountId && ex.to_currency === 'USD') {
                // Ingreso USD por conversión
                totalIngresosUSD += Number(ex.to_amount);
                ingresosUSD.push({
                    fecha: ex.exchange_date,
                    tipo: 'exchange',
                    monto: Number(ex.to_amount),
                    descripcion: `Conversión: ${ex.from_amount} ${ex.from_currency} → ${ex.to_amount} ${ex.to_currency} desde ${ex.from_account_name || 'N/A'}`
                });
            } else if (ex.from_account_id === accountId && ex.from_currency === 'USD') {
                // Egreso USD por conversión
                totalEgresosUSD += Number(ex.from_amount);
                egresosUSD.push({
                    fecha: ex.exchange_date,
                    tipo: 'exchange',
                    monto: Number(ex.from_amount),
                    descripcion: `Conversión: ${ex.from_amount} ${ex.from_currency} → ${ex.to_amount} ${ex.to_currency} hacia ${ex.to_account_name || 'N/A'}`
                });
            }
        });
        
        const balanceCalculado = totalIngresosUSD - totalEgresosUSD;
        const balanceReal = Number(account.current_balance_usd || 0);
        const diferencia = balanceReal - balanceCalculado;
        
        console.log(`💰 Balance breakdown para ${account.account_name}:`, {
            balanceRealUSD: balanceReal,
            balanceCalculadoUSD: balanceCalculado,
            diferenciaUSD: diferencia,
            totalIngresosUSD,
            totalEgresosUSD,
            totalTransacciones: transactions.length,
            totalConversiones: exchanges.length,
            ingresosCount: ingresosUSD.length,
            egresosCount: egresosUSD.length
        });
        
        return {
            cuenta: account.account_name,
            account_id: accountId,
            balanceRealUSD: balanceReal,
            balanceCalculadoUSD: balanceCalculado,
            diferenciaUSD: diferencia,
            totalIngresosUSD,
            totalEgresosUSD,
            ingresosUSD: ingresosUSD.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
            egresosUSD: egresosUSD.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
            totalTransacciones: transactions.length,
            totalConversiones: exchanges.length
        };
    } catch (error) {
        console.error('❌ Error getting account balance breakdown:', error);
        throw error;
    }
}

// ================================
// SYSTEM FUNCTIONS  
// ================================

// Export all functions
export {
    // Club functions
    getAllClubs, getClubById, createClub, updateClub, deleteClub,
    
    // Administrator functions  
    getAllAdministrators, authenticateAdmin,
    getClubUsers, createClubUser, updateUserInfo, updateUserPermissions, deleteClubUser,
    
    // Member functions
    getAllMembers, getMemberById, createMember, updateMember, deleteMember, updateMemberStatus,
    verifyMemberPhone, verifyMemberByMatricula, verifyReportToken,
    getTournamentForPublicInscription, getTournamentForPublicInscriptionUnfiltered, getTournamentGroupsForInscription, getTournamentParticipantsWithoutGroup, addPublicInscription, checkPublicInscriptionStatus,
    
    // Tournament functions
    getAllTournaments, getTournamentById, createTournament, updateTournament, deleteTournament,
    getTournamentParticipants, getTournamentParticipantsById, addTournamentParticipant, removeTournamentParticipant,
    updateParticipantHandicap,
    updateParticipantStatus, updateParticipantPayment, getTournamentStats, searchPlayersForTournament, findDuplicateExternalPlayers, createExternalPlayer, updateExternalPlayer, getExternalPlayers, deleteExternalPlayer,
    
    // Tournament groups functions
    getTournamentGroups, generateTournamentGroups, assignTeeTimesToGroups, rebalanceGroupsByHcp, movePlayerToGroup, moveGroupToHole, swapGroupNumbers, createEmptyGroup, deleteEmptyGroup,
    
    // Scorecard functions
    saveScorecard, getScorecardsByTournament, getScorecardByPlayer, updateScorecard, deleteScorecard, getScorecardForPrint,
    
    // Member details functions
    getMemberTournaments, getMemberScorecards, getMemberHandicapHistory, getMemberContributions,
    
    // Rankings functions
    getAnnualRankings, getTournamentRanking,
    
    // Payments and accounting functions
    getPaymentsSummary, getExpenses, addExpense, updateExpense, deleteExpense,
    getOtherIncomes, addOtherIncome, updateOtherIncome, deleteOtherIncome,
    getCurrencyExchanges, addCurrencyExchange, updateCurrencyExchange, deleteCurrencyExchange,
    getCurrencyBalance, getCustodians,
    
    // Custodian accounts functions
    getAccounts, createAccount, updateAccount, deleteAccount, getTransactions, createTransaction, getAccountBalanceBreakdown,
    
    // Course holes functions
    createCourseHolesTable, getCourseHoles, updateCourseHole, updateMultipleCourseHoles, getCourseStatistics,
    
    // Course tees functions
    getCourseTees, getHoleTees, createTee, updateTee, deleteTee, getCourseTeesGroupedByHole,
    
    // System functions
    migrateMembersTable, migrateExternalPlayersTable, getSystemStats, getRecentActivity, logActivity
};

// Database functions for TeeTracker Pro
import { executeQuery, executeTransaction, getPool } from '../config/database.js';
import crypto from 'crypto';

// ================================
// CLUBS (GOLF COURSES) FUNCTIONS
// ================================

/**
 * Get all clubs
 */
async function getAllClubs() {
    const query = `
        SELECT 
            c.*,
            COUNT(DISTINCT m.member_id) as total_members,
            COUNT(DISTINCT t.tournament_id) as total_tournaments,
            COUNT(DISTINCT ca.admin_id) as administrators
        FROM golf_courses c
        LEFT JOIN members m ON c.course_id = m.course_id AND m.is_active = true
        LEFT JOIN tournaments t ON c.course_id = t.course_id
        LEFT JOIN club_administrators ca ON c.course_id = ca.course_id
        WHERE c.is_active = true
        GROUP BY c.course_id
        ORDER BY c.course_name
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
            c.*,
            COUNT(DISTINCT m.member_id) as total_members,
            COUNT(t.tournament_id) as total_tournaments
        FROM golf_courses c
        LEFT JOIN members m ON c.course_id = m.course_id AND m.is_active = true
        LEFT JOIN tournaments t ON c.course_id = t.course_id
        WHERE c.course_id = ? AND c.is_active = true
        GROUP BY c.course_id
    `;
    
    const { rows } = await executeQuery(query, [clubId]);
    return rows[0] || null;
}

/**
 * Get club by code
 */
async function getClubByCode(clubCode) {
    const query = `
        SELECT * FROM golf_courses 
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
                INSERT INTO golf_courses (
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
                UPDATE golf_courses SET
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
        UPDATE golf_courses SET 
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
            gc.course_name as club_name,
            gc.club_code
        FROM club_administrators ca
        LEFT JOIN golf_courses gc ON ca.course_id = gc.course_id
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
            gc.course_name as club_name,
            gc.club_code
        FROM club_administrators ca
        LEFT JOIN golf_courses gc ON ca.course_id = gc.course_id
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
            gc.course_name as club_name,
            gc.club_code
        FROM club_administrators ca
        LEFT JOIN golf_courses gc ON ca.course_id = gc.course_id
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
        return null;
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
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
                    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
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
            JOIN golf_courses c ON h.course_id = c.course_id
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
        const getClubs = `SELECT course_id, course_name FROM golf_courses WHERE is_active = true`;
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

/**
 * Get system statistics
 */
async function getSystemStats() {
    const queries = [
        'SELECT COUNT(*) as total_clubs FROM golf_courses WHERE is_active = true',
        'SELECT COUNT(*) as total_members FROM members WHERE is_active = true',
        'SELECT COUNT(*) as total_tournaments FROM tournaments',
        'SELECT COUNT(*) as total_administrators FROM club_administrators WHERE is_active = true'
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
    
    const { rows } = await executeQuery(query, params);
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
               gc.course_name,
               COALESCE(COUNT(DISTINCT tp.participation_id), 0) as current_participants,
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
        LEFT JOIN golf_courses gc ON t.course_id = gc.course_id
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
               gc.course_name,
               COALESCE(COUNT(tp.participation_id), 0) as current_participants
        FROM tournaments t
        LEFT JOIN golf_courses gc ON t.course_id = gc.course_id
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
            prize_pool, description, rules, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
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
        tournamentData.prize_pool || 0,
        tournamentData.description || null,
        tournamentData.rules || null,
        tournamentData.created_by || null
    ];
    const { rows } = await executeQuery(query, params);
    
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
    
    return { tournament_id: rows.insertId, ...tournamentData, course_id: courseId };
}

async function updateTournament(courseId, tournamentId, tournamentData) {
    const query = `
        UPDATE tournaments SET
            tournament_name = ?, tournament_date = ?, start_time = ?, end_time = ?,
            tournament_type = ?, max_participants = ?, registration_deadline = ?,
            entry_fee = ?, prize_pool = ?, description = ?, rules = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE course_id = ? AND tournament_id = ?
    `;
    const params = [
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
        tournamentData.rules || null,
        courseId,
        tournamentId
    ];
    
    const { rows } = await executeQuery(query, params);
    
    if (rows.affectedRows > 0) {
        await logActivity('tournament_updated', courseId, null, 
                         `Torneo actualizado`);
        return await getTournamentById(courseId, tournamentId);
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
                       gc.course_name
               END as player_club,
               tp.player_type
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        LEFT JOIN golf_courses gc ON m.course_id = gc.course_id
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
                       gc.course_name
               END as player_club,
               tp.player_type
        FROM tournament_participants tp
        LEFT JOIN members m ON tp.member_id = m.member_id AND tp.player_type IN ('member', 'visitor')
        LEFT JOIN external_players ep ON tp.external_player_id = ep.external_id AND tp.player_type = 'external'
        LEFT JOIN golf_courses gc ON m.course_id = gc.course_id
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
            gc.course_name as player_club,
            CASE WHEN m.course_id = ? THEN 'member' ELSE 'visitor' END as player_type,
            m.course_id = ? as is_home_member
        FROM members m
        LEFT JOIN golf_courses gc ON m.course_id = gc.course_id
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

// Placeholder functions for tournament groups and participants
async function addTournamentParticipant(courseId, tournamentId, participantData) {
    console.log('🎯 Adding participant:', {
        courseId, 
        tournamentId, 
        participantData
    });
    
    // Determinar si es miembro del club o visitante de otro club
    const isVisitor = participantData.player_type === 'visitor' && participantData.player_id;
    const isExternalPlayer = participantData.player_type === 'external' && participantData.external_player_id;
    const isHomeMember = participantData.player_type === 'member' && participantData.member_id;
    
    let query, params;
    
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
                tournament_id, member_id, handicap_used, player_type, status, payment_status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
            tournamentId,
            participantData.player_id,
            currentHandicap,
            'visitor',
            participantData.status || 'registered',
            participantData.payment_status || 'pending',
            participantData.notes || null
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
                handicap_used, player_club, player_type, status, payment_status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            participantData.notes || null
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
                tournament_id, member_id, handicap_used, player_type, status, payment_status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
            tournamentId,
            participantData.member_id,
            currentHandicap,
            'member',
            participantData.status || 'registered',
            participantData.payment_status || 'pending',
            participantData.notes || null
        ];
        
    } else {
        throw new Error(`Tipo de participante no válido: ${JSON.stringify(participantData)}`);
    }
    
    console.log('🎯 Insert params:', params);
    
    const { rows } = await executeQuery(query, params);
    console.log('✅ Participant added successfully, insertId:', rows.insertId);
    
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
                `Participante eliminado del torneo`,
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
            full_name, email, phone, handicap_index, handicap_local, member_number, home_club, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            phone = VALUES(phone),
            handicap_index = VALUES(handicap_index),
            handicap_local = VALUES(handicap_local),
            member_number = VALUES(member_number),
            home_club = VALUES(home_club),
            notes = VALUES(notes),
            updated_at = CURRENT_TIMESTAMP
    `;
    
    const params = [
        playerData.full_name,
        playerData.email || null,
        playerData.phone || null,
        playerData.handicap_index || 0,
        playerData.handicap_local || 0,
        playerData.member_number || null,
        playerData.home_club || null,
        playerData.notes || null
    ];
    
    const { rows } = await executeQuery(query, params);
    return { external_id: rows.insertId, ...playerData };
}

async function getExternalPlayers(clubId) {
    // Para funcionalidad multi-club: mostrar socios de OTROS clubes como "jugadores disponibles"
    const query = `
        SELECT 
            m.member_id as player_id,
            CONCAT(m.first_name, ' ', m.last_name) as player_name,
            m.email as player_email,
            m.phone as player_phone,
            m.handicap_index,
            m.handicap_local,
            m.member_number,
            gc.course_name as player_club,
            'visitor' as player_type,
            m.created_at,
            m.updated_at
        FROM members m
        JOIN golf_courses gc ON m.course_id = gc.course_id
        WHERE m.course_id != ? AND m.is_active = true
        ORDER BY gc.course_name, m.first_name, m.last_name
    `;
    
    const { rows } = await executeQuery(query, [clubId]);
    return rows;
}

async function updateExternalPlayer(playerId, playerData) {
    const query = `
        UPDATE external_players 
        SET full_name = ?, 
            email = ?, 
            phone = ?, 
            handicap_index = ?, 
            handicap_local = ?, 
            member_number = ?, 
            home_club = ?, 
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE external_id = ?
    `;
    
    const params = [
        playerData.full_name,
        playerData.email || null,
        playerData.phone || null,
        playerData.handicap_index || 0,
        playerData.handicap_local || 0,
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
            participants: parsedParticipants
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
        preserveExistingGroups = false
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

    // Construye el handicap efectivo con prioridad used > local > index.
    function getEffectiveHcp(p) {
        const used = normalizeHcp(p.handicap_used);
        const local = normalizeHcp(p.handicap_local);
        const index = normalizeHcp(p.handicap_index_original);
        
        // SOLO usar handicap_local para la clasificación
        // used e index son solo para referencia
        return local; // puede ser 0, o null si no hay handicap local
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
        // Modo: Regenerar todo desde cero
        console.log('🔄 Regenerating all groups from scratch');
        let currentGroup = 1;
        
        for (let i = 0; i < sortedParticipants.length; i += groupSize) {
            const groupParticipants = sortedParticipants.slice(i, i + groupSize);
            
            // Actualizar base de datos con número de grupo
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

// Función para asignar tee times a los grupos
async function assignTeeTimesToGroups(courseId, tournamentId, teeTimeData) {
    const { 
        start_time = '08:00',
        interval_minutes = 12,
        course_holes = 18,
        enable_two_sessions = false,
        enable_simultaneous_starts = false,
        morning_end_time = '12:00',
        afternoon_start_time = '14:00',
        preferred_session = 'morning'
    } = teeTimeData;
    
    console.log('🕐 Assigning tee times for tournament:', tournamentId, 'with data:', teeTimeData);
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
               ) as player_names
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
    
    // REGLAS PROFESIONALES DE GOLF: Asignación por handicap
    console.log('🏌️‍♂️ Aplicando reglas profesionales de golf para asignación de tee times');
    
    // Separar grupos por handicap
    const lowHandicapGroups = [];  // Handicap bajo (experienced players)
    const highHandicapGroups = []; // Handicap alto y principiantes
    
    groups.forEach(group => {
        const avgHandicap = parseFloat(group.avg_handicap);
        const minHandicap = parseFloat(group.min_handicap);
        
        console.log(`🔍 DEBUG Group ${group.group_number}: avg=${avgHandicap}, min=${minHandicap}`);
        
        // Consideramos handicap bajo si el promedio es <= 15 o si hay algún jugador con handicap <= 10
        // IMPORTANTE: handicap 0.0 (scratch) es el MÁS BAJO posible
        const isLowHandicapGroup = (!isNaN(avgHandicap) && avgHandicap <= 15) || 
                                   (!isNaN(minHandicap) && minHandicap <= 10) || 
                                   (!isNaN(minHandicap) && minHandicap === 0);
        
        if (isLowHandicapGroup) {
            lowHandicapGroups.push(group);
        } else {
            highHandicapGroups.push(group);
        }
    });
    
    console.log(`🎯 Grupos de handicap bajo: ${lowHandicapGroups.length} (siempre desde hoyo 1)`);
    console.log(`🎯 Grupos de handicap alto/principiantes: ${highHandicapGroups.length} (hoyo 10 o mañana)`);
    
    // Variables para asignación - RESPETAR SESIÓN PREFERIDA
    let lowHandicapTime = preferred_session === 'afternoon' ? afternoon_start_time : start_time;
    let assignedGroups = 0;
    
    console.log(`⏰ Sesión preferida: ${preferred_session}`);
    console.log(`⏰ Handicap bajo iniciará a las: ${lowHandicapTime}`);
    
    // FASE 1: Asignar grupos de handicap bajo (SIEMPRE desde hoyo 1)
    console.log('🏌️‍♂️ FASE 1: Asignando grupos de handicap bajo desde hoyo 1');
    for (const group of lowHandicapGroups) {
        const teeTime = addMinutesToTime(lowHandicapTime, assignedGroups * interval_minutes);
        
        await executeQuery(
            'UPDATE tournament_participants SET tee_time = ?, starting_hole = 1 WHERE tournament_id = ? AND group_number = ?',
            [teeTime, tournamentId, group.group_number]
        );
        
        console.log(`⛳ Grupo ${group.group_number}: Hoyo 1, ${teeTime} (handicap promedio: ${group.avg_handicap})`);
        assignedGroups++;
    }
    
    // FASE 2: Asignar grupos de handicap alto/principiantes
    console.log('🏌️‍♂️ FASE 2: Asignando grupos de handicap alto/principiantes');
    
    let highHandicapStartHole = 1;
    let highHandicapTime = lowHandicapTime;
    
    // PRIORIDAD 1: SALIDAS SIMULTÁNEAS (tiene prioridad máxima)
    console.log(`🔍 VERIFICANDO SALIDAS SIMULTÁNEAS: enable_simultaneous_starts=${enable_simultaneous_starts}, groups.length=${groups.length}`);
    if (enable_simultaneous_starts && groups.length > 0) {
        // SALIDAS SIMULTÁNEAS: Un grupo por hoyo, empezando desde hoyo 1
        console.log('⛳ SALIDAS SIMULTÁNEAS: Asignando un grupo por hoyo');
        
        let currentTime = start_time;
        let currentRound = 1; // Para tracking de tandas
        
        // En salidas simultáneas, ordenar por número de grupo (secuencial), NO por handicap
        const allGroupsSorted = groups.sort((a, b) => a.group_number - b.group_number);
        
        for (let i = 0; i < allGroupsSorted.length; i++) {
            const group = allGroupsSorted[i];
            
            // Calcular hoyo: 1-18 para la primera tanda, luego 1-18 para segunda tanda, etc.
            const holeNumber = (i % course_holes) + 1;
            
            // Si completamos una vuelta de hoyos, cambiar a la siguiente tanda
            if (i > 0 && i % course_holes === 0) {
                currentRound++;
                // Avanzar el horario para la siguiente tanda (ejemplo: 30 minutos después)
                currentTime = addMinutesToTime(start_time, (currentRound - 1) * 30);
                console.log(`🔄 Nueva tanda ${currentRound}: horario ${currentTime}`);
            }
            
            await executeQuery(
                'UPDATE tournament_participants SET tee_time = ?, starting_hole = ? WHERE tournament_id = ? AND group_number = ?',
                [currentTime, holeNumber, tournamentId, group.group_number]
            );
            
            console.log(`⛳ Grupo ${group.group_number}: Hoyo ${holeNumber}, ${currentTime} (Tanda ${currentRound})`);
        }
        
        console.log(`✅ Asignados ${allGroupsSorted.length} grupos en salidas simultáneas`);
        console.log(`🚀 SALIDAS SIMULTÁNEAS COMPLETADAS - HACIENDO RETURN (NO debe continuar con lógica normal)`);
        
        // Retornar grupos actualizados
        const { rows: updatedGroups } = await executeQuery(groupsQuery, [tournamentId]);
        console.log(`📊 Retornando ${updatedGroups.length} grupos actualizados`);
        return updatedGroups;
        
    } else if (enable_two_sessions && highHandicapGroups.length > 0) {
        // PRIORIDAD 2: REGLAS PROFESIONALES con dos sesiones
        if (preferred_session === 'afternoon') {
            // Tarde preferida: handicap bajo en tarde, handicap alto en mañana
            highHandicapTime = start_time; // Por la mañana (start_time es mañana)
            highHandicapStartHole = 1; // Desde hoyo 1
            console.log('🌅 REGLA PROFESIONAL: Handicap alto por la mañana (tarde ocupada por handicap bajo)');
        } else {
            // Mañana preferida: handicap bajo en mañana, handicap alto en tarde
            highHandicapTime = afternoon_start_time; // Por la tarde
            highHandicapStartHole = 1; // Desde hoyo 1
            console.log('🌇 REGLA PROFESIONAL: Handicap alto por la tarde (mañana ocupada por handicap bajo)');
        }
    } else {
        // Continuación normal: handicap alto continúa después del bajo
        highHandicapTime = addMinutesToTime(lowHandicapTime, assignedGroups * interval_minutes);
        console.log('⏰ Handicap alto continúa secuencialmente (una sola sesión)');
    }
    
    let highHandicapCounter = 0;
    for (const group of highHandicapGroups) {
        const teeTime = addMinutesToTime(highHandicapTime, highHandicapCounter * interval_minutes);
        
        await executeQuery(
            'UPDATE tournament_participants SET tee_time = ?, starting_hole = ? WHERE tournament_id = ? AND group_number = ?',
            [teeTime, highHandicapStartHole, tournamentId, group.group_number]
        );
        
        console.log(`⛳ Grupo ${group.group_number}: Hoyo ${highHandicapStartHole}, ${teeTime} (handicap promedio: ${group.avg_handicap})`);
        highHandicapCounter++;
    }
    
    // Obtener grupos actualizados para retornar
    const { rows: updatedGroups } = await executeQuery(groupsQuery, [tournamentId]);
    
    console.log(`✅ Asignados tee times a ${groups.length} grupos con reglas profesionales de golf`);
    console.log(`🏌️‍♂️ Handicap bajo: ${lowHandicapGroups.length} grupos desde hoyo 1`);
    console.log(`🏌️‍♂️ Handicap alto/principiantes: ${highHandicapGroups.length} grupos desde hoyo ${highHandicapStartHole}`);
    console.log(`🔚 FINALIZANDO FUNCIÓN assignTeeTimesToGroups - MODO: ${enable_simultaneous_starts ? 'SALIDAS SIMULTÁNEAS' : 'REGLAS PROFESIONALES'}`);
    
    return updatedGroups;
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

        // Actualizar todos los jugadores del grupo con el nuevo hoyo de salida y el tee time corregido
        let updateQuery, params;
        
        if (finalTeeTime !== null && finalTeeTime !== undefined) {
            updateQuery = `
                UPDATE tournament_participants 
                SET starting_hole = ?, tee_time = ?
                WHERE tournament_id = ? AND group_number = ?
            `;
            params = [newStartingHole, finalTeeTime, tournamentId, groupNumber];
        } else {
            // Si newTeeTime es null, limpiar el horario (establecer a NULL)
            updateQuery = `
                UPDATE tournament_participants 
                SET starting_hole = ?, tee_time = NULL
                WHERE tournament_id = ? AND group_number = ?
            `;
            params = [newStartingHole, tournamentId, groupNumber];
        }

        console.log('🎯 SQL Query:', updateQuery);
        console.log('🎯 SQL Params:', params);

        const { rows } = await executeQuery(updateQuery, params);

        // También intentar actualizar grupos vacíos si existen
        try {
            if (finalTeeTime !== null && finalTeeTime !== undefined) {
                await getPool().execute(
                    'UPDATE empty_tournament_groups SET starting_hole = ?, tee_time = ? WHERE tournament_id = ? AND group_number = ?',
                    [newStartingHole, finalTeeTime, tournamentId, groupNumber]
                );
            } else {
                // Si finalTeeTime es null, limpiar el horario
                await getPool().execute(
                    'UPDATE empty_tournament_groups SET starting_hole = ?, tee_time = NULL WHERE tournament_id = ? AND group_number = ?',
                    [newStartingHole, tournamentId, groupNumber]
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

                // Upsert del grupo vacío con el hoyo y la hora solicitados
                if (finalTeeTime !== null && finalTeeTime !== undefined) {
                    await pool.execute(
                        'INSERT INTO empty_tournament_groups (tournament_id, group_number, starting_hole, tee_time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE starting_hole = VALUES(starting_hole), tee_time = VALUES(tee_time)',
                        [tournamentId, groupNumber, newStartingHole, finalTeeTime]
                    );
                } else {
                    await pool.execute(
                        'INSERT INTO empty_tournament_groups (tournament_id, group_number, starting_hole) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE starting_hole = VALUES(starting_hole), tee_time = NULL',
                        [tournamentId, groupNumber, newStartingHole]
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
            entered_by
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

        // Calculate totals
        const holes = Object.keys(scores);
        const totalGross = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const front9 = Object.entries(scores)
            .filter(([hole]) => parseInt(hole) <= 9)
            .reduce((sum, [, score]) => sum + score, 0);
        const back9 = Object.entries(scores)
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
                    updated_at = CURRENT_TIMESTAMP
                WHERE scorecard_id = ?
            `;
            
            await executeQuery(updateQuery, [
                totalGross, front9, back9,
                holes.length, entry_method, verified_card,
                original_archived, entry_notes, safeEnteredBy,
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
                    original_archived, entry_notes, entered_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                original_archived, entry_notes, safeEnteredBy
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
async function getScorecardsByTournament(clubId, tournamentId) {
    console.log('📊 Getting scorecards for tournament:', { clubId, tournamentId });
    
    const query = `
        SELECT 
            s.*,
            COALESCE(CONCAT(m.first_name, ' ', m.last_name), ep.full_name) as player_name,
            COALESCE(m.handicap_index, ep.handicap_index) as handicap_index,
            COALESCE(m.handicap_local, ep.handicap_local) as handicap_local,
            m.member_number,
            t.tournament_name,
            gc.course_name
        FROM scorecards s
        LEFT JOIN members m ON s.member_id = m.member_id
        LEFT JOIN external_players ep ON s.external_player_id = ep.external_id
        LEFT JOIN tournaments t ON s.tournament_id = t.tournament_id
        LEFT JOIN golf_courses gc ON s.course_id = gc.course_id
        WHERE s.tournament_id = ?
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
async function getMemberTournaments(memberId) {
    const query = `
        SELECT DISTINCT
            t.tournament_id,
            t.tournament_name,
            t.start_date,
            t.end_date,
            t.status,
            tp.registration_date as participation_date,
            tp.confirmed,
            tp.checked_in,
            -- Intentar obtener scorecard para calcular posición
            sc.total_gross,
            -- Subconsulta para obtener la posición en el torneo
            (
                SELECT COUNT(*) + 1 
                FROM scorecards sc2 
                WHERE sc2.tournament_id = t.tournament_id 
                AND sc2.total_gross < sc.total_gross
            ) as position
        FROM tournaments t
        INNER JOIN tournament_participants tp ON t.tournament_id = tp.tournament_id
        LEFT JOIN scorecards sc ON t.tournament_id = sc.tournament_id 
            AND (sc.member_id = ? OR sc.external_player_id = tp.external_player_id)
        WHERE tp.member_id = ? OR tp.external_player_id IN (
            SELECT ep.external_id 
            FROM external_players ep 
            WHERE ep.player_id = ?
        )
        ORDER BY t.start_date DESC
    `;
    
    const { rows } = await executeQuery(query, [memberId, memberId, memberId]);
    return rows;
}

/**
 * Get scorecards for a member
 */
async function getMemberScorecards(memberId) {
    const query = `
        SELECT 
            sc.scorecard_id,
            sc.total_gross,
            sc.front_nine,
            sc.back_nine,
            sc.holes_completed,
            sc.created_at as date,
            t.tournament_name,
            t.start_date
        FROM scorecards sc
        INNER JOIN tournaments t ON sc.tournament_id = t.tournament_id
        WHERE sc.member_id = ? OR sc.external_player_id IN (
            SELECT ep.external_id 
            FROM external_players ep 
            WHERE ep.player_id = ?
        )
        ORDER BY sc.created_at DESC
        LIMIT 20
    `;
    
    const { rows } = await executeQuery(query, [memberId, memberId]);
    return rows;
}

/**
 * Get handicap history for a member
 */
async function getMemberHandicapHistory(memberId) {
    // Esta función puede expandirse para incluir un verdadero historial de cambios
    // Por ahora, simulamos con los datos actuales y algunos datos de scorecards
    const currentQuery = `
        SELECT 
            handicap_index,
            handicap_local,
            updated_at as date,
            'current' as type
        FROM members 
        WHERE member_id = ?
    `;
    
    const scorecardQuery = `
        SELECT DISTINCT
            DATE(sc.created_at) as date,
            AVG(sc.total_gross) as avg_score,
            t.tournament_name,
            m.handicap_index,
            m.handicap_local
        FROM scorecards sc
        INNER JOIN tournaments t ON sc.tournament_id = t.tournament_id
        INNER JOIN members m ON sc.member_id = m.member_id
        WHERE sc.member_id = ?
        GROUP BY DATE(sc.created_at), t.tournament_name, m.handicap_index, m.handicap_local
        ORDER BY DATE(sc.created_at) DESC
        LIMIT 10
    `;
    
    try {
        const [currentResult, scorecardResult] = await Promise.all([
            executeQuery(currentQuery, [memberId]),
            executeQuery(scorecardQuery, [memberId])
        ]);
        
        const history = [];
        
        // Agregar estado actual
        if (currentResult.rows.length > 0) {
            const current = currentResult.rows[0];
            history.push({
                date: current.date,
                handicap_index: parseFloat(current.handicap_index) || 0,
                handicap_local: parseInt(current.handicap_local) || 0,
                tournament_name: 'Estado actual'
            });
        }
        
        // Agregar entradas basadas en scorecards
        scorecardResult.rows.forEach(row => {
            history.push({
                date: row.date,
                handicap_index: parseFloat(row.handicap_index) || 0,
                handicap_local: parseInt(row.handicap_local) || 0,
                tournament_name: row.tournament_name
            });
        });
        
        return history;
    } catch (error) {
        console.error('Error getting handicap history:', error);
        return [];
    }
}

// Export all functions
export {
    // Club functions
    getAllClubs, getClubById, createClub, updateClub, deleteClub,
    
    // Administrator functions  
    getAllAdministrators, authenticateAdmin,
    
    // Member functions
    getAllMembers, getMemberById, createMember, updateMember, deleteMember, clearClubMembers, updateMemberStatus, searchMembers,
    
    // Tournament functions
    getAllTournaments, getTournamentById, createTournament, updateTournament, deleteTournament,
    updateTournamentStatus, getTournamentParticipants, getTournamentParticipantsById, addTournamentParticipant, removeTournamentParticipant,
    updateParticipantStatus, getTournamentStats, searchPlayersForTournament, findDuplicateExternalPlayers, createExternalPlayer, updateExternalPlayer, getExternalPlayers, deleteExternalPlayer,
    
    // Tournament groups functions
    getTournamentGroups, generateTournamentGroups, assignTeeTimesToGroups, movePlayerToGroup, moveGroupToHole, swapGroupNumbers, createEmptyGroup, deleteEmptyGroup,
    
    // Scorecard functions
    saveScorecard, getScorecardsByTournament, getScorecardByPlayer, updateScorecard, deleteScorecard, getScorecardForPrint,
    
    // Member details functions
    getMemberTournaments, getMemberScorecards, getMemberHandicapHistory,
    
    // Course holes functions
    createCourseHolesTable, getCourseHoles, updateCourseHole, updateMultipleCourseHoles, getCourseStatistics,
    
    // Course tees functions
    getCourseTees, getHoleTees, createTee, updateTee, deleteTee, getCourseTeesGroupedByHole,
    
    // System functions
    migrateMembersTable, migrateExternalPlayersTable, getSystemStats, getRecentActivity, logActivity
};

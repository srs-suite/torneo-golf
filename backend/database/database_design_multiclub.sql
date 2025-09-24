-- ============================================
-- SISTEMA DE GESTIÓN DE TORNEOS DE GOLF - MULTI-CLUB
-- Extensión de Base de Datos MySQL para Arquitectura Multi-Club
-- ============================================

-- ============================================
-- NUEVAS TABLAS PARA ARQUITECTURA MULTI-CLUB
-- ============================================

-- ============================================
-- TABLA: ADMINISTRADOR GENERAL DEL SISTEMA
-- ============================================
CREATE TABLE system_administrators (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NULL,
    is_super_admin BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLA: CLUBES/CAMPOS DE GOLF GESTIONADOS
-- ============================================
-- Modificamos la tabla golf_courses para añadir gestión centralizada
ALTER TABLE golf_courses ADD COLUMN club_code VARCHAR(20) UNIQUE NULL AFTER course_id;
ALTER TABLE golf_courses ADD COLUMN subscription_status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active' AFTER is_active;
ALTER TABLE golf_courses ADD COLUMN subscription_start DATE NULL AFTER subscription_status;
ALTER TABLE golf_courses ADD COLUMN subscription_end DATE NULL AFTER subscription_start;
ALTER TABLE golf_courses ADD COLUMN max_members INT DEFAULT 500 AFTER subscription_end;
ALTER TABLE golf_courses ADD COLUMN current_members INT DEFAULT 0 AFTER max_members;
ALTER TABLE golf_courses ADD COLUMN created_by INT NULL AFTER current_members;
ALTER TABLE golf_courses ADD COLUMN settings JSON NULL AFTER created_by;

-- Agregar foreign key al administrador que creó el club
ALTER TABLE golf_courses ADD FOREIGN KEY (created_by) REFERENCES system_administrators(admin_id);

-- Agregar índices
ALTER TABLE golf_courses ADD INDEX idx_club_code (club_code);
ALTER TABLE golf_courses ADD INDEX idx_subscription_status (subscription_status);

-- ============================================
-- TABLA: ADMINISTRADORES DE CLUBES
-- ============================================
CREATE TABLE club_administrators (
    club_admin_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NULL,
    is_primary_admin BOOLEAN DEFAULT FALSE, -- Solo un admin principal por club
    permissions JSON NULL, -- Permisos específicos del administrador
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- ID del system_administrator que lo creó
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES system_administrators(admin_id),
    UNIQUE KEY unique_username_club (course_id, username),
    UNIQUE KEY unique_email_club (course_id, email),
    
    INDEX idx_course_admin (course_id),
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLA: USUARIOS INTERNOS DEL CLUB
-- ============================================
CREATE TABLE club_users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('manager', 'tournament_admin', 'scorekeeper', 'viewer') NOT NULL,
    permissions JSON NULL, -- Permisos específicos por rol
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- ID del club_administrator que lo creó
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES club_administrators(club_admin_id),
    UNIQUE KEY unique_username_club (course_id, username),
    
    INDEX idx_course_user (course_id),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- ============================================
-- TABLA: MEMBRESÍAS DE JUGADORES EN CLUBES
-- ============================================
CREATE TABLE club_memberships (
    membership_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    player_id INT NOT NULL,
    member_number VARCHAR(50) NULL, -- Número de socio en el club específico
    membership_type ENUM('full', 'social', 'junior', 'senior', 'temporary') DEFAULT 'full',
    membership_status ENUM('active', 'suspended', 'cancelled', 'pending') DEFAULT 'active',
    handicap_index DECIMAL(4,1) NULL, -- Handicap específico en este club
    is_home_club BOOLEAN DEFAULT FALSE, -- Si es el club principal del jugador
    joined_date DATE NOT NULL,
    last_updated_handicap TIMESTAMP NULL,
    handicap_updated_by INT NULL, -- Quién actualizó el handicap
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (handicap_updated_by) REFERENCES club_administrators(club_admin_id),
    UNIQUE KEY unique_player_club (course_id, player_id),
    UNIQUE KEY unique_member_number_club (course_id, member_number),
    
    INDEX idx_course_membership (course_id),
    INDEX idx_player_membership (player_id),
    INDEX idx_member_number (course_id, member_number),
    INDEX idx_membership_status (membership_status),
    INDEX idx_home_club (player_id, is_home_club)
);

-- ============================================
-- TABLA: HISTORIAL DE CAMBIOS DE HANDICAP
-- ============================================
CREATE TABLE handicap_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    course_id INT NOT NULL,
    old_handicap DECIMAL(4,1) NULL,
    new_handicap DECIMAL(4,1) NULL,
    change_reason TEXT NULL,
    tournament_id INT NULL, -- Si el cambio fue después de un torneo específico
    changed_by INT NULL, -- Administrador que hizo el cambio
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE SET NULL,
    FOREIGN KEY (changed_by) REFERENCES club_administrators(club_admin_id),
    
    INDEX idx_player_handicap_history (player_id),
    INDEX idx_course_handicap_history (course_id),
    INDEX idx_change_timestamp (change_timestamp)
);

-- ============================================
-- TABLA: JUGADORES VISITANTES EN TORNEOS
-- ============================================
CREATE TABLE tournament_visitors (
    visitor_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    player_id INT NOT NULL,
    visiting_from_course_id INT NULL, -- Club de origen del visitante
    visitor_handicap DECIMAL(4,1) NULL,
    visitor_status ENUM('registered', 'confirmed', 'checked_in', 'playing', 'completed') DEFAULT 'registered',
    registration_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (visiting_from_course_id) REFERENCES golf_courses(course_id),
    UNIQUE KEY unique_visitor_tournament (tournament_id, player_id),
    
    INDEX idx_tournament_visitors (tournament_id),
    INDEX idx_visiting_from (visiting_from_course_id),
    INDEX idx_visitor_status (visitor_status)
);

-- ============================================
-- TABLA: ACCESO POR TELÉFONO DE JUGADORES
-- ============================================
CREATE TABLE player_phone_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    verification_code VARCHAR(6) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_timestamp TIMESTAMP NULL,
    access_token VARCHAR(64) NULL,
    token_expires_at TIMESTAMP NULL,
    last_access TIMESTAMP NULL,
    device_info JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_phone (player_id, phone_number),
    INDEX idx_phone_number (phone_number),
    INDEX idx_access_token (access_token),
    INDEX idx_token_expires (token_expires_at)
);

-- ============================================
-- TABLA: HISTORIAL DE TORNEOS POR JUGADOR
-- ============================================
CREATE TABLE player_tournament_participation (
    participation_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    tournament_id INT NOT NULL,
    home_course_id INT NULL, -- Club al que pertenece el jugador
    host_course_id INT NOT NULL, -- Club que organizó el torneo
    is_visitor BOOLEAN DEFAULT FALSE,
    final_score_gross INT NULL,
    final_score_net INT NULL,
    final_position INT NULL,
    holes_completed INT DEFAULT 0,
    scorecard_data JSON NULL, -- Copia de la tarjeta para el historial del jugador
    participation_date DATE NOT NULL,
    can_access_scorecard BOOLEAN DEFAULT TRUE, -- Si puede ver/descargar su tarjeta
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (home_course_id) REFERENCES golf_courses(course_id),
    FOREIGN KEY (host_course_id) REFERENCES golf_courses(course_id),
    UNIQUE KEY unique_player_tournament_participation (player_id, tournament_id),
    
    INDEX idx_player_participation (player_id),
    INDEX idx_home_course (home_course_id),
    INDEX idx_host_course (host_course_id),
    INDEX idx_participation_date (participation_date),
    INDEX idx_visitor_status (is_visitor)
);

-- ============================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- ============================================

-- Modificar tabla players para soporte multi-club
ALTER TABLE players ADD COLUMN primary_course_id INT NULL AFTER member_number;
ALTER TABLE players ADD COLUMN is_shared_player BOOLEAN DEFAULT TRUE AFTER primary_course_id;
ALTER TABLE players ADD COLUMN created_by_course_id INT NULL AFTER is_shared_player;

-- Agregar foreign keys
ALTER TABLE players ADD FOREIGN KEY (primary_course_id) REFERENCES golf_courses(course_id);
ALTER TABLE players ADD FOREIGN KEY (created_by_course_id) REFERENCES golf_courses(course_id);

-- Agregar índices
ALTER TABLE players ADD INDEX idx_primary_course (primary_course_id);
ALTER TABLE players ADD INDEX idx_shared_player (is_shared_player);
ALTER TABLE players ADD INDEX idx_created_by_course (created_by_course_id);

-- Modificar tabla tournaments para identificar el club organizador
ALTER TABLE tournaments ADD COLUMN organizing_course_id INT NULL AFTER course_id;
ALTER TABLE tournaments ADD COLUMN allows_visitors BOOLEAN DEFAULT TRUE AFTER organizing_course_id;
ALTER TABLE tournaments ADD COLUMN max_visitors INT DEFAULT 50 AFTER allows_visitors;
ALTER TABLE tournaments ADD COLUMN visitor_fee DECIMAL(10,2) DEFAULT 0.00 AFTER max_visitors;

-- Actualizar organizing_course_id con course_id existente
UPDATE tournaments SET organizing_course_id = course_id WHERE organizing_course_id IS NULL;

-- Hacer organizing_course_id NOT NULL después de la actualización
ALTER TABLE tournaments MODIFY organizing_course_id INT NOT NULL;

-- Agregar foreign key e índices
ALTER TABLE tournaments ADD FOREIGN KEY (organizing_course_id) REFERENCES golf_courses(course_id);
ALTER TABLE tournaments ADD INDEX idx_organizing_course (organizing_course_id);
ALTER TABLE tournaments ADD INDEX idx_allows_visitors (allows_visitors);

-- ============================================
-- VISTAS PARA GESTIÓN MULTI-CLUB
-- ============================================

-- Vista: Información completa de clubes con estadísticas
CREATE VIEW club_overview AS
SELECT 
    gc.course_id,
    gc.club_code,
    gc.course_name,
    gc.subscription_status,
    gc.subscription_start,
    gc.subscription_end,
    gc.max_members,
    gc.current_members,
    gc.is_active,
    COUNT(DISTINCT cm.player_id) as actual_members,
    COUNT(DISTINCT ca.club_admin_id) as administrators,
    COUNT(DISTINCT cu.user_id) as internal_users,
    COUNT(DISTINCT t.tournament_id) as total_tournaments,
    COUNT(DISTINCT CASE WHEN t.tournament_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR) THEN t.tournament_id END) as tournaments_this_year
FROM golf_courses gc
LEFT JOIN club_memberships cm ON gc.course_id = cm.course_id AND cm.membership_status = 'active'
LEFT JOIN club_administrators ca ON gc.course_id = ca.course_id AND ca.is_active = TRUE
LEFT JOIN club_users cu ON gc.course_id = cu.course_id AND cu.is_active = TRUE
LEFT JOIN tournaments t ON gc.course_id = t.organizing_course_id
GROUP BY gc.course_id, gc.club_code, gc.course_name, gc.subscription_status, 
         gc.subscription_start, gc.subscription_end, gc.max_members, gc.current_members, gc.is_active;

-- Vista: Jugadores con información de clubes
CREATE VIEW players_with_clubs AS
SELECT 
    p.player_id,
    p.first_name,
    p.last_name,
    CONCAT(p.first_name, ' ', p.last_name) as full_name,
    p.phone,
    p.email,
    p.primary_course_id,
    p.is_shared_player,
    pc.course_name as primary_club_name,
    COUNT(cm.membership_id) as total_club_memberships,
    GROUP_CONCAT(
        CONCAT(gc.course_name, ' (', cm.handicap_index, ')')
        ORDER BY cm.is_home_club DESC, gc.course_name
        SEPARATOR '; '
    ) as club_memberships,
    MAX(CASE WHEN cm.is_home_club = TRUE THEN cm.handicap_index END) as home_handicap,
    COUNT(ptp.participation_id) as total_tournaments_played
FROM players p
LEFT JOIN golf_courses pc ON p.primary_course_id = pc.course_id
LEFT JOIN club_memberships cm ON p.player_id = cm.player_id AND cm.membership_status = 'active'
LEFT JOIN golf_courses gc ON cm.course_id = gc.course_id
LEFT JOIN player_tournament_participation ptp ON p.player_id = ptp.player_id
WHERE p.is_active = TRUE
GROUP BY p.player_id, p.first_name, p.last_name, p.phone, p.email, 
         p.primary_course_id, p.is_shared_player, pc.course_name;

-- Vista: Torneos con información de visitantes
CREATE VIEW tournaments_with_visitors AS
SELECT 
    t.tournament_id,
    t.tournament_name,
    t.tournament_date,
    gc.course_name as host_club,
    t.organizing_course_id,
    t.allows_visitors,
    t.max_visitors,
    COUNT(tr.player_id) as total_registered,
    COUNT(tv.player_id) as total_visitors,
    COUNT(DISTINCT cm.course_id) as clubs_represented,
    ROUND(AVG(CASE WHEN tv.player_id IS NOT NULL THEN tv.visitor_handicap 
                   ELSE cm.handicap_index END), 1) as average_handicap
FROM tournaments t
JOIN golf_courses gc ON t.organizing_course_id = gc.course_id
LEFT JOIN tournament_registrations tr ON t.tournament_id = tr.tournament_id
LEFT JOIN tournament_visitors tv ON t.tournament_id = tv.tournament_id
LEFT JOIN club_memberships cm ON tr.player_id = cm.player_id AND cm.course_id = t.organizing_course_id
WHERE t.tournament_status IN ('registration', 'active', 'completed')
GROUP BY t.tournament_id, t.tournament_name, t.tournament_date, gc.course_name,
         t.organizing_course_id, t.allows_visitors, t.max_visitors;

-- Vista: Historial de participaciones de jugador
CREATE VIEW player_tournament_history AS
SELECT 
    ptp.player_id,
    CONCAT(p.first_name, ' ', p.last_name) as player_name,
    ptp.tournament_id,
    t.tournament_name,
    ptp.participation_date,
    hc.course_name as host_club,
    home_club.course_name as home_club,
    ptp.is_visitor,
    ptp.final_score_gross,
    ptp.final_score_net,
    ptp.final_position,
    ptp.holes_completed,
    ptp.can_access_scorecard
FROM player_tournament_participation ptp
JOIN players p ON ptp.player_id = p.player_id
JOIN tournaments t ON ptp.tournament_id = t.tournament_id
JOIN golf_courses hc ON ptp.host_course_id = hc.course_id
LEFT JOIN golf_courses home_club ON ptp.home_course_id = home_club.course_id
ORDER BY ptp.participation_date DESC;

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS PARA GESTIÓN MULTI-CLUB
-- ============================================

DELIMITER //

-- Procedimiento: Crear nuevo club
CREATE PROCEDURE CreateNewClub(
    IN p_club_code VARCHAR(20),
    IN p_course_name VARCHAR(200),
    IN p_admin_username VARCHAR(50),
    IN p_admin_email VARCHAR(255),
    IN p_admin_password VARCHAR(255),
    IN p_admin_full_name VARCHAR(200),
    IN p_admin_phone VARCHAR(20),
    IN p_max_members INT,
    IN p_created_by INT
)
BEGIN
    DECLARE new_course_id INT;
    DECLARE new_admin_id INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Crear el club
    INSERT INTO golf_courses (
        club_code, course_name, subscription_status, subscription_start, 
        max_members, created_by, is_active
    ) VALUES (
        p_club_code, p_course_name, 'active', CURDATE(), 
        p_max_members, p_created_by, TRUE
    );
    
    SET new_course_id = LAST_INSERT_ID();
    
    -- Crear el administrador principal del club
    INSERT INTO club_administrators (
        course_id, username, email, password_hash, full_name, phone,
        is_primary_admin, is_active, created_by
    ) VALUES (
        new_course_id, p_admin_username, p_admin_email, p_admin_password,
        p_admin_full_name, p_admin_phone, TRUE, TRUE, p_created_by
    );
    
    SET new_admin_id = LAST_INSERT_ID();
    
    COMMIT;
    
    SELECT new_course_id as course_id, new_admin_id as admin_id;
END//

-- Procedimiento: Agregar jugador a club
CREATE PROCEDURE AddPlayerToClub(
    IN p_course_id INT,
    IN p_player_id INT,
    IN p_member_number VARCHAR(50),
    IN p_membership_type ENUM('full', 'social', 'junior', 'senior', 'temporary'),
    IN p_handicap_index DECIMAL(4,1),
    IN p_is_home_club BOOLEAN
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Verificar que el jugador no esté ya en el club
    IF EXISTS (
        SELECT 1 FROM club_memberships 
        WHERE course_id = p_course_id AND player_id = p_player_id
    ) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El jugador ya es miembro de este club';
    END IF;
    
    -- Si es club principal, remover flag de otros clubes
    IF p_is_home_club = TRUE THEN
        UPDATE club_memberships 
        SET is_home_club = FALSE 
        WHERE player_id = p_player_id;
        
        -- Actualizar primary_course_id en players
        UPDATE players 
        SET primary_course_id = p_course_id 
        WHERE player_id = p_player_id;
    END IF;
    
    -- Agregar membresía
    INSERT INTO club_memberships (
        course_id, player_id, member_number, membership_type, 
        handicap_index, is_home_club, joined_date
    ) VALUES (
        p_course_id, p_player_id, p_member_number, p_membership_type,
        p_handicap_index, p_is_home_club, CURDATE()
    );
    
    -- Actualizar contador de miembros
    UPDATE golf_courses 
    SET current_members = (
        SELECT COUNT(*) FROM club_memberships 
        WHERE course_id = p_course_id AND membership_status = 'active'
    )
    WHERE course_id = p_course_id;
    
    COMMIT;
END//

-- Procedimiento: Buscar jugadores para invitar a torneo
CREATE PROCEDURE SearchPlayersForTournament(
    IN p_search_term VARCHAR(200),
    IN p_organizing_course_id INT,
    IN p_limit INT DEFAULT 20
)
BEGIN
    SELECT 
        p.player_id,
        p.first_name,
        p.last_name,
        CONCAT(p.first_name, ' ', p.last_name) as full_name,
        cm.handicap_index,
        gc.course_name as home_club,
        cm.course_id as home_course_id,
        CASE 
            WHEN cm.course_id = p_organizing_course_id THEN FALSE
            ELSE TRUE
        END as is_visitor,
        cm.membership_status
    FROM players p
    LEFT JOIN club_memberships cm ON p.player_id = cm.player_id AND cm.is_home_club = TRUE
    LEFT JOIN golf_courses gc ON cm.course_id = gc.course_id
    WHERE p.is_active = TRUE
      AND (
          p.first_name LIKE CONCAT('%', p_search_term, '%')
          OR p.last_name LIKE CONCAT('%', p_search_term, '%')
          OR CONCAT(p.first_name, ' ', p.last_name) LIKE CONCAT('%', p_search_term, '%')
      )
    ORDER BY 
        CASE WHEN cm.course_id = p_organizing_course_id THEN 0 ELSE 1 END,
        p.last_name, p.first_name
    LIMIT p_limit;
END//

-- Procedimiento: Registrar jugador visitante en torneo
CREATE PROCEDURE RegisterVisitorInTournament(
    IN p_tournament_id INT,
    IN p_player_id INT,
    IN p_visitor_handicap DECIMAL(4,1),
    IN p_visiting_from_course_id INT
)
BEGIN
    DECLARE tournament_course_id INT;
    DECLARE max_visitors INT DEFAULT 0;
    DECLARE current_visitors INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener información del torneo
    SELECT organizing_course_id, max_visitors, allows_visitors
    INTO tournament_course_id, max_visitors, @allows_visitors
    FROM tournaments 
    WHERE tournament_id = p_tournament_id;
    
    -- Verificar que el torneo permite visitantes
    IF @allows_visitors = FALSE THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Este torneo no permite jugadores visitantes';
    END IF;
    
    -- Contar visitantes actuales
    SELECT COUNT(*) INTO current_visitors
    FROM tournament_visitors 
    WHERE tournament_id = p_tournament_id;
    
    -- Verificar límite de visitantes
    IF current_visitors >= max_visitors THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Se alcanzó el límite máximo de jugadores visitantes';
    END IF;
    
    -- Registrar como visitante
    INSERT INTO tournament_visitors (
        tournament_id, player_id, visiting_from_course_id, visitor_handicap
    ) VALUES (
        p_tournament_id, p_player_id, p_visiting_from_course_id, p_visitor_handicap
    );
    
    -- También registrar en tournament_registrations con handicap calculado para el campo
    INSERT INTO tournament_registrations (
        tournament_id, player_id, course_handicap
    ) VALUES (
        p_tournament_id, p_player_id, p_visitor_handicap
    );
    
    COMMIT;
END//

-- Procedimiento: Actualizar handicap de jugador
CREATE PROCEDURE UpdatePlayerHandicap(
    IN p_player_id INT,
    IN p_course_id INT,
    IN p_new_handicap DECIMAL(4,1),
    IN p_change_reason TEXT,
    IN p_changed_by INT,
    IN p_tournament_id INT
)
BEGIN
    DECLARE old_handicap DECIMAL(4,1);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Obtener handicap actual
    SELECT handicap_index INTO old_handicap
    FROM club_memberships 
    WHERE player_id = p_player_id AND course_id = p_course_id;
    
    -- Actualizar handicap
    UPDATE club_memberships 
    SET 
        handicap_index = p_new_handicap,
        last_updated_handicap = CURRENT_TIMESTAMP,
        handicap_updated_by = p_changed_by
    WHERE player_id = p_player_id AND course_id = p_course_id;
    
    -- Registrar en historial
    INSERT INTO handicap_history (
        player_id, course_id, old_handicap, new_handicap,
        change_reason, tournament_id, changed_by
    ) VALUES (
        p_player_id, p_course_id, old_handicap, p_new_handicap,
        p_change_reason, p_tournament_id, p_changed_by
    );
    
    -- Si es el club principal, actualizar también en la tabla players
    IF EXISTS (
        SELECT 1 FROM club_memberships 
        WHERE player_id = p_player_id AND course_id = p_course_id AND is_home_club = TRUE
    ) THEN
        UPDATE players 
        SET handicap_index = p_new_handicap 
        WHERE player_id = p_player_id;
    END IF;
    
    COMMIT;
END//

-- Procedimiento: Registrar participación en torneo (para historial del jugador)
CREATE PROCEDURE RecordTournamentParticipation(
    IN p_tournament_id INT,
    IN p_player_id INT
)
BEGIN
    DECLARE v_home_course_id INT DEFAULT NULL;
    DECLARE v_host_course_id INT;
    DECLARE v_is_visitor BOOLEAN DEFAULT FALSE;
    DECLARE v_tournament_date DATE;
    
    -- Obtener información del torneo
    SELECT organizing_course_id, tournament_date
    INTO v_host_course_id, v_tournament_date
    FROM tournaments 
    WHERE tournament_id = p_tournament_id;
    
    -- Obtener club principal del jugador
    SELECT course_id INTO v_home_course_id
    FROM club_memberships 
    WHERE player_id = p_player_id AND is_home_club = TRUE
    LIMIT 1;
    
    -- Determinar si es visitante
    SET v_is_visitor = (v_home_course_id IS NULL OR v_home_course_id != v_host_course_id);
    
    -- Registrar participación
    INSERT INTO player_tournament_participation (
        player_id, tournament_id, home_course_id, host_course_id,
        is_visitor, participation_date
    ) VALUES (
        p_player_id, p_tournament_id, v_home_course_id, v_host_course_id,
        v_is_visitor, v_tournament_date
    )
    ON DUPLICATE KEY UPDATE
        home_course_id = v_home_course_id,
        is_visitor = v_is_visitor;
END//

DELIMITER ;

-- ============================================
-- TRIGGERS PARA GESTIÓN AUTOMÁTICA
-- ============================================

DELIMITER //

-- Trigger: Actualizar contador de miembros al agregar/quitar membresías
CREATE TRIGGER update_member_count_insert
AFTER INSERT ON club_memberships
FOR EACH ROW
BEGIN
    UPDATE golf_courses 
    SET current_members = (
        SELECT COUNT(*) FROM club_memberships 
        WHERE course_id = NEW.course_id AND membership_status = 'active'
    )
    WHERE course_id = NEW.course_id;
END//

CREATE TRIGGER update_member_count_update
AFTER UPDATE ON club_memberships
FOR EACH ROW
BEGIN
    UPDATE golf_courses 
    SET current_members = (
        SELECT COUNT(*) FROM club_memberships 
        WHERE course_id = NEW.course_id AND membership_status = 'active'
    )
    WHERE course_id = NEW.course_id;
    
    -- Si cambió de club, actualizar el club anterior también
    IF OLD.course_id != NEW.course_id THEN
        UPDATE golf_courses 
        SET current_members = (
            SELECT COUNT(*) FROM club_memberships 
            WHERE course_id = OLD.course_id AND membership_status = 'active'
        )
        WHERE course_id = OLD.course_id;
    END IF;
END//

CREATE TRIGGER update_member_count_delete
AFTER DELETE ON club_memberships
FOR EACH ROW
BEGIN
    UPDATE golf_courses 
    SET current_members = (
        SELECT COUNT(*) FROM club_memberships 
        WHERE course_id = OLD.course_id AND membership_status = 'active'
    )
    WHERE course_id = OLD.course_id;
END//

-- Trigger: Registrar participación automáticamente al crear scorecard
CREATE TRIGGER auto_record_tournament_participation
AFTER INSERT ON scorecards
FOR EACH ROW
BEGIN
    CALL RecordTournamentParticipation(NEW.tournament_id, NEW.player_id);
END//

-- Trigger: Actualizar datos de participación al completar scorecard
CREATE TRIGGER update_participation_on_scorecard_complete
AFTER UPDATE ON scorecards
FOR EACH ROW
BEGIN
    IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
        UPDATE player_tournament_participation 
        SET 
            final_score_gross = NEW.total_gross,
            final_score_net = NEW.total_net,
            holes_completed = NEW.holes_completed,
            scorecard_data = JSON_OBJECT(
                'scorecard_id', NEW.scorecard_id,
                'total_gross', NEW.total_gross,
                'total_net', NEW.total_net,
                'completed_at', NEW.completed_at
            )
        WHERE tournament_id = NEW.tournament_id AND player_id = NEW.player_id;
    END IF;
END//

DELIMITER ;

-- ============================================
-- DATOS DE EJEMPLO PARA TESTING
-- ============================================

-- Insertar administrador general del sistema
INSERT INTO system_administrators (
    username, email, password_hash, full_name, phone
) VALUES (
    'admin_system', 'admin@golfsystem.com', 
    SHA2('admin123', 256), 'Administrador General', '+54 11 1234-5678'
);

-- Actualizar clubes existentes con códigos
UPDATE golf_courses SET 
    club_code = 'LP001',
    subscription_status = 'active',
    subscription_start = '2024-01-01',
    max_members = 300,
    created_by = 1
WHERE course_id = 1;

UPDATE golf_courses SET 
    club_code = 'SM002',
    subscription_status = 'active',
    subscription_start = '2024-01-01',
    max_members = 150,
    created_by = 1
WHERE course_id = 2;

UPDATE golf_courses SET 
    club_code = 'LR003',
    subscription_status = 'active',
    subscription_start = '2024-01-01',
    max_members = 500,
    created_by = 1
WHERE course_id = 3;

-- Crear administradores para los clubes existentes
INSERT INTO club_administrators (
    course_id, username, email, password_hash, full_name, 
    is_primary_admin, created_by
) VALUES 
(1, 'admin_lospinos', 'admin@lospinos.com.ar', SHA2('lospinos123', 256), 'Admin Los Pinos', TRUE, 1),
(2, 'admin_sanmartin', 'admin@sanmartin.gov.ar', SHA2('sanmartin123', 256), 'Admin San Martín', TRUE, 1),
(3, 'admin_lasrosas', 'admin@lasrosas.com', SHA2('lasrosas123', 256), 'Admin Las Rosas', TRUE, 1);

-- Crear algunas membresías de ejemplo
INSERT INTO club_memberships (
    course_id, player_id, member_number, membership_type, 
    handicap_index, is_home_club, joined_date
) VALUES 
(1, 1, 'LP001', 'full', 15.2, TRUE, '2023-01-15'),
(1, 2, 'LP002', 'full', 8.5, FALSE, '2023-02-20'),
(2, 3, 'SM001', 'full', NULL, TRUE, '2023-03-10'),
(3, 4, 'LR001', 'full', 22.1, TRUE, '2023-01-05'),
(3, 5, 'LR002', 'full', 12.8, FALSE, '2023-04-12');

-- Actualizar primary_course_id en players basado en membresías
UPDATE players p 
JOIN club_memberships cm ON p.player_id = cm.player_id AND cm.is_home_club = TRUE
SET p.primary_course_id = cm.course_id;

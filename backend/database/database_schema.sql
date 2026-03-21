-- TeeTracker Pro - Golf Tournament Management System
-- Database Schema for Multi-Club Architecture

-- Create database
CREATE DATABASE IF NOT EXISTS teetracker_pro 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE teetracker_pro;

-- Table: golf_courses (Clubs)
CREATE TABLE IF NOT EXISTS golf_courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    club_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    currency VARCHAR(10) DEFAULT 'ARS',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_path VARCHAR(500),
    par INT DEFAULT 72,
    physical_holes INT DEFAULT 18, -- Physical holes on the course (9 or 18)
    max_members INT DEFAULT NULL, -- NULL = unlimited
    current_members INT DEFAULT 0,
    subscription_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    subscription_start DATE,
    subscription_end DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_club_code (club_code),
    INDEX idx_subscription_status (subscription_status),
    INDEX idx_is_active (is_active)
);

-- Table: club_administrators
CREATE TABLE IF NOT EXISTS club_administrators (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_primary_admin BOOLEAN DEFAULT FALSE,
    role ENUM('system_admin', 'club_admin') DEFAULT 'club_admin',
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_course_id (course_id),
    INDEX idx_is_active (is_active)
);

-- Table: members (Players)
CREATE TABLE IF NOT EXISTS members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    member_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    handicap_number VARCHAR(50),
    handicap_index DECIMAL(4,1) DEFAULT 0.0,
    category ENUM('Regular', 'Bonificado') DEFAULT 'Regular',
    status ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    photo_path VARCHAR(500),
    birth_date DATE,
    gender ENUM('M', 'F', 'Other'),
    handicap_local DECIMAL(4,1) DEFAULT 0.0,
    membership_type ENUM('full', 'associate', 'junior', 'guest') DEFAULT 'full',
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_member_per_club (course_id, member_number),
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_course_id (course_id)
);

-- Table: tournaments
CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    tournament_name VARCHAR(255) NOT NULL,
    tournament_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    tournament_type ENUM('stroke_play', 'match_play', 'scramble', 'best_ball') DEFAULT 'stroke_play',
    max_participants INT,
    registration_deadline DATETIME,
    entry_fee DECIMAL(10,2) DEFAULT 0.00,
    prize_pool DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    rules TEXT,
    status ENUM('draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    weather_conditions VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    INDEX idx_tournament_date (tournament_date),
    INDEX idx_status (status),
    INDEX idx_course_id (course_id)
);

-- Table: tournament_participants
CREATE TABLE IF NOT EXISTS tournament_participants (
    participation_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    member_id INT NOT NULL,
    group_number INT,
    tee_time TIME,
    starting_hole INT DEFAULT 1,
    handicap_used DECIMAL(4,1),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    status ENUM('registered', 'confirmed', 'no_show', 'disqualified') DEFAULT 'registered',
    notes TEXT,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant_per_tournament (tournament_id, member_id),
    INDEX idx_tournament_id (tournament_id),
    INDEX idx_member_id (member_id),
    INDEX idx_group_number (group_number),
    INDEX idx_tee_time (tee_time)
);

-- Table: scorecards
CREATE TABLE IF NOT EXISTS scorecards (
    scorecard_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    member_id INT NOT NULL,
    hole_scores JSON NOT NULL, -- Array of 18 scores
    total_strokes INT,
    total_putts INT DEFAULT 0,
    penalties INT DEFAULT 0,
    net_score INT,
    points INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    signed_by_player BOOLEAN DEFAULT FALSE,
    signed_by_marker BOOLEAN DEFAULT FALSE,
    marker_member_id INT,
    submission_time TIMESTAMP,
    verification_status ENUM('pending', 'verified', 'disputed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (marker_member_id) REFERENCES members(member_id) ON DELETE SET NULL,
    UNIQUE KEY unique_scorecard_per_tournament (tournament_id, member_id),
    INDEX idx_tournament_id (tournament_id),
    INDEX idx_member_id (member_id),
    INDEX idx_is_completed (is_completed)
);

-- Table: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key),
    INDEX idx_is_public (is_public)
);

-- Table: aag_sync_logs (historial sync masivo AAG)
CREATE TABLE IF NOT EXISTS aag_sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL,
    total_processed INT NULL,
    synced INT NULL,
    errors INT NULL,
    status ENUM('SUCCESS', 'ERROR') NULL,
    FOREIGN KEY (club_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    INDEX idx_club_id (club_id),
    INDEX idx_started_at (started_at)
);

-- Table: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    user_id INT,
    user_type ENUM('admin', 'member') DEFAULT 'admin',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_action (action),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
);

-- Table: scorecards
CREATE TABLE IF NOT EXISTS scorecards (
    scorecard_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    player_id INT NOT NULL, -- Can reference either member_id or external_player_id
    course_id INT NOT NULL,
    total_gross INT DEFAULT 0,
    total_net INT DEFAULT 0,
    front_nine INT DEFAULT 0,
    back_nine INT DEFAULT 0,
    holes_completed INT DEFAULT 0,
    entry_method ENUM('manual', 'mobile', 'photo', 'import') DEFAULT 'manual',
    verified_card BOOLEAN DEFAULT FALSE,
    original_archived BOOLEAN DEFAULT FALSE,
    entry_notes TEXT,
    entered_by INT, -- club_administrator who entered manually
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE,
    INDEX idx_tournament_id (tournament_id),
    INDEX idx_player_id (player_id),
    INDEX idx_course_id (course_id),
    INDEX idx_total_gross (total_gross),
    INDEX idx_created_at (created_at)
);

-- Table: scorecard_holes
CREATE TABLE IF NOT EXISTS scorecard_holes (
    hole_id INT AUTO_INCREMENT PRIMARY KEY,
    scorecard_id INT NOT NULL,
    hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    par INT DEFAULT 4 CHECK (par BETWEEN 3 AND 6),
    strokes INT NOT NULL CHECK (strokes BETWEEN 1 AND 15),
    hole_handicap INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (scorecard_id) REFERENCES scorecards(scorecard_id) ON DELETE CASCADE,
    UNIQUE KEY unique_scorecard_hole (scorecard_id, hole_number),
    INDEX idx_scorecard_id (scorecard_id),
    INDEX idx_hole_number (hole_number)
);

-- Table: scorecard_photos (for OCR functionality)
CREATE TABLE IF NOT EXISTS scorecard_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    scorecard_id INT NOT NULL,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    mime_type VARCHAR(100),
    ocr_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    ocr_data JSON, -- Extracted scores and confidence levels
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    FOREIGN KEY (scorecard_id) REFERENCES scorecards(scorecard_id) ON DELETE CASCADE,
    INDEX idx_scorecard_id (scorecard_id),
    INDEX idx_ocr_status (ocr_status)
);

-- Insert default system administrator
INSERT INTO club_administrators (
    course_id, 
    username, 
    email, 
    password_hash, 
    full_name, 
    role, 
    is_primary_admin, 
    is_active,
    created_by
) VALUES (
    NULL,
    'system_admin',
    'admin@teetrackerPro.com',
    SHA2('admin123', 256),
    'System Administrator',
    'system_admin',
    TRUE,
    TRUE,
    1
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insert sample club data
INSERT INTO golf_courses (
    club_code,
    course_name,
    address,
    city,
    country,
    timezone,
    currency,
    phone,
    email,
    website,
    par,
    current_members,
    subscription_status,
    subscription_start,
    is_active,
    created_by
) VALUES (
    'LP001',
    'Club Los Pinos',
    'Av. Los Pinos 1234',
    'Buenos Aires',
    'Argentina',
    'America/Argentina/Buenos_Aires',
    'ARS',
    '+54 11 1234-5678',
    'info@lospinos.com.ar',
    'https://www.lospinos.com.ar',
    72,
    0,
    'active',
    '2024-01-01',
    TRUE,
    1
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insert sample club administrator
INSERT INTO club_administrators (
    course_id,
    username,
    email,
    password_hash,
    full_name,
    role,
    is_primary_admin,
    is_active,
    created_by
) VALUES (
    1,
    'admin_lospinos',
    'admin@lospinos.com.ar',
    SHA2('lospinos123', 256),
    'Admin Los Pinos',
    'club_admin',
    TRUE,
    TRUE,
    1
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insert sample members for Club Los Pinos
INSERT INTO members (
    course_id,
    member_number,
    first_name,
    last_name,
    email,
    phone,
    handicap_number,
    handicap_index,
    category,
    status,
    gender,
    created_by
) VALUES 
(1, 'LP001', 'Juan', 'Pérez', 'juan.perez@email.com', '+54911234567', 'H123456', 15.2, 'Regular', 'Activo', 'M', 1),
(1, 'LP002', 'María', 'González', 'maria.gonzalez@email.com', '+54911234568', 'H123457', 8.5, 'Regular', 'Activo', 'F', 1),
(1, 'LP003', 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '+54911234569', 'H123458', 22.1, 'Bonificado', 'Activo', 'M', 1),
(1, 'LP004', 'Ana', 'Martínez', 'ana.martinez@email.com', '+54911234570', 'H123459', 12.8, 'Regular', 'Inactivo', 'F', 1),
(1, 'LP005', 'Roberto', 'López', 'roberto.lopez@email.com', '+54911234571', 'H123460', 5.4, 'Bonificado', 'Activo', 'M', 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('app_name', 'TeeTracker Pro', 'string', 'Application name', TRUE),
('app_version', '1.0.0', 'string', 'Application version', TRUE),
('default_timezone', 'America/Argentina/Buenos_Aires', 'string', 'Default timezone', FALSE),
('default_currency', 'ARS', 'string', 'Default currency', FALSE),
('max_handicap', '54.0', 'number', 'Maximum handicap allowed', TRUE),
('min_handicap', '-10.0', 'number', 'Minimum handicap allowed', TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

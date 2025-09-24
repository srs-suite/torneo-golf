USE teetracker_pro;

-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
    club_id INT AUTO_INCREMENT PRIMARY KEY,
    club_name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(150),
    website VARCHAR(200),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create golf_courses table
CREATE TABLE IF NOT EXISTS golf_courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(20),
    par INT DEFAULT 72,
    physical_holes INT DEFAULT 18,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    member_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    birth_date DATE,
    gender ENUM('M','F','Other'),
    handicap_index DECIMAL(4,1) DEFAULT 0.0,
    handicap_local DECIMAL(4,1) DEFAULT 0.0,
    membership_type ENUM('full','associate','junior','guest') DEFAULT 'full',
    membership_status ENUM('active','inactive','suspended') DEFAULT 'active',
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE
);

-- Create external_players table
CREATE TABLE IF NOT EXISTS external_players (
    external_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    handicap_index DECIMAL(4,1) DEFAULT 0.0,
    home_club VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    tournament_name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    registration_deadline DATE,
    max_participants INT DEFAULT 100,
    entry_fee DECIMAL(10,2) DEFAULT 0.00,
    prize_pool DECIMAL(10,2) DEFAULT 0.00,
    tournament_type ENUM('stroke_play','match_play','scramble','best_ball') DEFAULT 'stroke_play',
    status ENUM('draft','open','closed','in_progress','completed','cancelled') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES golf_courses(course_id) ON DELETE CASCADE
);

-- Insert sample data
INSERT INTO clubs (club_name, address, phone, email) VALUES 
('Club de Golf Los Pinos', 'Av. Country Club 123, Buenos Aires', '+54 11 4567-8900', 'info@golfpinos.com');

INSERT INTO golf_courses (club_id, course_name, address, par, physical_holes) VALUES 
(1, 'Campo Principal Los Pinos', 'Av. Country Club 123, Buenos Aires', 72, 18);

INSERT INTO tournaments (course_id, tournament_name, description, start_date, tournament_type, status) VALUES 
(1, 'Torneo Mensual Octubre 2024', 'Torneo mensual stroke play', '2024-10-15', 'stroke_play', 'open');

INSERT INTO members (course_id, member_number, first_name, last_name, email, phone, handicap_index) VALUES 
(1, 'M-001', 'Juan', 'Pérez', 'juan.perez@email.com', '+54 11 1234-5678', 18.5),
(1, 'M-002', 'María', 'González', 'maria.gonzalez@email.com', '+54 11 2345-6789', 15.2),
(1, 'M-003', 'Carlos', 'López', 'carlos.lopez@email.com', '+54 11 3456-7890', 22.1);

INSERT INTO external_players (full_name, email, phone, handicap_index, home_club) VALUES 
('Roberto Martínez', 'roberto.martinez@email.com', '+54 11 4567-8901', 16.8, 'Club San Isidro'),
('Ana Silva', 'ana.silva@email.com', '+54 11 5678-9012', 19.3, 'Club Olivos');

SELECT 'Basic tables created successfully!' as status;

-- Crear tabla para participantes de torneos
CREATE TABLE IF NOT EXISTS tournament_participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    player_id INT,  -- NULL si es jugador externo
    player_name VARCHAR(200) NOT NULL,
    player_email VARCHAR(150),
    player_phone VARCHAR(20),
    handicap_index DECIMAL(4,1) DEFAULT 0,
    player_club VARCHAR(200),
    player_type ENUM('member', 'visitor', 'external') NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'confirmed', 'cancelled') DEFAULT 'registered',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES members(member_id) ON DELETE SET NULL,
    INDEX idx_tournament_id (tournament_id),
    INDEX idx_player_id (player_id),
    INDEX idx_player_type (player_type),
    INDEX idx_status (status)
);

-- Crear tabla para jugadores externos (no miembros de ningún club del sistema)
CREATE TABLE IF NOT EXISTS external_players (
    external_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    handicap_index DECIMAL(4,1) DEFAULT 0,
    home_club VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_email (email),
    INDEX idx_full_name (full_name),
    INDEX idx_email (email)
);

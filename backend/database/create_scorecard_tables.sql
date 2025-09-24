-- TeeTracker Pro - Create Scorecard Tables Only
-- Script to add scorecard functionality to existing database

USE teetracker_pro;

-- Table: scorecards
CREATE TABLE IF NOT EXISTS scorecards (
    scorecard_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    member_id INT NULL, -- References members table (for club members)
    external_player_id INT NULL, -- References external_players table (for guests)
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
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (external_player_id) REFERENCES external_players(external_id) ON DELETE CASCADE,
    INDEX idx_tournament_id (tournament_id),
    INDEX idx_member_id (member_id),
    INDEX idx_external_player_id (external_player_id),
    INDEX idx_course_id (course_id),
    INDEX idx_total_gross (total_gross),
    INDEX idx_created_at (created_at),
    -- Ensure only one scorecard per player per tournament
    UNIQUE KEY unique_tournament_member (tournament_id, member_id),
    UNIQUE KEY unique_tournament_external (tournament_id, external_player_id),
    -- Ensure either member_id or external_player_id is set, but not both
    CHECK ((member_id IS NOT NULL AND external_player_id IS NULL) OR 
           (member_id IS NULL AND external_player_id IS NOT NULL))
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

SELECT 'Scorecard tables created successfully!' as status;


-- Historial de ejecuciones del sync masivo AAG (cron semanal)
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

-- Torneos que cuentan de forma explícita en el ranking anual del club (por año calendario).
-- Si no hay filas para (course_id, calendar_year), el acumulado usa todos los torneos del año con is_ranking_event = 1 (comportamiento provisorio).

CREATE TABLE IF NOT EXISTS annual_ranking_tournament_picks (
    course_id INT NOT NULL,
    calendar_year SMALLINT NOT NULL,
    tournament_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, calendar_year, tournament_id),
    KEY idx_arp_club_year (course_id, calendar_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

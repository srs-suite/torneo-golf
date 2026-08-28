-- Estado y reglas del ranking anual por club/año.
-- provisional = se recalcula en vivo con best-of-N.
-- final = ranking cerrado (selección de torneos bloqueada hasta reabrir).

CREATE TABLE IF NOT EXISTS annual_ranking_year_state (
    course_id INT NOT NULL,
    calendar_year SMALLINT NOT NULL,
    status ENUM('provisional', 'final') NOT NULL DEFAULT 'provisional',
    expected_tournaments SMALLINT NOT NULL DEFAULT 5,
    min_rounds SMALLINT NOT NULL DEFAULT 3,
    counting_rounds SMALLINT NOT NULL DEFAULT 3,
    scratch_cut SMALLINT NOT NULL DEFAULT 8,
    handicap_cut SMALLINT NOT NULL DEFAULT 16,
    finalized_at TIMESTAMP NULL DEFAULT NULL,
    finalized_by INT NULL DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, calendar_year),
    KEY idx_arys_club_year (course_id, calendar_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AUDITORÍA DE ESTRUCTURA — Torneogolf / TeeTracker Pro
-- Integración AAG (Asociación Argentina de Golf)
--
-- Ejecutar en MySQL/MariaDB conectado a la base del proyecto:
--   mysql -u USER -p NOMBRE_BASE < AUDITORIA_AAG.sql
--   o pegar por cliente (HeidiSQL, DBeaver, etc.)
--
-- Este script NO asume tablas con nombres legacy (players, golfers,
-- tournament_players). Usa los nombres reales del código: members,
-- external_players, tournament_participants, tournaments, scorecards, etc.
-- ============================================================

SET @db = DATABASE();
SELECT CONCAT('Base actual: ', @db) AS info;

-- 1) Todas las tablas
SHOW TABLES;

-- 2) Tablas candidatas (patrones alineados al repo)
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @db
  AND (
    TABLE_NAME LIKE '%member%'
    OR TABLE_NAME LIKE '%player%'
    OR TABLE_NAME LIKE '%external%'
    OR TABLE_NAME LIKE '%visit%'
    OR TABLE_NAME LIKE '%tourn%'
    OR TABLE_NAME LIKE '%partic%'
    OR TABLE_NAME LIKE '%score%'
    OR TABLE_NAME LIKE '%card%'
    OR TABLE_NAME LIKE '%club%'
    OR TABLE_NAME LIKE '%course%'
    OR TABLE_NAME LIKE '%golf%'
    OR TABLE_NAME LIKE '%handicap%'
  )
ORDER BY TABLE_NAME;

-- 3) Generar sentencias SHOW CREATE (copiar y ejecutar las que correspondan)
SELECT CONCAT('SHOW CREATE TABLE `', TABLE_NAME, '`;') AS ejecutar_show_create
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME IN (
    'clubs',
    'golf_courses',
    'members',
    'external_players',
    'tournaments',
    'tournament_participants',
    'scorecards',
    'scorecard_holes',
    'scorecard_photos',
    'club_administrators',
    'club_users',
    'user_permissions',
    'course_holes',
    'activity_logs',
    'handicap_history'
  )
ORDER BY TABLE_NAME;

-- 4) Columnas relevantes (index, hcp, handicap, club, matrícula, AAG)
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    EXTRA,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND (
    COLUMN_NAME LIKE '%index%'
    OR COLUMN_NAME LIKE '%hcp%'
    OR COLUMN_NAME LIKE '%handicap%'
    OR COLUMN_NAME LIKE '%aag%'
    OR COLUMN_NAME LIKE '%matric%'
    OR COLUMN_NAME LIKE '%member_number%'
    OR COLUMN_NAME LIKE '%home_club%'
    OR COLUMN_NAME LIKE '%player_club%'
    OR COLUMN_NAME LIKE '%feder%'
    OR COLUMN_NAME LIKE '%club%'
  )
  -- Excluir ruido: índice de hoyo (course_holes.handicap) sigue siendo útil
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 5) Claves foráneas
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = @db
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 6) Tablas con columnas de handicap/index (snapshot para integración)
SELECT DISTINCT TABLE_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND (
    COLUMN_NAME LIKE '%handicap%'
    OR COLUMN_NAME LIKE '%hcp%'
    OR (COLUMN_NAME LIKE '%index%' AND TABLE_NAME NOT IN ('information_schema'))
  )
ORDER BY TABLE_NAME;

-- 7) “Sellado” en torneo: participación + tarjeta
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND (
    TABLE_NAME IN ('tournament_participants', 'scorecards', 'scorecard_holes')
    OR (
      (TABLE_NAME LIKE '%partic%' OR TABLE_NAME LIKE '%score%')
      AND (COLUMN_NAME LIKE '%handicap%' OR COLUMN_NAME LIKE '%index%' OR COLUMN_NAME LIKE '%hcp%' OR COLUMN_NAME LIKE '%gross%' OR COLUMN_NAME LIKE '%net%')
    )
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 8) Ejemplos (solo si la tabla existe — evita error con procedimiento)
-- Descomentar o ejecutar línea a línea según SHOW TABLES:

-- SELECT * FROM clubs LIMIT 5;
-- SELECT * FROM golf_courses LIMIT 5;
-- SELECT * FROM members LIMIT 5;
-- SELECT * FROM external_players LIMIT 5;
-- SELECT * FROM tournaments LIMIT 5;
-- SELECT * FROM tournament_participants LIMIT 5;
-- SELECT * FROM scorecards LIMIT 5;
-- SELECT * FROM scorecard_holes LIMIT 5;

-- 9) Versión alternativa: ejemplos condicionados (MySQL 8+)
-- Si falla, usar el bloque comentado de arriba.

DELIMITER //
DROP PROCEDURE IF EXISTS sp_audit_sample_rows //
CREATE PROCEDURE sp_audit_sample_rows()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members') THEN
        SELECT 'members' AS tbl, m.* FROM members m LIMIT 5;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_players') THEN
        SELECT 'external_players' AS tbl, e.* FROM external_players e LIMIT 5;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournaments') THEN
        SELECT 'tournaments' AS tbl, t.* FROM tournaments t LIMIT 5;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants') THEN
        SELECT 'tournament_participants' AS tbl, tp.* FROM tournament_participants tp LIMIT 5;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scorecards') THEN
        SELECT 'scorecards' AS tbl, s.* FROM scorecards s LIMIT 5;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scorecard_holes') THEN
        SELECT 'scorecard_holes' AS tbl, sh.* FROM scorecard_holes sh LIMIT 5;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'golf_courses') THEN
        SELECT 'golf_courses' AS tbl, gc.* FROM golf_courses gc LIMIT 5;
    END IF;
END //
DELIMITER ;

CALL sp_audit_sample_rows();
DROP PROCEDURE IF EXISTS sp_audit_sample_rows;

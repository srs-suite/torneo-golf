-- Limpiar datos del club ID 1 (San Jerónimo del Rey)
-- Solo socios y tarjetas, mantener club y torneos

-- Deshabilitar verificaciones de llaves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar fotos de tarjetas del club
DELETE sp FROM scorecard_photos sp
JOIN scorecards s ON sp.scorecard_id = s.scorecard_id  
JOIN tournaments t ON s.tournament_id = t.tournament_id
WHERE t.club_id = 1;

-- Eliminar hoyos de tarjetas del club
DELETE sh FROM scorecard_holes sh
JOIN scorecards s ON sh.scorecard_id = s.scorecard_id
JOIN tournaments t ON s.tournament_id = t.tournament_id  
WHERE t.club_id = 1;

-- Eliminar tarjetas del club
DELETE s FROM scorecards s
JOIN tournaments t ON s.tournament_id = t.tournament_id
WHERE t.club_id = 1;

-- Eliminar participantes de torneos del club
DELETE tp FROM tournament_participants tp
JOIN tournaments t ON tp.tournament_id = t.tournament_id
WHERE t.club_id = 1;

-- Eliminar jugadores externos del club
DELETE FROM external_players WHERE club_id = 1;

-- Eliminar socios/miembros del club
DELETE FROM members WHERE club_id = 1;

-- Rehabilitar verificaciones de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar limpieza
SELECT 'Datos del club 1 eliminados' as status;
SELECT COUNT(*) as socios_restantes FROM members WHERE club_id = 1;
SELECT COUNT(*) as tarjetas_restantes FROM scorecards s 
JOIN tournaments t ON s.tournament_id = t.tournament_id 
WHERE t.club_id = 1;


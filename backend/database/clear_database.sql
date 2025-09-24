-- Script para limpiar completamente la base de datos
-- CUIDADO: Esto eliminará TODOS los datos

-- Deshabilitar verificaciones de llaves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar todas las tablas en orden
TRUNCATE TABLE scorecard_photos;
TRUNCATE TABLE scorecard_holes;
TRUNCATE TABLE scorecards;
TRUNCATE TABLE tournament_participants;
TRUNCATE TABLE external_players;
TRUNCATE TABLE empty_tournament_groups;
TRUNCATE TABLE tournaments;
TRUNCATE TABLE members;
TRUNCATE TABLE golf_courses;
TRUNCATE TABLE clubs;

-- Rehabilitar verificaciones de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Mostrar estado final
SELECT 'Base de datos limpia completamente' as status;


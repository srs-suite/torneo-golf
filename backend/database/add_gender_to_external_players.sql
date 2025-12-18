-- Agregar campo gender a external_players
ALTER TABLE external_players 
ADD COLUMN gender ENUM('M', 'F', 'Other') DEFAULT NULL AFTER phone;

-- Agregar campo handicap_local a external_players (por si no existe)
ALTER TABLE external_players 
ADD COLUMN handicap_local DECIMAL(4,1) DEFAULT NULL AFTER handicap_index;


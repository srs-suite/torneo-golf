-- Agregar campo did_not_present a scorecards
-- Este campo marca cuando un jugador no presentó su tarjeta

ALTER TABLE scorecards 
ADD COLUMN did_not_present BOOLEAN DEFAULT FALSE AFTER original_archived;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_did_not_present ON scorecards(did_not_present);


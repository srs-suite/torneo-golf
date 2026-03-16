-- Inscripción por web: si está habilitada, el torneo tiene URL pública para que los jugadores se anoten
-- Ejecutar solo si la columna no existe
ALTER TABLE tournaments
ADD COLUMN public_inscription TINYINT(1) NOT NULL DEFAULT 0
COMMENT '1 = inscripción pública por web habilitada (se genera URL para compartir)'
AFTER status;

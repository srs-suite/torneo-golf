-- Preferencia mañana/tarde para inscripción pública
-- Ejecutar solo si la columna no existe (evitar error en re-ejecución)
ALTER TABLE tournament_participants 
ADD COLUMN tee_time_preference ENUM('morning', 'afternoon') NULL 
COMMENT 'Preferencia del jugador al inscribirse' 
AFTER notes;

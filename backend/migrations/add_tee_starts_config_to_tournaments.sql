-- Configuración de salidas del torneo (consecutivas o simultáneas), definida al crear/editar el torneo.
-- Así no hace falta configurarla en Gestión de Tee Times.

ALTER TABLE tournaments
ADD COLUMN enable_simultaneous_starts TINYINT(1) NOT NULL DEFAULT 0
COMMENT '0 = salidas consecutivas, 1 = salidas simultáneas (shotgun)' AFTER is_ranking_event;

ALTER TABLE tournaments
ADD COLUMN afternoon_start_time VARCHAR(10) NULL DEFAULT '14:00'
COMMENT 'Hora inicio tanda tarde (HH:MM)' AFTER enable_simultaneous_starts;

ALTER TABLE tournaments
ADD COLUMN preferred_session VARCHAR(20) NULL DEFAULT 'morning'
COMMENT 'morning | afternoon' AFTER afternoon_start_time;

ALTER TABLE tournaments
ADD COLUMN tee_interval_minutes INT NULL DEFAULT 10
COMMENT 'Minutos entre grupos (salidas consecutivas)' AFTER preferred_session;

ALTER TABLE tournaments
ADD COLUMN enable_two_sessions TINYINT(1) NOT NULL DEFAULT 0
COMMENT '1 = dos tandas mañana/tarde (solo si salidas simultáneas)' AFTER tee_interval_minutes;

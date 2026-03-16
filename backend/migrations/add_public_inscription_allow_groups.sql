-- Si el torneo se organizará por HCP (el club asigna grupos), deshabilitar en la web
-- la opción de crear grupos o unirse a un grupo; solo inscripción individual.
-- 1 = permitir que los inscriptos formen grupos (por defecto)
-- 0 = solo inscripción individual (grupos asignados por el club/HCP)
ALTER TABLE tournaments
ADD COLUMN public_inscription_allow_groups TINYINT(1) NOT NULL DEFAULT 1
COMMENT '0 = inscripción web solo individual (grupos por HCP); 1 = permitir crear/unirse a grupos'
AFTER public_inscription;

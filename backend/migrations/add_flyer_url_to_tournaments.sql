-- Flyer / imagen del torneo para mostrar en la página de inscripción pública.
-- URL directa a la imagen (ej. enlace público de Google Drive, Imgur, o del mismo servidor).
ALTER TABLE tournaments
ADD COLUMN flyer_url VARCHAR(512) NULL DEFAULT NULL
COMMENT 'URL de la imagen del flyer para inscripción pública'
AFTER public_inscription_allow_groups;

-- Si los grupos se generaron por HCP (reorganizar por handicap), groups_by_hcp = 1.
-- Si están por orden de inscripción / grupos, groups_by_hcp = 0.
-- Así el frontend puede mostrar "Reorganizar por HCP" o "Reorganizar por grupos" según corresponda.
ALTER TABLE tournaments
ADD COLUMN groups_by_hcp TINYINT(1) NOT NULL DEFAULT 0
COMMENT '1 = últimos grupos generados por HCP (serpentina); 0 = por inscripción/grupos'
AFTER public_inscription;

-- Modalidad de resultados y opciones de categorías del torneo.
-- Ejecutar solo si estas columnas no existen en tournaments.

-- results_mode: 'standard' = categorías 0-7.9, 8-13.9, etc. | 'scratch_bands' = Scratch (Gross) + bandas 5-7.9, 8-15.8, 15.9-54
ALTER TABLE tournaments ADD COLUMN results_mode VARCHAR(32) NULL DEFAULT 'standard' AFTER status;
-- separate_ladies: 1 = damas en categorías separadas
ALTER TABLE tournaments ADD COLUMN separate_ladies TINYINT(1) NOT NULL DEFAULT 0 AFTER results_mode;
-- ladies_by_hcp: 1 = damas por handicap (mismas bandas)
ALTER TABLE tournaments ADD COLUMN ladies_by_hcp TINYINT(1) NOT NULL DEFAULT 0 AFTER separate_ladies;
-- is_ranking_event: 1 = evento puntuable para ranking
ALTER TABLE tournaments ADD COLUMN is_ranking_event TINYINT(1) NOT NULL DEFAULT 0 AFTER ladies_by_hcp;

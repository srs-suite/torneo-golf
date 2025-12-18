-- Agregar columna member_id a other_incomes para asociar ingresos con socios
ALTER TABLE other_incomes 
ADD COLUMN member_id INT NULL AFTER club_id,
ADD CONSTRAINT fk_other_incomes_member 
FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL;

CREATE INDEX idx_other_incomes_member ON other_incomes(member_id);


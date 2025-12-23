-- Agregar permiso para ver totales financieros
ALTER TABLE user_permissions
ADD COLUMN can_view_financial_totals BOOLEAN DEFAULT FALSE AFTER can_view_accounting;

-- Dar permiso a admins existentes (opcional)
-- UPDATE user_permissions 
-- SET can_view_financial_totals = TRUE
-- WHERE admin_id IN (SELECT admin_id FROM club_administrators WHERE is_primary_admin = TRUE);


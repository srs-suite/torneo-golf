-- Agregar permisos granulares para Contabilidad
ALTER TABLE user_permissions
ADD COLUMN can_view_balance BOOLEAN DEFAULT TRUE AFTER can_view_accounting,
ADD COLUMN can_view_tournament_incomes BOOLEAN DEFAULT TRUE AFTER can_view_balance,
ADD COLUMN can_manage_tournament_incomes BOOLEAN DEFAULT FALSE AFTER can_view_tournament_incomes,
ADD COLUMN can_view_other_incomes BOOLEAN DEFAULT TRUE AFTER can_manage_tournament_incomes,
ADD COLUMN can_manage_other_incomes BOOLEAN DEFAULT FALSE AFTER can_view_other_incomes,
ADD COLUMN can_view_expenses BOOLEAN DEFAULT TRUE AFTER can_manage_other_incomes,
ADD COLUMN can_manage_expenses BOOLEAN DEFAULT FALSE AFTER can_view_expenses,
ADD COLUMN can_view_currency_exchanges BOOLEAN DEFAULT TRUE AFTER can_manage_expenses,
ADD COLUMN can_manage_currency_exchanges BOOLEAN DEFAULT FALSE AFTER can_view_currency_exchanges;

-- Agregar permisos granulares para Fotos
ALTER TABLE user_permissions
ADD COLUMN can_view_photos BOOLEAN DEFAULT FALSE AFTER can_manage_currency_exchanges,
ADD COLUMN can_manage_photos BOOLEAN DEFAULT FALSE AFTER can_view_photos;

-- Agregar permisos granulares para Rankings
ALTER TABLE user_permissions
ADD COLUMN can_view_rankings BOOLEAN DEFAULT TRUE AFTER can_manage_photos;

-- Por defecto, si tiene can_view_accounting, darle acceso a todo
UPDATE user_permissions 
SET 
  can_view_balance = 1,
  can_view_tournament_incomes = 1,
  can_manage_tournament_incomes = can_manage_payments,
  can_view_other_incomes = 1,
  can_manage_other_incomes = can_manage_payments,
  can_view_expenses = 1,
  can_manage_expenses = can_manage_payments,
  can_view_currency_exchanges = 1,
  can_manage_currency_exchanges = can_manage_payments,
  can_view_rankings = 1
WHERE can_view_accounting = 1;


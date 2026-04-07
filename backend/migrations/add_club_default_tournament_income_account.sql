# Cuenta por defecto del club para ingresos de torneo cuando tournaments.account_id es NULL.
# Idempotente en MariaDB 10.3+ / MySQL 8.0.12+ (ADD COLUMN IF NOT EXISTS).
# En phpMyAdmin: pegar SOLO desde la linea ALTER (o todo el archivo sin lineas con un solo guion).

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS default_tournament_income_account_id INT NULL DEFAULT NULL
  COMMENT 'custodian_accounts: cobros inscriptos si el torneo no tiene account_id';

# Ejemplo manual (ajustar club_id y account_id):
# UPDATE clubs SET default_tournament_income_account_id = 3 WHERE club_id = 1;

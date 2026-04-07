-- Fix errores al registrar cobro de inscripto (PUT .../participants/:id/payment)
-- Idempotente: seguro ejecutar de nuevo (omite columnas/ENUM ya aplicados).

-- Bonificado / waived (el modal envía payment_status = 'waived')
SET @s = COALESCE((
  SELECT IF(
    COLUMN_TYPE LIKE '%waived%',
    'SELECT 1',
    'ALTER TABLE tournament_participants MODIFY COLUMN payment_status ENUM(''pending'', ''paid'', ''refunded'', ''waived'') DEFAULT ''pending'''
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tournament_participants'
    AND COLUMN_NAME = 'payment_status'
  LIMIT 1
), 'SELECT 1');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columnas que el backend espera al actualizar pago
SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE tournament_participants ADD COLUMN fee_amount DECIMAL(12,2) NULL', 'SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants' AND COLUMN_NAME = 'fee_amount');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE tournament_participants ADD COLUMN paid_amount DECIMAL(12,2) NULL', 'SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants' AND COLUMN_NAME = 'paid_amount');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE tournament_participants ADD COLUMN currency VARCHAR(10) NULL DEFAULT ''ARS''', 'SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants' AND COLUMN_NAME = 'currency');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE tournament_participants ADD COLUMN payment_method VARCHAR(80) NULL', 'SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants' AND COLUMN_NAME = 'payment_method');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE tournament_participants ADD COLUMN receipt_number VARCHAR(80) NULL', 'SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants' AND COLUMN_NAME = 'receipt_number');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE tournament_participants ADD COLUMN payment_notes TEXT NULL', 'SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tournament_participants' AND COLUMN_NAME = 'payment_notes');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

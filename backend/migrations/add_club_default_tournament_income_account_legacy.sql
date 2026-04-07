SET @s = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE clubs ADD COLUMN default_tournament_income_account_id INT NULL DEFAULT NULL',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clubs'
    AND COLUMN_NAME = 'default_tournament_income_account_id'
  LIMIT 1
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

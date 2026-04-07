# Si la sync devuelve 500 con "Data truncated for column 'transaction_type'"
# o el valor 'income_tournament' no está en el ENUM, ejecutar UNA vez:

ALTER TABLE account_transactions
  MODIFY COLUMN transaction_type VARCHAR(40) NOT NULL;

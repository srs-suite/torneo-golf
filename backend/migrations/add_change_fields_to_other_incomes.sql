-- Migración: Agregar campos de cambio (vuelto) a other_incomes
-- Permite registrar cuando se recibe un pago en una moneda diferente y se debe devolver cambio

ALTER TABLE other_incomes
ADD COLUMN received_amount DECIMAL(10, 2) NULL COMMENT 'Monto recibido (puede ser diferente al monto a cobrar)',
ADD COLUMN received_currency ENUM('ARS', 'USD') NULL COMMENT 'Moneda en que se recibió el pago',
ADD COLUMN change_amount DECIMAL(10, 2) NULL COMMENT 'Monto de cambio a devolver',
ADD COLUMN change_currency ENUM('ARS', 'USD') NULL COMMENT 'Moneda del cambio a devolver',
ADD COLUMN exchange_rate DECIMAL(10, 4) NULL COMMENT 'Tasa de cambio usada para el cálculo';




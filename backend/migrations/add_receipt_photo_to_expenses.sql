-- Migración: Agregar campo para foto de comprobante en gastos
-- Permite guardar una foto del comprobante de pago para cada gasto

ALTER TABLE club_expenses
ADD COLUMN receipt_photo_path VARCHAR(500) NULL COMMENT 'Ruta del archivo de foto del comprobante';




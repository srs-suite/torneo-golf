-- Tabla para registrar otros ingresos (no relacionados con torneos)
CREATE TABLE IF NOT EXISTS other_incomes (
    income_id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    income_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type ENUM('efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro') DEFAULT 'efectivo',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
    INDEX idx_club_income_date (club_id, income_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


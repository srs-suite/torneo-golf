-- Tabla para registrar gastos del club
CREATE TABLE IF NOT EXISTS club_expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    receipt_number VARCHAR(100),
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
    INDEX idx_club_expense_date (club_id, expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


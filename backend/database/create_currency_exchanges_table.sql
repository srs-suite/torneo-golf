-- Tabla para registrar conversiones de moneda
CREATE TABLE IF NOT EXISTS currency_exchanges (
    exchange_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    exchange_date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    from_amount DECIMAL(10,2) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    to_amount DECIMAL(10,2) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(course_id) ON DELETE CASCADE,
    INDEX idx_club_date (club_id, exchange_date),
    INDEX idx_club_currency (club_id, from_currency, to_currency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


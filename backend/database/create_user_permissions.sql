-- Tabla para almacenar los permisos de cada usuario
CREATE TABLE IF NOT EXISTS user_permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    
    -- Permisos de menú/vistas
    can_view_members BOOLEAN DEFAULT TRUE,
    can_view_tournaments BOOLEAN DEFAULT TRUE,
    can_view_groups BOOLEAN DEFAULT TRUE,
    can_view_scorecards BOOLEAN DEFAULT TRUE,
    can_view_photos BOOLEAN DEFAULT TRUE,
    can_view_settings BOOLEAN DEFAULT FALSE,
    can_view_rankings BOOLEAN DEFAULT TRUE,
    can_view_accounting BOOLEAN DEFAULT FALSE,
    
    -- Permisos de acciones
    can_create_members BOOLEAN DEFAULT TRUE,
    can_edit_members BOOLEAN DEFAULT TRUE,
    can_delete_members BOOLEAN DEFAULT FALSE,
    
    can_create_tournaments BOOLEAN DEFAULT TRUE,
    can_edit_tournaments BOOLEAN DEFAULT TRUE,
    can_delete_tournaments BOOLEAN DEFAULT FALSE,
    
    can_manage_participants BOOLEAN DEFAULT TRUE,
    can_manage_groups BOOLEAN DEFAULT TRUE,
    can_manage_scorecards BOOLEAN DEFAULT TRUE,
    can_manage_payments BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES club_administrators(admin_id) ON DELETE CASCADE,
    INDEX idx_admin_permissions (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear permisos completos para administradores existentes
INSERT INTO user_permissions (
    admin_id, 
    can_view_settings, 
    can_view_accounting,
    can_delete_members,
    can_delete_tournaments,
    can_manage_payments
)
SELECT 
    ca.admin_id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
FROM club_administrators ca
LEFT JOIN user_permissions up ON ca.admin_id = up.admin_id
WHERE ca.is_primary_admin = TRUE AND up.admin_id IS NULL;


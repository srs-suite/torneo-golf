# 🚀 GUÍA DE IMPLEMENTACIÓN - SISTEMA MULTI-CLUB

## 📋 PASOS DE IMPLEMENTACIÓN

### **FASE 1: PREPARACIÓN DEL SISTEMA**

#### 1.1 Backup de Seguridad
```bash
# Crear backup completo antes de la migración
mysqldump -u root -p golf_tournament_system > backup_pre_multiclub.sql
```

#### 1.2 Ejecutar Script de Migración
```sql
-- Ejecutar el archivo de migración
SOURCE database_design_multiclub.sql;
```

#### 1.3 Verificar Migración
```sql
-- Verificar que todas las tablas fueron creadas
SHOW TABLES LIKE '%club%';
SHOW TABLES LIKE '%system%';

-- Verificar que las columnas fueron agregadas
DESCRIBE golf_courses;
DESCRIBE players;
DESCRIBE tournaments;
```

---

### **FASE 2: CONFIGURACIÓN INICIAL**

#### 2.1 Crear Administrador General
```sql
-- Crear el primer administrador del sistema
INSERT INTO system_administrators (
    username, email, password_hash, full_name, phone
) VALUES (
    'admin_sistema', 
    'admin@tudominio.com', 
    SHA2('TuPassword123!', 256), 
    'Administrador General', 
    '+54 11 1234-5678'
);
```

#### 2.2 Configurar Clubes Existentes
```sql
-- Asignar códigos y configuración a clubes existentes
UPDATE golf_courses SET 
    club_code = 'CLUB001',
    subscription_status = 'active',
    subscription_start = CURDATE(),
    subscription_end = DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
    max_members = 300,
    created_by = 1
WHERE course_id = 1;

-- Repetir para cada club existente con códigos únicos
```

#### 2.3 Crear Administradores de Clubes
```sql
-- Crear administrador para cada club
INSERT INTO club_administrators (
    course_id, username, email, password_hash, 
    full_name, is_primary_admin, created_by
) VALUES 
(1, 'admin_club1', 'admin@club1.com', SHA2('admin123', 256), 
 'Admin Club 1', TRUE, 1);
```

---

### **FASE 3: MIGRACIÓN DE JUGADORES**

#### 3.1 Migrar Jugadores Existentes a Membresías
```sql
-- Script para migrar jugadores existentes
-- Asumiendo que quieres asignar todos los jugadores al club 1 inicialmente

INSERT INTO club_memberships (
    course_id, player_id, member_number, membership_type, 
    handicap_index, is_home_club, joined_date
)
SELECT 
    1 as course_id,  -- Club por defecto
    player_id,
    CONCAT('M', LPAD(player_id, 4, '0')) as member_number,
    'full' as membership_type,
    handicap_index,
    TRUE as is_home_club,
    COALESCE(created_at, CURDATE()) as joined_date
FROM players 
WHERE is_active = TRUE;

-- Actualizar primary_course_id en players
UPDATE players p 
JOIN club_memberships cm ON p.player_id = cm.player_id 
SET p.primary_course_id = cm.course_id 
WHERE cm.is_home_club = TRUE;
```

#### 3.2 Actualizar Torneos Existentes
```sql
-- Asignar organizing_course_id a torneos existentes
UPDATE tournaments 
SET organizing_course_id = course_id 
WHERE organizing_course_id IS NULL;
```

---

### **FASE 4: CREACIÓN DE INTERFACES**

#### 4.1 Interface de Administrador General
Crear archivos para gestión del sistema:

```html
<!-- admin_sistema.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Administración General - Golf System</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="admin-container">
        <header>
            <h1>🔧 Administración General del Sistema</h1>
            <nav>
                <a href="#clubes">Gestión de Clubes</a>
                <a href="#admins">Administradores</a>
                <a href="#reportes">Reportes</a>
                <a href="#configuracion">Configuración</a>
            </nav>
        </header>
        
        <main>
            <section id="clubes">
                <h2>📋 Gestión de Clubes</h2>
                <div class="clubs-grid">
                    <!-- Listado de clubes con controles -->
                    <div class="club-card">
                        <h3>Club Los Pinos</h3>
                        <p>Status: Activo | Miembros: 150/300</p>
                        <div class="club-actions">
                            <button onclick="editClub(1)">Editar</button>
                            <button onclick="viewStats(1)">Estadísticas</button>
                            <button onclick="manageSubscription(1)">Suscripción</button>
                        </div>
                    </div>
                </div>
                <button class="btn-primary" onclick="createNewClub()">+ Crear Nuevo Club</button>
            </section>
            
            <section id="stats">
                <h2>📊 Estadísticas Generales</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Clubes</h3>
                        <span class="stat-number">3</span>
                    </div>
                    <div class="stat-card">
                        <h3>Jugadores Activos</h3>
                        <span class="stat-number">1,247</span>
                    </div>
                    <div class="stat-card">
                        <h3>Torneos Este Mes</h3>
                        <span class="stat-number">15</span>
                    </div>
                </div>
            </section>
        </main>
    </div>
    
    <script src="admin_sistema.js"></script>
</body>
</html>
```

#### 4.2 Interface de Administrador de Club
```html
<!-- admin_club.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Administración de Club - Golf System</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="club-admin-container">
        <header>
            <h1>🏌️ Administración - [Nombre del Club]</h1>
            <nav>
                <a href="#miembros">Miembros</a>
                <a href="#torneos">Torneos</a>
                <a href="#usuarios">Usuarios</a>
                <a href="#reportes">Reportes</a>
            </nav>
        </header>
        
        <main>
            <section id="miembros">
                <h2>👥 Gestión de Miembros</h2>
                <div class="members-controls">
                    <button onclick="importMembers()">📁 Importar Excel</button>
                    <button onclick="exportMembers()">📤 Exportar</button>
                    <button onclick="addMember()">+ Agregar Miembro</button>
                </div>
                
                <div class="search-bar">
                    <input type="text" placeholder="Buscar miembros..." id="memberSearch">
                    <button onclick="searchMembers()">🔍</button>
                </div>
                
                <table class="members-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>N° Socio</th>
                            <th>Handicap</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="membersTableBody">
                        <!-- Datos cargados dinámicamente -->
                    </tbody>
                </table>
            </section>
            
            <section id="torneos">
                <h2>🏆 Gestión de Torneos</h2>
                <div class="tournament-controls">
                    <button onclick="createTournament()">+ Crear Torneo</button>
                    <label>
                        <input type="checkbox" id="allowVisitors"> Permitir Visitantes
                    </label>
                </div>
                
                <div class="tournaments-grid">
                    <!-- Torneos del club -->
                </div>
            </section>
        </main>
    </div>
    
    <script src="admin_club.js"></script>
</body>
</html>
```

---

### **FASE 5: SCRIPTS DE GESTIÓN**

#### 5.1 Funciones JavaScript para Administración
```javascript
// admin_sistema.js
class SystemAdmin {
    constructor() {
        this.apiUrl = '/api/system';
        this.loadDashboard();
    }
    
    async loadDashboard() {
        try {
            const clubs = await this.fetchClubs();
            this.renderClubs(clubs);
            
            const stats = await this.fetchStats();
            this.renderStats(stats);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }
    
    async createNewClub() {
        const modal = this.createClubModal();
        document.body.appendChild(modal);
    }
    
    createClubModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Crear Nuevo Club</h2>
                <form id="newClubForm">
                    <div class="form-group">
                        <label>Código del Club:</label>
                        <input type="text" id="clubCode" required>
                    </div>
                    <div class="form-group">
                        <label>Nombre del Club:</label>
                        <input type="text" id="clubName" required>
                    </div>
                    <div class="form-group">
                        <label>Email Admin:</label>
                        <input type="email" id="adminEmail" required>
                    </div>
                    <div class="form-group">
                        <label>Máximo Miembros:</label>
                        <input type="number" id="maxMembers" value="300">
                    </div>
                    <div class="form-actions">
                        <button type="submit">Crear Club</button>
                        <button type="button" onclick="this.closest('.modal').remove()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.querySelector('#newClubForm').addEventListener('submit', this.handleCreateClub.bind(this));
        return modal;
    }
    
    async handleCreateClub(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        try {
            const response = await fetch(this.apiUrl + '/clubs', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData)),
                headers: {'Content-Type': 'application/json'}
            });
            
            if (response.ok) {
                alert('Club creado exitosamente');
                this.loadDashboard();
                event.target.closest('.modal').remove();
            }
        } catch (error) {
            console.error('Error creating club:', error);
        }
    }
}

// Inicializar cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    new SystemAdmin();
});
```

#### 5.2 Funciones para Búsqueda de Jugadores Inter-Club
```javascript
// club_tournaments.js
class TournamentManager {
    constructor(clubId) {
        this.clubId = clubId;
        this.apiUrl = '/api/club/' + clubId;
    }
    
    async searchPlayersForTournament(searchTerm) {
        try {
            const response = await fetch(`${this.apiUrl}/search-players`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    search_term: searchTerm,
                    organizing_course_id: this.clubId
                })
            });
            
            const players = await response.json();
            this.renderPlayerSearch(players);
        } catch (error) {
            console.error('Error searching players:', error);
        }
    }
    
    renderPlayerSearch(players) {
        const container = document.getElementById('playerSearchResults');
        container.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <div class="player-info">
                    <h3>${player.full_name}</h3>
                    <p>Handicap: ${player.handicap_index || 'N/A'}</p>
                    <p>Club: ${player.home_club || 'Sin club'}</p>
                    ${player.is_visitor ? '<span class="visitor-badge">VISITANTE</span>' : '<span class="local-badge">LOCAL</span>'}
                </div>
                <div class="player-actions">
                    <button onclick="this.invitePlayer(${player.player_id}, ${player.is_visitor})">
                        ${player.is_visitor ? 'Invitar como Visitante' : 'Agregar al Torneo'}
                    </button>
                </div>
            `;
            container.appendChild(playerCard);
        });
    }
    
    async invitePlayer(playerId, isVisitor) {
        if (isVisitor) {
            // Mostrar modal para configurar visitante
            this.showVisitorModal(playerId);
        } else {
            // Agregar directamente al torneo
            await this.addPlayerToTournament(playerId);
        }
    }
    
    showVisitorModal(playerId) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Configurar Jugador Visitante</h2>
                <form id="visitorForm">
                    <input type="hidden" value="${playerId}" name="player_id">
                    <div class="form-group">
                        <label>Handicap para este torneo:</label>
                        <input type="number" step="0.1" name="visitor_handicap" required>
                    </div>
                    <div class="form-group">
                        <label>Notas adicionales:</label>
                        <textarea name="notes"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit">Confirmar Invitación</button>
                        <button type="button" onclick="this.closest('.modal').remove()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.querySelector('#visitorForm').addEventListener('submit', this.handleVisitorInvite.bind(this));
        document.body.appendChild(modal);
    }
}
```

---

### **FASE 6: API ENDPOINTS**

#### 6.1 Endpoints para Administración General
```javascript
// En server.js - agregar nuevos endpoints

// Gestión de clubes
app.get('/api/system/clubs', async (req, res) => {
    try {
        const query = `
            SELECT * FROM club_overview 
            ORDER BY course_name
        `;
        const [clubs] = await db.execute(query);
        res.json(clubs);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.post('/api/system/clubs', async (req, res) => {
    try {
        const {clubCode, clubName, adminEmail, adminPassword, maxMembers} = req.body;
        
        // Llamar al procedimiento almacenado
        const query = `CALL CreateNewClub(?, ?, 'admin', ?, SHA2(?, 256), 'Administrador Principal', NULL, ?, 1)`;
        const [result] = await db.execute(query, [
            clubCode, clubName, adminEmail, adminPassword, maxMembers
        ]);
        
        res.json({success: true, result});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Búsqueda de jugadores inter-club
app.post('/api/club/:clubId/search-players', async (req, res) => {
    try {
        const {clubId} = req.params;
        const {search_term} = req.body;
        
        const query = `CALL SearchPlayersForTournament(?, ?, 20)`;
        const [players] = await db.execute(query, [search_term, clubId]);
        
        res.json(players);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Registro de visitante en torneo
app.post('/api/tournaments/:tournamentId/visitors', async (req, res) => {
    try {
        const {tournamentId} = req.params;
        const {player_id, visitor_handicap, visiting_from_course_id} = req.body;
        
        const query = `CALL RegisterVisitorInTournament(?, ?, ?, ?)`;
        await db.execute(query, [
            tournamentId, player_id, visitor_handicap, visiting_from_course_id
        ]);
        
        res.json({success: true});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Acceso móvil por teléfono
app.post('/api/mobile/auth/phone', async (req, res) => {
    try {
        const {phone_number} = req.body;
        
        // Verificar que el teléfono está registrado
        const query = `
            SELECT p.player_id, p.first_name, p.last_name 
            FROM players p 
            WHERE p.phone = ? AND p.is_active = TRUE
        `;
        const [players] = await db.execute(query, [phone_number]);
        
        if (players.length === 0) {
            return res.status(404).json({error: 'Teléfono no registrado'});
        }
        
        // Generar código de verificación
        const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Guardar en base de datos
        const insertQuery = `
            INSERT INTO player_phone_access (player_id, phone_number, verification_code)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                verification_code = VALUES(verification_code),
                updated_at = CURRENT_TIMESTAMP
        `;
        await db.execute(insertQuery, [players[0].player_id, phone_number, verification_code]);
        
        // En producción, enviar SMS aquí
        console.log(`Código de verificación para ${phone_number}: ${verification_code}`);
        
        res.json({
            success: true, 
            message: 'Código de verificación enviado',
            // Solo para desarrollo - eliminar en producción
            verification_code: verification_code
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});
```

---

### **FASE 7: TESTING Y VALIDACIÓN**

#### 7.1 Script de Testing
```sql
-- Test 1: Verificar creación de club
CALL CreateNewClub(
    'TEST001', 'Club de Prueba', 'admin_test', 'test@test.com', 
    SHA2('test123', 256), 'Admin Test', '1234567890', 100, 1
);

-- Test 2: Agregar jugador al club
CALL AddPlayerToClub(
    LAST_INSERT_ID(), 1, 'TEST001', 'full', 15.5, TRUE
);

-- Test 3: Buscar jugadores
CALL SearchPlayersForTournament('Juan', 1, 10);

-- Test 4: Verificar vistas
SELECT * FROM club_overview;
SELECT * FROM players_with_clubs LIMIT 5;
```

#### 7.2 Checklist de Validación
- [ ] Migración completada sin errores
- [ ] Clubes existentes funcionan normalmente
- [ ] Nuevos clubes se pueden crear
- [ ] Jugadores se pueden buscar entre clubes
- [ ] Visitantes se pueden registrar en torneos
- [ ] Acceso móvil por teléfono funciona
- [ ] Historial de jugadores se mantiene
- [ ] Permisos de acceso funcionan correctamente

---

### **FASE 8: DEPLOYMENT**

#### 8.1 Configuración de Producción
1. **Backup completo** antes de aplicar cambios
2. **Aplicar migración** en horario de menor uso
3. **Verificar funcionamiento** de clubes existentes
4. **Capacitar administradores** en nuevas funcionalidades
5. **Monitorear sistema** durante primeros días

#### 8.2 Documentación para Usuarios
- Manual de administrador general
- Manual de administrador de club
- Guía de usuario móvil
- Procedimientos de soporte

---

## ✅ RESULTADO FINAL

Con esta implementación tendrás:

- 🏢 **Sistema Multi-Club** completamente funcional
- 👥 **Administración Jerárquica** con diferentes niveles de acceso
- 🔄 **Compartición de Datos** entre clubes de forma controlada
- 📱 **Acceso Móvil** simplificado para jugadores
- 📊 **Reportes Consolidados** para cada nivel
- 🔒 **Seguridad y Privacidad** de datos por club
- 📈 **Escalabilidad** para agregar más clubes fácilmente

El sistema mantiene **100% de compatibilidad** con el funcionamiento actual mientras agrega todas las nuevas capacidades multi-club.

# 👨‍💼 Sistema de Gestión de Grupos - Organizador

## 📋 **Interfaz del Organizador para Armar Grupos**

### **1. VISTA DE INSCRIPTOS CON DATOS COMPLETOS**

```sql
-- Vista principal para el organizador
SELECT * FROM tournament_registered_players WHERE tournament_id = 1;
```

**El organizador ve una tabla con:**
- ✅ **Nombre completo** del jugador  
- ✅ **Handicap Index** original
- ✅ **Course Handicap** calculado
- ✅ **Teléfono y email** de contacto
- ✅ **Estado** (inscripto/confirmado/check-in realizado)
- ✅ **Categoría sugerida** basada en handicap
- ✅ **Grupo asignado** (si ya tiene)

### **Ejemplo de tabla que ve el organizador:**

| Jugador | Handicap Index | Course Handicap | Teléfono | Estado | Categoría Sugerida | Grupo Actual |
|---------|----------------|-----------------|----------|--------|--------------------|--------------|
| Juan Pérez | 15.2 | 17 | +549-1234-5678 | 📝 Inscripto | Segunda (13-20) | Sin asignar |
| María González | 8.5 | 9 | +549-8765-4321 | ⏳ Confirmado | Primera (0-12) | Sin asignar |
| Carlos Rodríguez | 22.1 | 25 | +549-5555-1111 | ✅ Check-in realizado | Tercera (21-28) | Grupo A |
| Ana López | 6.2 | 7 | +549-9999-8888 | 📝 Inscripto | Primera (0-12) | Sin asignar |

---

## 🎯 **FUNCIONALIDADES DEL ORGANIZADOR**

### **2. CREAR GRUPOS MANUALMENTE**

```sql
-- El organizador puede crear grupos específicos
CALL CreatePlayingGroupManual(
    1,                -- tournament_id
    'Grupo VIP',      -- group_name
    1,                -- starting_hole
    '08:00:00',       -- tee_time
    '18'              -- holes_to_play
);
```

**Campos configurables:**
- ✅ **Nombre del grupo** (ej: "Grupo VIP", "Grupo Principiantes")
- ✅ **Hoyo de salida** (1-18 para salidas simultáneas)
- ✅ **Horario de salida** (cada 10 minutos típicamente)
- ✅ **Cantidad de hoyos** (9 o 18)

### **3. ASIGNAR JUGADORES A GRUPOS**

```sql
-- Asignar jugador específico a grupo específico
CALL AssignPlayerToGroup(
    1,    -- tournament_id
    1,    -- player_id (Juan Pérez)
    1     -- group_id (Grupo VIP)
);
```

**El organizador puede:**
- ✅ **Arrastrar y soltar** jugadores a grupos
- ✅ **Balancear por handicap** para competencia justa
- ✅ **Agrupar por categorías** (Primera, Segunda, etc.)
- ✅ **Considerar relaciones** (amigos que quieren jugar juntos)

### **4. SUGERENCIAS AUTOMÁTICAS POR HANDICAP**

```sql
-- Obtener sugerencias automáticas
CALL SuggestGroupsByHandicap(1, 4); -- Torneo 1, grupos de 4
```

**El sistema sugiere:**
- ✅ **Grupos balanceados** por handicap
- ✅ **Horarios automáticos** (cada 10 minutos)
- ✅ **Distribución equitativa** de niveles
- ✅ **Optimización** de tiempos de juego

**Ejemplo de sugerencia:**

| Grupo | Jugador | Course Handicap | Horario | Hoyo Inicio |
|-------|---------|-----------------|---------|-------------|
| **Grupo A** | Ana López | 7 | 08:00 | 1 |
| **Grupo A** | María González | 9 | 08:00 | 1 |
| **Grupo A** | Juan Pérez | 17 | 08:00 | 1 |
| **Grupo A** | Carlos Rodríguez | 25 | 08:00 | 1 |
| **Grupo B** | Luis Martín | 12 | 08:10 | 1 |
| **Grupo B** | Pedro Sánchez | 14 | 08:10 | 1 |

---

## 🔧 **HERRAMIENTAS DE GESTIÓN AVANZADA**

### **5. REASIGNAR JUGADORES**

```sql
-- Mover jugador de un grupo a otro
CALL RemovePlayerFromGroup(1, 1);  -- Remover de grupo actual
CALL AssignPlayerToGroup(1, 1, 3); -- Asignar a nuevo grupo
```

### **6. CONFIGURAR SALIDAS SIMULTÁNEAS**

**El organizador puede:**
- ✅ **Grupo A** → Salida hoyo 1 a las 08:00
- ✅ **Grupo B** → Salida hoyo 10 a las 08:00  
- ✅ **Grupo C** → Salida hoyo 1 a las 08:10
- ✅ **Grupo D** → Salida hoyo 10 a las 08:10

```sql
-- Configurar salidas simultáneas
CALL CreatePlayingGroupManual(1, 'Grupo A', 1, '08:00:00', '18');
CALL CreatePlayingGroupManual(1, 'Grupo B', 10, '08:00:00', '18');
```

### **7. MONITOR DE ESTADO EN TIEMPO REAL**

```sql
-- Ver estado de todos los grupos
SELECT * FROM playing_groups_detail WHERE tournament_id = 1;
```

**El organizador ve:**
- ✅ **Jugadores por grupo** y sus handicaps
- ✅ **Quién hizo check-in** el día del torneo
- ✅ **Grupos completos vs incompletos**
- ✅ **Horarios y hoyos** de cada salida

---

## 📱 **INTERFAZ WEB PARA EL ORGANIZADOR**

### **8. PANTALLA PRINCIPAL DE GESTIÓN**

```html
<!-- Ejemplo de interfaz -->
<div class="tournament-management">
    <div class="left-panel">
        <h3>Jugadores Inscriptos (24)</h3>
        <table class="players-list">
            <tr draggable="true" data-player="1">
                <td>Juan Pérez</td>
                <td>HC: 17</td>
                <td>📱 +549-1234</td>
                <td>📝 Inscripto</td>
            </tr>
            <!-- Más jugadores... -->
        </table>
        
        <button onclick="suggestGroups()">
            🤖 Sugerir Grupos Automáticamente
        </button>
    </div>
    
    <div class="right-panel">
        <h3>Grupos Armados</h3>
        
        <div class="group-card" data-group="1">
            <h4>Grupo A - 08:00 - Hoyo 1</h4>
            <div class="group-players dropzone">
                <div class="player-card">Ana López (HC: 7)</div>
                <div class="player-card">María González (HC: 9)</div>
                <!-- Espacio para arrastrar más jugadores -->
            </div>
            <button onclick="startGroup(1)">▶️ Iniciar Grupo</button>
        </div>
        
        <button onclick="createNewGroup()">
            ➕ Crear Nuevo Grupo
        </button>
    </div>
</div>
```

---

## 🎯 **FLUJO TÍPICO DEL ORGANIZADOR**

### **📋 Antes del Torneo:**

1. **Ver lista de inscriptos**
   ```sql
   SELECT * FROM tournament_registered_players WHERE tournament_id = 1;
   ```

2. **Obtener sugerencias automáticas**
   ```sql
   CALL SuggestGroupsByHandicap(1, 4);
   ```

3. **Ajustar grupos manualmente**
   - Balancear handicaps
   - Agrupar amigos
   - Considerar horarios especiales

4. **Configurar horarios y salidas**
   - Definir intervalos (8, 10, 12 minutos)
   - Configurar salidas simultáneas si es necesario
   - Establecer hoyos de inicio

### **📱 Día del Torneo:**

1. **Monitor de check-in**
   ```sql
   SELECT * FROM tournament_checkin_status WHERE tournament_id = 1;
   ```

2. **Ajustar grupos según asistencia**
   - Algunos inscriptos pueden no llegar
   - Reasignar jugadores entre grupos
   - Balancear grupos incompletos

3. **Iniciar grupos progresivamente**
   ```sql
   CALL StartPlayingGroup(1); -- Cuando grupo está listo
   ```

---

## 📊 **REPORTES PARA EL ORGANIZADOR**

### **Vista de Resumen:**
```sql
SELECT 
    COUNT(*) as total_inscriptos,
    COUNT(CASE WHEN registration_status = 'checked_in' THEN 1 END) as hicieron_checkin,
    COUNT(DISTINCT group_name) as grupos_creados,
    AVG(course_handicap) as handicap_promedio
FROM tournament_registered_players 
WHERE tournament_id = 1;
```

### **Análisis de Balance de Grupos:**
```sql
SELECT 
    group_name,
    COUNT(*) as jugadores,
    MIN(course_handicap) as hc_min,
    MAX(course_handicap) as hc_max,
    AVG(course_handicap) as hc_promedio,
    tee_time,
    starting_hole
FROM tournament_registered_players 
WHERE tournament_id = 1 AND group_name IS NOT NULL
GROUP BY group_name, tee_time, starting_hole
ORDER BY tee_time;
```

**Este sistema le da al organizador control total para crear grupos balanceados considerando handicaps, horarios, salidas simultáneas y preferencias especiales, mientras mantiene la flexibilidad para ajustes de último momento.**

# Auditoría de base de datos — Integración AAG (Torneogolf / TeeTracker Pro)

> **Nota:** Este documento se armó a partir del **código y scripts SQL del repositorio**. No se ejecutó SQL contra tu servidor. Para datos reales (filas de ejemplo, `SHOW CREATE` exacto), ejecutá `backend/database/AUDITORIA_AAG.sql` en tu base.

---

## Script SQL adaptado

| Archivo | Uso |
|--------|-----|
| `backend/database/AUDITORIA_AAG.sql` | Listado de tablas, columnas sensibles, FKs, muestras por tabla (procedimiento que omite tablas inexistentes). |

El script original que pegaste refería tablas como `players`, `golfers`, `visitors`, `tournament_players`, `registrations` **que no son los nombres usados por esta aplicación**. El adaptado usa: `members`, `external_players`, `tournament_participants`, `tournaments`, `scorecards`, etc.

---

## Objetivos respondidos

### 1) ¿Dónde están los socios / jugadores del club?

**Tabla principal: `members`**

- Un socio pertenece a un **club/campo** mediante `course_id` (en el código actual suele tratarse como identificador del club en la API: `clubId`).
- Campos típicos: `member_id`, `course_id`, `member_number`, `first_name`, `last_name`, `email`, `phone`, `gender`, `handicap_index`, `handicap_local`, `membership_status`, etc.

### 2) ¿Dónde están los no socios / visitantes / externos?

- **`external_players`**: jugadores **no** cargados como socios del club en `members` (invitados, otros clubes, etc.). Tiene `full_name`, `handicap_index`, `handicap_local`, `home_club`, `phone`, `email`, y en migraciones `member_number` opcional.
- **`tournament_participants.player_type`**: discrimina cómo se inscribió en **ese torneo**:
  - `'member'`: enlace a `members.member_id`
  - `'visitor'`: suele ser socio de otro contexto o visitante modelado con `member_id` (según flujo)
  - `'external'`: enlace a `external_players.external_id` (`external_player_id` en la fila de participación)

### 3) ¿Dónde se guarda el **índice** actual del jugador?

| Entidad | Tabla | Columna |
|--------|--------|---------|
| Socio | `members` | `handicap_index` (DECIMAL, índice de juego) |
| Externo | `external_players` | `handicap_index` |

El índice se actualiza desde gestión de socios / jugador externo; puede propagarse a torneos activos vía lógica de aplicación sobre `tournament_participants.handicap_used` (no siempre hay columna de “índice sellado” en participación — ver punto 5).

### 4) ¿Dónde se guarda el **HCP** (handicap de juego / local)?

| Entidad | Tabla | Columna |
|--------|--------|---------|
| Socio | `members` | `handicap_local` (HCP entero o calculado según reglas del club en frontend/backend) |
| Externo | `external_players` | `handicap_local` |
| Hoyo del campo | `course_holes` | `handicap` o `handicap_index` (según script): es el **orden de hándicap del hoyo**, no el del jugador |

### 5) ¿Dónde queda “sellado” index y HCP al participar en un torneo?

**Tabla: `tournament_participants`**

- **`handicap_used`**: es el valor que la aplicación guarda como **HCP usado en el torneo** al inscribir o al actualizar participante. Es el principal campo de “sellado” para cómputos de lista de jugadores y resultados cuando se usa el valor del torneo.
- **`participation_id`**: PK lógica de la inscripción (nombre de columna en el código: a veces expuesto como `participant_id` en API).

**Importante:** En el código actual, el **índice en bruto** del jugador en la fila de participación **no siempre se duplica** en una columna propia; al listar participantes se hace **JOIN** con `members` / `external_players` para leer `handicap_index` y `handicap_local` actuales. Para integración AAG, si necesitás **snapshot de índice al momento de inscripción**, probablemente haya que **agregar columna** (ej. `handicap_index_at_registration`) o acordar regla de negocio con el HCP sellado en `handicap_used`.

**Tarjetas (`scorecards`):** Los totales `total_gross`, `total_net` reflejan la ronda; el HCP aplicado en neto se resuelve en aplicación a partir de datos de jugador + reglas (p. ej. índice negativo). No sustituyen el “sellado” de inscripción en `handicap_used`.

### 6) Tablas de torneos, participantes, tarjetas y scores

| Tabla | Rol |
|-------|-----|
| `tournaments` | Torneo: fechas, estado, configuración, `course_id`, cuotas, modos de resultado, etc. |
| `tournament_participants` | Inscripción: torneo + jugador (`member_id` o `external_player_id`), `handicap_used`, grupo, tee time, pago, turno preferido, etc. |
| `scorecards` | Una tarjeta por jugador y torneo (`tournament_id` + `member_id` **o** `external_player_id`), totales, método de carga. |
| `scorecard_holes` | Golpes por hoyo: `scorecard_id`, `hole_number`, `strokes`, etc. |
| `scorecard_photos` | Opcional: fotos / OCR |

### 7) ¿Existe matrícula AAG o campo homónimo?

- **No hay columna dedicada `aag_*`** en los esquemas revisados del repo.
- La **matrícula / número de socio del club** se modela como **`members.member_number`** (y a veces **`external_players.member_number`** si se migró).
- La API pública puede aceptar alias `matricula` en JSON pero lo mapea a **`member_number`**.

Para federación AAG suele hacer falta un campo explícito (ej. `aag_registration_number` o vínculo a ID federativo) si no alcanza con homologar `member_number`.

### 8) Relaciones entre tablas (resumen)

```
golf_courses (course_id)     ← “club/campo” en muchos endpoints (clubId = course_id)
    ↑ FK: course_id
members
    ↑ FK: member_id (o external_player_id)
tournament_participants  ←→  tournaments (tournament_id)
    │
    └── player_type: member | visitor | external

scorecards  →  tournaments (tournament_id), golf_courses (course_id)
            →  members (member_id)  XOR  external_players (external_player_id)

scorecard_holes  →  scorecards (scorecard_id)

external_players  ←  tournament_participants (external_player_id)
```

Instalaciones antiguas pueden tener también `clubs` + `golf_courses.club_id`; otras pueden tener unificado `golf_courses` como tabla única de club.

---

## Tablas relevantes (lista corta)

| Tabla | Prioridad AAG |
|-------|----------------|
| `members` | Alta — socios, index, HCP local, matrícula club |
| `external_players` | Alta — no socios |
| `tournaments` | Alta |
| `tournament_participants` | Alta — sellado HCP torneo, vínculo jugador |
| `scorecards` / `scorecard_holes` | Alta — resultados |
| `golf_courses` (y `clubs` si existe) | Media — identidad del club |
| `course_holes` | Media — par / handicap de hoyo (no jugador) |
| `club_administrators`, `club_users`, `user_permissions` | Baja para HCP, útil para auditoría de acceso |
| `activity_logs` | Baja / trazabilidad |
| `handicap_history` | Media si existe en tu BD (diseño multiclub histórico en `database_design_multiclub.sql`) |

---

## Estructura esperada (referencia código; tu `SHOW CREATE` puede diferir)

### `members` (extracto)

- PK: `member_id`
- FK típico: `course_id` → `golf_courses(course_id)`
- **Índice jugador:** `handicap_index`
- **HCP:** `handicap_local`
- **Matrícula club:** `member_number`

### `external_players`

- PK: `external_id`
- `handicap_index`, `handicap_local`, `home_club`, `full_name`, `phone`, `email`, `gender` (migraciones), `member_number` (migración)

### `tournament_participants`

- PK: `participation_id` (nombre usado en queries)
- FK: `tournament_id` → `tournaments`
- `member_id` NULL si es externo; `external_player_id` si `player_type = 'external'`
- **Sellado HCP torneo:** `handicap_used`
- `group_number`, `tee_time`, `tee_time_preference`, `payment_status`, etc.

### `tournaments`

- PK: `tournament_id`
- FK: `course_id` → club/campo

### `scorecards`

- PK: `scorecard_id`
- FK: `tournament_id`, `course_id`
- `member_id` o `external_player_id` (exclusivo)
- `total_gross`, `total_net`, `front_nine`, `back_nine`, `holes_completed`, …

### `scorecard_holes`

- PK: `hole_id` (o similar)
- FK: `scorecard_id`
- `hole_number`, `strokes`, …

---

## Claves primarias y foráneas

Ejecutá en tu base:

```sql
-- Ya incluido en AUDITORIA_AAG.sql — sección KEY_COLUMN_USAGE
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
```

---

## Columnas relacionadas con index, hcp, handicap, AAG, matrícula, club

Ejecutá la **sección 4** de `AUDITORIA_AAG.sql` (consulta filtrada por nombres de columna). En el repo aparecen al menos:

- `members`: `handicap_index`, `handicap_local`, `member_number`, `course_id`
- `external_players`: `handicap_index`, `handicap_local`, `home_club`, `member_number` (si migró)
- `tournament_participants`: `handicap_used`, `player_club` (snapshot texto en algunos inserts de externos)
- `course_holes`: `handicap` / `handicap_index` (hoyo, no jugador)

---

## 3–5 registros de ejemplo por tabla

No se incluyen filas reales (no hay conexión a tu BD). Opciones:

1. Ejecutar **`CALL sp_audit_sample_rows()`** al final de `AUDITORIA_AAG.sql` (genera hasta 7 result sets con hasta 5 filas cada uno).
2. O manualmente: `SELECT * FROM members LIMIT 5;` etc.

Datos **ilustrativos** del seed `setup_basic_tables.sql`:

- **members:** `M-001` Juan Pérez, `handicap_index` 18.5, `course_id` 1  
- **external_players:** Roberto Martínez, `handicap_index` 16.8, `home_club` Club San Isidro  

---

## Explicación simple para el equipo AAG

1. **Socio del club** vive en **`members`** con **`handicap_index`** y **`handicap_local`** y **`member_number`** (matrícula del club, no federativa explícita).
2. **Jugador que no es socio** del sistema vive en **`external_players`**.
3. Al **inscribir en un torneo**, se crea una fila en **`tournament_participants`** con el **HCP que cuenta para el torneo** en **`handicap_used`**.
4. Los **resultados** van en **`scorecards`** + detalle por hoyo en **`scorecard_holes`**.
5. Para **AAG**, probablemente necesiten un **identificador federado** nuevo o mapear **`member_number`** si coincide con su modelo; hoy **no hay campo `aag_` en el esquema base del repo**.

---

## Archivos de esquema en el repositorio (referencia)

- `backend/database/database_schema.sql` — esquema amplio (puede haber duplicados históricos de `scorecards` en el mismo archivo; la BD real suele ser la evolución + migraciones).
- `backend/database/setup_basic_tables.sql` — clubs + golf_courses + members + external + tournaments.
- `backend/database/create_scorecard_tables.sql` — scorecards actuales (member XOR external).
- `backend/database/create_participants_table.sql` — variante antigua de participantes (el código usa `participation_id` y columnas alineadas a `database.js`).
- `backend/src/services/database.js` — fuente de verdad de columnas en INSERT/SELECT.

Si tras ejecutar el script algo no coincide, compará con `SHOW CREATE TABLE` en producción y ajustá el mapeo AAG a esa versión concreta.

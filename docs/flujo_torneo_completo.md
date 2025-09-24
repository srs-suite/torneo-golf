# 🏌️ Flujo Completo del Sistema de Torneos

## 📋 **FASE 1: INSCRIPCIONES PREVIAS**

### **A. Los Jugadores se Inscriben**
```sql
-- Jugadores se inscriben antes del torneo
INSERT INTO tournament_registrations (tournament_id, player_id, course_handicap)
VALUES 
(1, 1, 17), -- Juan Pérez se inscribe
(1, 2, 9),  -- María González se inscribe  
(1, 3, 25), -- Carlos Rodríguez se inscribe
(1, 4, 6);  -- Ana López se inscribe
```

**Estado:** `registration_status = 'registered'`

---

## 👨‍💼 **FASE 2: ORGANIZACIÓN PREVIA**

### **B. El Encargado Arma los Grupos**
```sql
-- El organizador crea grupos vacíos con horarios
INSERT INTO playing_groups (tournament_id, group_name, starting_hole, tee_time, holes_to_play)
VALUES 
(1, 'Grupo A', 1, '08:00:00', '18'),
(1, 'Grupo B', 1, '08:10:00', '18'),
(1, 'Grupo C', 10, '08:20:00', '18'); -- Salida simultánea
```

**Nota:** Los grupos se crean vacíos, sin jugadores asignados aún.

---

## 📱 **FASE 3: DÍA DEL TORNEO - CHECK-IN QR**

### **C. Todos los Participantes Escanean QR**
El día del torneo, cada jugador:

1. **Llega al club**
2. **Escanea su código QR único** 
3. **Sistema registra su teléfono automáticamente**
4. **Se asigna automáticamente a un grupo**

```sql
-- Al escanear QR, se ejecuta automáticamente:
CALL ProcessPlayerCheckin(
    1,                    -- tournament_id
    1,                    -- player_id (Juan)
    '+5491123456789',     -- phone_number (detectado del QR)
    'QR_JUAN_TORNEO_001', -- qr_code escaneado
    '{"device": "iPhone", "browser": "Safari"}', -- device_info
    '192.168.1.100'       -- ip_address
);
```

**Resultado automático:**
- ✅ Jugador verificado como inscrito
- ✅ Teléfono registrado en el sistema
- ✅ Asignado automáticamente al próximo grupo disponible
- ✅ Estado cambia a `'checked_in'`

---

## ⛳ **FASE 4: MOMENTO DE LA SALIDA**

### **D. Sistema Asigna Marcadores Automáticamente**

**Cuando el grupo está listo para salir:**

```sql
-- El organizador ejecuta:
CALL StartPlayingGroup(1); -- Para el Grupo A
```

**¿Qué pasa automáticamente?**

#### **Ejemplo Grupo de 4 jugadores:**
- **Juan** → Le lleva la tarjeta a **María**
- **María** → Le lleva la tarjeta a **Carlos** 
- **Carlos** → Le lleva la tarjeta a **Ana**
- **Ana** → Le lleva la tarjeta a **Juan**

#### **Ejemplo Grupo de 3 jugadores:**
- **Juan** → Le lleva la tarjeta a **María**
- **María** → Le lleva la tarjeta a **Carlos**
- **Carlos** → Le lleva la tarjeta a **Juan**

#### **Ejemplo Grupo de 2 jugadores:**
- **Juan** → Le lleva la tarjeta a **María**
- **María** → Le lleva la tarjeta a **Juan**

**El sistema:**
1. ✅ **Asigna marcadores automáticamente** (rotación circular)
2. ✅ **Crea las tarjetas de score** con marcador asignado
3. ✅ **Cambia estado a** `'playing'`

---

## 🎯 **FASE 5: DURANTE EL JUEGO**

### **E. Marcador Ingresa los Golpes**

**Cada marcador en su teléfono:**
- ✅ Ve las tarjetas de los jugadores que debe marcar
- ✅ Ingresa golpes hoyo por hoyo
- ✅ El sistema calcula totales automáticamente

```sql
-- Carlos (marcador) ingresa golpes de Ana (jugadora)
INSERT INTO hole_scores (scorecard_id, hole_number, strokes, net_strokes)
VALUES 
(4, 1, 5, 4), -- Ana: 5 golpes en hoyo 1
(4, 2, 3, 3), -- Ana: 3 golpes en hoyo 2
(4, 3, 6, 5); -- Ana: 6 golpes en hoyo 3
```

### **F. Jugador Controla su Tarjeta**

**Cada jugador puede:**
- ✅ **Ver su tarjeta en tiempo real** (solo lectura)
- ✅ **Verificar que los golpes estén correctos**
- ✅ **Ver su progreso y totales**

**Interfaz del jugador:** Solo visualización, no puede editar.

---

## ✍️ **FASE 6: FINALIZACIÓN Y FIRMAS**

### **G. Terminan el Juego**

**Al completar 18 hoyos:**
- ✅ Sistema marca automáticamente `is_completed = TRUE`
- ✅ Calcula totales finales automáticamente
- ✅ Habilita el proceso de firmas

### **H. Proceso de Firmas en el Mismo Teléfono**

**En el teléfono del marcador:**

1. **Aparece notificación:** "Tarjeta de Ana lista para firmar"
2. **Carlos (marcador) firma primero:** Valida que los golpes están correctos
3. **Ana (jugadora) firma después:** Confirma que acepta los golpes
4. **Ambas firmas en el mismo dispositivo**

```sql
-- Carlos firma como marcador
UPDATE scorecards 
SET 
    is_signed_by_marker = TRUE,
    marker_signature = 'data:image/png;base64,firma_carlos...',
    marker_signed_at = NOW(),
    signing_device_info = '{"device": "Carlos_iPhone", "ip": "192.168.1.105"}'
WHERE scorecard_id = 4; -- Tarjeta de Ana

-- Ana firma como jugadora (en el mismo teléfono)
UPDATE scorecards 
SET 
    is_signed_by_player = TRUE,
    player_signature = 'data:image/png;base64,firma_ana...',
    player_signed_at = NOW()
WHERE scorecard_id = 4;
```

---

## 🏆 **FASE 7: VALIDACIÓN Y RESULTADOS**

### **I. Sistema Valida Tarjetas Automáticamente**

```sql
-- Vista de estado de todas las tarjetas
SELECT 
    player_name,
    marker_name,
    CASE 
        WHEN is_signed_by_player = TRUE AND is_signed_by_marker = TRUE THEN '✅ VÁLIDA'
        WHEN is_completed = TRUE THEN '⚠️ PENDIENTE FIRMAS'
        WHEN is_completed = FALSE THEN '🎯 EN JUEGO'
        ELSE '❌ DESCALIFICADA'
    END as status
FROM signature_status 
WHERE tournament_id = 1;
```

### **J. Generación de Resultados**

**Solo tarjetas con ambas firmas:**
- ✅ Aparecen en el ranking oficial
- ✅ Son elegibles para premios
- ✅ Se pueden imprimir oficialmente

**Tarjetas sin firmas:**
- ❌ Automáticamente descalificadas
- ❌ No aparecen en resultados
- ❌ Sistema alerta al organizador

---

## 🔧 **ASPECTOS TÉCNICOS IMPORTANTES**

### **1. Flexibilidad de Grupos:**
```sql
-- Funciona con cualquier tamaño de grupo
IF player_count = 2 THEN
    -- Juan marca a María, María marca a Juan
ELSEIF player_count = 3 THEN  
    -- Rotación: Juan→María→Carlos→Juan
ELSEIF player_count = 4 THEN
    -- Rotación: Juan→María→Carlos→Ana→Juan
END IF;
```

### **2. Asignación Automática:**
- ✅ **No requiere intervención manual** para asignar marcadores
- ✅ **Rotación circular** garantiza que todos marquen a alguien
- ✅ **Adaptable** a grupos de 2, 3 o 4 jugadores

### **3. Control de Firmas:**
- ✅ **Ambas firmas obligatorias** para validez oficial
- ✅ **Mismo dispositivo** garantiza que ambos estén presentes
- ✅ **Timestamp** de cada firma para auditoría
- ✅ **Información del dispositivo** para seguridad

### **4. Interfaces Diferenciadas:**

#### **📱 Marcador (Puede Editar):**
- ✅ Ingresa golpes del jugador asignado
- ✅ Ve tarjeta completa
- ✅ Firma al final
- ✅ Solicita firma del jugador

#### **👁️ Jugador (Solo Ve):**
- ✅ Ve su tarjeta en tiempo real  
- ✅ Controla que esté correcta
- ✅ No puede editar golpes
- ✅ Firma cuando el marcador se lo pide

---

## 🎯 **VENTAJAS DEL SISTEMA**

### **✅ Para el Organizador:**
- **Cero intervención manual** en asignación de marcadores
- **Control total** de quién participó realmente (check-in QR)
- **Validación automática** de tarjetas
- **Reportes en tiempo real** del progreso

### **✅ Para los Jugadores:**
- **Proceso simple:** escanear QR y jugar
- **Control visual** de su tarjeta durante el juego
- **Firmas digitales** reconocidas oficialmente
- **No hay confusión** de quién marca a quién

### **✅ Para el Golf:**
- **Cumple reglamento oficial** (doble firma obligatoria)
- **Imposible falsificar** scores o firmas
- **Documentación completa** de cada ronda
- **Escalable** a cualquier tamaño de torneo

**Este sistema automatiza completamente el proceso mientras mantiene todos los controles reglamentarios del golf profesional.**

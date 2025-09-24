# 🧪 INSTRUCCIONES DE TESTING - SISTEMA MULTI-CLUB

## 🚀 Cómo Probar el Sistema Completo

### **PASO 1: Iniciar el Servidor**

1. Abrir terminal en la carpeta del proyecto
2. Ejecutar el nuevo servidor multi-club:
   ```bash
   node server_multiclub.js
   ```
3. Verificar que aparezca el mensaje de inicio con todas las características

### **PASO 2: Probar Administrador General del Sistema**

1. **Abrir**: `http://localhost:8000/admin_sistema.html`
2. **Login**: admin_sistema / admin123 (simulado)
3. **Funcionalidades a probar**:
   - ✅ Dashboard con estadísticas generales
   - ✅ Lista de clubes con información de cada uno
   - ✅ Crear nuevo club (llenar formulario completo)
   - ✅ Ver administradores de clubes
   - ✅ Reportes consolidados
   - ✅ Configuración del sistema

**Datos de prueba para crear club**:
```
Código: TEST001
Nombre: Club de Prueba
Admin Email: admin@test.com
Admin Usuario: admin_test
Contraseña: test123
Máximo Miembros: 200
```

### **PASO 3: Probar Administrador de Club**

1. **Abrir**: `http://localhost:8000/admin_club.html?club=1`
2. **Funcionalidades a probar**:
   - ✅ Dashboard específico del club
   - ✅ Gestión de miembros (agregar, editar, suspender)
   - ✅ Crear torneos (con opción de visitantes)
   - ✅ Buscar jugadores de otros clubes
   - ✅ Configuración del campo
   - ✅ Reportes del club

**Datos de prueba para agregar miembro**:
```
Nombre: Pedro
Apellido: Martínez
N° Socio: LP005
Handicap: 14.5
Email: pedro@email.com
Teléfono: +54 11 5555-1234
Tipo: Completa
✓ Es su club principal
```

### **PASO 4: Probar Acceso Móvil por Teléfono**

1. **Abrir**: `http://localhost:8000/mobile_interface.html`
2. **Flujo de autenticación**:
   - ✅ Pantalla de login por teléfono
   - ✅ Ingresar: `+54 11 1234-5678` (Juan Pérez)
   - ✅ Código de verificación (aparece en consola)
   - ✅ Selección de torneo disponible
   - ✅ Visualización de historial (si existe)

**Teléfonos de prueba disponibles**:
- `+54 11 1234-5678` - Juan Pérez (Club Los Pinos)
- `+54 11 2345-6789` - María González (Club Los Pinos)
- `+54 11 3456-7890` - Carlos Rodríguez (Club San Martín)
- `+54 11 4567-8901` - Ana López (Country Las Rosas)

### **PASO 5: Probar Carga de Scores Móvil**

1. **Después del login móvil**:
   - ✅ Seleccionar torneo "Campeonato Mensual"
   - ✅ Ver información del jugador y handicap
   - ✅ Seleccionar hoyo de inicio (probar hoyo 1)
   - ✅ Cargar scores por hoyo
   - ✅ Ver progreso en tiempo real
   - ✅ Botón flotante para ver tarjeta completa
   - ✅ Navegación entre hoyos

**Datos de prueba para scores**:
- Hoyo 1: 5 golpes
- Hoyo 2: 3 golpes  
- Hoyo 3: 6 golpes
- etc...

### **PASO 6: Probar Funcionalidades Multi-Club**

1. **En admin de club**:
   - ✅ Buscar jugadores: "Ana" (debería aparecer Ana López de otro club)
   - ✅ Invitarla como visitante a un torneo
   - ✅ Ver lista de visitantes en sección de visitantes

2. **En móvil**:
   - ✅ Login con teléfono de Ana López
   - ✅ Ver torneos donde es visitante
   - ✅ Cargar scores en torneo de otro club

## 🔍 **TESTING DE APIs**

### **API System Admin**
```bash
# Obtener estadísticas generales
curl http://localhost:8000/api/system/stats

# Listar todos los clubes
curl http://localhost:8000/api/system/clubs

# Buscar jugadores globalmente
curl -X POST http://localhost:8000/api/system/search-players \
  -H "Content-Type: application/json" \
  -d '{"search_term": "Juan", "organizing_course_id": 1}'
```

### **API Club Admin**
```bash
# Obtener info del club
curl http://localhost:8000/api/club/1/info

# Obtener estadísticas del club
curl http://localhost:8000/api/club/1/stats

# Listar miembros del club
curl http://localhost:8000/api/club/1/members

# Listar torneos del club
curl http://localhost:8000/api/club/1/tournaments
```

### **API Mobile**
```bash
# Solicitar código de verificación
curl -X POST http://localhost:8000/api/mobile/auth/phone \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+54 11 1234-5678"}'

# Verificar código (usar el código que aparece en consola)
curl -X POST http://localhost:8000/api/mobile/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+54 11 1234-5678", "verification_code": "123456"}'

# Obtener torneos disponibles (usar el token del paso anterior)
curl http://localhost:8000/api/mobile/tournaments/available \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ✅ **CHECKLIST DE FUNCIONALIDADES**

### **Administrador General**
- [ ] Login y dashboard
- [ ] Crear nuevo club
- [ ] Ver estadísticas consolidadas
- [ ] Gestionar administradores de clubes
- [ ] Activar/desactivar clubes
- [ ] Reportes del sistema

### **Administrador de Club**
- [ ] Dashboard específico del club
- [ ] Agregar/editar miembros
- [ ] Importar lista de socios (simulado)
- [ ] Crear torneos con visitantes
- [ ] Buscar jugadores de otros clubes
- [ ] Invitar visitantes a torneos
- [ ] Ver estadísticas del club
- [ ] Configurar información del campo

### **Acceso Móvil**
- [ ] Autenticación por teléfono
- [ ] Verificación por código SMS (simulado)
- [ ] Selección de torneos disponibles
- [ ] Visualización de historial personal
- [ ] Carga de scores por hoyo
- [ ] Vista de tarjeta completa
- [ ] Progreso en tiempo real
- [ ] Guardado automático

### **Sistema Multi-Club**
- [ ] Datos compartidos entre clubes
- [ ] Jugadores visitantes
- [ ] Búsqueda global de jugadores
- [ ] Torneos inter-clubes
- [ ] Historial unificado por jugador
- [ ] Gestión independiente por club

## 🐛 **POSIBLES PROBLEMAS Y SOLUCIONES**

### **Error de CORS**
- **Problema**: Requests bloqueados por CORS
- **Solución**: El servidor ya incluye headers CORS correctos

### **Código de verificación no aparece**
- **Problema**: No se ve el código en consola
- **Solución**: Abrir DevTools (F12) y ver la pestaña Console

### **Token inválido en móvil**
- **Problema**: APIs móviles devuelven error 401
- **Solución**: Completar el flujo de autenticación por teléfono primero

### **Clubes no aparecen**
- **Problema**: Lista de clubes vacía
- **Solución**: Verificar que el servidor esté corriendo y usar datos mock

### **Búsqueda de jugadores no funciona**
- **Problema**: No encuentra jugadores de otros clubes
- **Solución**: Usar nombres exactos: "Juan", "María", "Carlos", "Ana"

## 📊 **DATOS DE PRUEBA INCLUIDOS**

### **Clubes**
1. **Club Los Pinos** (LP001) - 150/300 miembros
2. **Club San Martín** (SM002) - 89/150 miembros  
3. **Country Las Rosas** (LR003) - 287/500 miembros

### **Jugadores de Prueba**
1. **Juan Pérez** - Los Pinos - HCP 15.2 - +54 11 1234-5678
2. **María González** - Los Pinos - HCP 8.5 - +54 11 2345-6789
3. **Carlos Rodríguez** - San Martín - HCP 22.1 - +54 11 3456-7890
4. **Ana López** - Las Rosas - HCP 18.3 - +54 11 4567-8901

### **Torneos de Prueba**
1. **Campeonato Mensual** - Los Pinos - Activo
2. **Torneo de Apertura** - San Martín - Inscripción

## 🎯 **OBJETIVOS DEL TESTING**

1. ✅ Verificar que todas las interfaces cargan correctamente
2. ✅ Confirmar el flujo de autenticación móvil
3. ✅ Probar la creación de clubes y miembros
4. ✅ Validar la búsqueda inter-clubes
5. ✅ Comprobar la carga de scores móvil
6. ✅ Verificar las APIs REST
7. ✅ Confirmar que el sistema es responsive
8. ✅ Validar el manejo de errores

¡Con estas pruebas tendrás la certeza de que el sistema multi-club está funcionando correctamente! 🚀🏌️

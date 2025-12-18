# 💰 Transparencia Financiera para Socios

## 📋 Descripción

Esta funcionalidad permite que **todos los socios del club puedan ver el estado financiero** del club de forma transparente, incluyendo:

- ✅ Total de ingresos (torneos + otros ingresos)
- ✅ Total de gastos
- ✅ Balance actual
- ✅ Detalle de cada ingreso con fecha y concepto
- ✅ Detalle de cada gasto con fecha y concepto  
- ✅ Filtros por fecha
- ✅ Exportación a PDF

---

## 🔐 Acceso

### URL de Acceso:
```
https://torneogolf.retailsolutionstimetracker.com/club/[CLUB_ID]/public-finance
```

**Ejemplo:**
- Club ID 1: `https://torneogolf.retailsolutionstimetracker.com/club/1/public-finance`
- Club ID 2: `https://torneogolf.retailsolutionstimetracker.com/club/2/public-finance`

### Contraseña:
- **Contraseña por defecto:** `socios2024`
- Esta contraseña es **compartida** entre todos los socios
- La contraseña se guarda en el navegador después del primer ingreso

---

## ⚙️ Configuración

### Cambiar la Contraseña

1. **En el servidor**, editar el archivo `.env` en la carpeta del backend:

```bash
cd /home/retailso/torneogolf-source/backend
nano .env
```

2. Agregar o modificar esta línea:

```env
PUBLIC_FINANCE_PASSWORD=tu_nueva_contraseña_aqui
```

3. **Reiniciar el backend:**

```bash
pm2 restart teetracker-backend
```

4. **Compartir la nueva contraseña** con todos los socios

---

## 📱 Cómo Usar

### Para Socios:

1. **Acceder a la URL** del club (solicitar al administrador)

2. **Ingresar la contraseña compartida**

3. **Ver el resumen financiero:**
   - Tarjetas con totales de ingresos, gastos y balance
   - Tabla detallada de ingresos por torneos
   - Tabla de otros ingresos (cuotas sociales, etc.)
   - Tabla de gastos con categorías

4. **Filtrar por fecha:**
   - Usar los campos "Desde" y "Hasta" para ver un período específico
   - Ejemplo: Ver solo los movimientos del último mes

5. **Exportar a PDF:**
   - Hacer clic en "Exportar PDF"
   - Se abrirá la vista de impresión del navegador
   - Guardar como PDF o imprimir

---

## 🔒 Seguridad

### Nivel de Seguridad:
- **Protección básica** con contraseña compartida
- Ideal para clubs pequeños con alto nivel de confianza
- **NO** es una autenticación individual por usuario

### Recomendaciones:
1. Cambiar la contraseña periódicamente (cada 3-6 meses)
2. Compartir la contraseña solo con socios activos
3. Si se detecta uso indebido, cambiar la contraseña inmediatamente

---

## 📊 Qué Se Muestra

### Resumen (Tarjetas Superiores):
1. **Ingresos Totales**
   - Suma de ingresos de torneos + otros ingresos
   - Desglose: Torneos vs Otros

2. **Gastos Totales**
   - Suma de todos los gastos registrados

3. **Balance**
   - Diferencia entre ingresos y gastos
   - Verde si es positivo, rojo si es negativo

4. **Saldos por Moneda** (si aplica)
   - Pesos argentinos (AR$)
   - Dólares (US$)

### Detalle de Ingresos por Torneos:
- Nombre del torneo
- Fecha
- Cuota de inscripción
- Cantidad de pagos realizados
- Total recaudado

### Otros Ingresos:
- Fecha
- Concepto (ej: "Cuota social mensual", "Donación")
- Socio que realizó el pago
- Monto

### Gastos:
- Fecha
- Concepto
- Categoría
- Método de pago
- Monto

---

## 🎯 Casos de Uso

### 1. Reunión de Comisión
- Proyectar el dashboard en una pantalla
- Mostrar a todos los socios el estado real de las finanzas
- Transparencia total

### 2. Consulta Individual
- Un socio quiere saber cómo se está usando su cuota
- Ingresa con la contraseña y revisa
- Sin necesidad de molestar a la comisión

### 3. Auditoría Informal
- Los socios pueden revisar cuando quieran
- Detección temprana de problemas
- Mayor confianza en la administración

### 4. Cierre de Año
- Generar PDF con todo el año
- Distribuir entre los socios
- Archivo histórico

---

## 🛠️ Troubleshooting

### Problema: "Contraseña incorrecta"
**Solución:** Verificar que se esté usando la contraseña correcta del archivo `.env`

### Problema: No muestra datos
**Solución:** 
1. Verificar que el backend esté corriendo: `pm2 status`
2. Ver los logs: `pm2 logs teetracker-backend`

### Problema: Error 503 al acceder
**Solución:**
1. Verificar que Apache esté configurado correctamente
2. Verificar que el backend esté escuchando en puerto 8000

---

## 📞 Soporte

Si hay problemas con esta funcionalidad:

1. **Administradores:** Revisar la configuración del backend
2. **Socios:** Contactar a la comisión directiva para obtener:
   - La URL correcta
   - La contraseña actual
   - Ayuda con el acceso

---

## 🔄 Actualizaciones

El dashboard se actualiza automáticamente cuando:
- Se registra un nuevo pago de torneo
- Se agrega un nuevo gasto
- Se registra un nuevo ingreso

**No requiere actualización manual.**

---

## ✅ Ventajas de Esta Funcionalidad

1. **Transparencia Total:** Todos los socios pueden ver en qué se gasta el dinero
2. **Fácil de Usar:** Solo necesitan la URL y una contraseña
3. **Siempre Actualizado:** Muestra datos en tiempo real
4. **No Invasivo:** No necesita crear usuarios para cada socio
5. **Exportable:** Se puede generar PDF para reuniones o archivos
6. **Filtrable:** Ver solo el período que interesa
7. **Confianza:** Mayor confianza en la administración del club

---

**💡 Tip:** Compartir la URL y contraseña en el grupo de WhatsApp del club para que todos tengan acceso fácil.


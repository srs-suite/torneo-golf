# Cómo actualizar producción (Torneogolf) — proceso que SÍ funciona

**Usá este documento cada vez que subas cambios.** Si en otro chat te piden "cómo actualizo", abrí este archivo o decí: "seguí los pasos de ACTUALIZAR_PRODUCCION.md".

---

## Por qué a veces la actualización no se ve

1. **Ruta equivocada:** En este VPS el código está en `/home/retailso/torneogolf-source/` (usuario `retailso`), no en `/root/` ni en `/var/www/torneogolf/`.
2. **Frontend no actualizado:** Nginx sirve los archivos desde **otra carpeta**: `/home/retailso/torneogolf.retailsolutionstimetracker.com/`. Solo subir archivos a `torneogolf-source` no basta: hay que hacer **build** y **copiar** el contenido de `dist/` a esa carpeta.
3. **No reiniciar el backend:** Después de cambiar archivos del backend hay que hacer `pm2 restart torneogolf-backend`.
4. **Puerto del backend:** En producción `.env.prod` tiene `PORT=8001` y Nginx hace proxy a `127.0.0.1:8001`. El backend **debe** leer `process.env.PORT` (no un puerto fijo en código).
5. **Reiniciar todo:** No usar `pm2 restart all` si tenés otros sistemas en el mismo VPS; solo reiniciar el proceso de torneogolf.

---

## Proceso correcto (paso a paso)

### 1. Subir a GitHub (en tu PC)

```bash
cd C:\Documents\proyectos\Torneogolf
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

Repositorio: `https://github.com/srs-suite/torneo-golf.git` (rama `main`).

**Datos del VPS (InMotion):**
- SSH: `ssh root@173.231.241.135` (puerto **22**; el usuario `retailso` no tiene shell)
- Código: `/home/retailso/torneogolf-source/`
- Web (Nginx): `/home/retailso/torneogolf.retailsolutionstimetracker.com/`
- PM2: proceso **`torneogolf-backend`** (no `teetracker-backend`)
- Backend: **`PORT=8001`** en `backend/.env.prod` — Nginx proxy a `127.0.0.1:8001`

---

### 2. Subir archivos con FileZilla

- **Host / usuario:** el que usás para el VPS (ej. `retailso` o root).
- **Ruta base en el servidor:** `/home/retailso/torneogolf-source/`

Subí **solo los archivos que cambiaron**, manteniendo la misma estructura:

- `backend/src/server.js` → `/home/retailso/torneogolf-source/backend/src/server.js`
- `backend/src/services/database.js` → `/home/retailso/torneogolf-source/backend/src/services/database.js`
- Archivos de `frontend/src/...` (páginas, componentes, hooks, types, etc.) → misma ruta dentro de `/home/retailso/torneogolf-source/frontend/src/...`

**Importante:** No subas `node_modules` ni reemplaces el `.env` del servidor.

---

### 3. En el VPS (por SSH como root)

**Opción A — Descargar ZIP de GitHub** (funciona con repo público; si es privado, hacerlo público un rato o usar token):

```bash
cd /home/retailso
cp torneogolf-source/backend/.env.prod /root/env.prod.backup
mv torneogolf-source torneogolf-source.backup-$(date +%Y%m%d)
wget https://github.com/srs-suite/torneo-golf/archive/refs/heads/main.zip -O torneo-main.zip
unzip -o torneo-main.zip && mv torneo-golf-main torneogolf-source
cp /root/env.prod.backup torneogolf-source/backend/.env.prod
chown -R retailso:retailso torneogolf-source
rm -f torneo-main.zip
```

**Opción B — Solo archivos cambiados con FileZilla** (si el ZIP no es viable).

Backend:

```bash
cd /home/retailso/torneogolf-source/backend
npm install
pm2 restart torneogolf-backend --update-env
```

Frontend (usar `/bin/cp` para que no pregunte overwrite):

```bash
cd /home/retailso/torneogolf-source/frontend
npm install
npm run build
/bin/cp -rf dist/index.html /home/retailso/torneogolf.retailsolutionstimetracker.com/
/bin/cp -rf dist/assets/* /home/retailso/torneogolf.retailsolutionstimetracker.com/assets/
```

**Verificar API (debe responder, no 502):**

```bash
ss -tlnp | grep 8001
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:8001/api/system/clubs
pm2 logs torneogolf-backend --lines 15 --nostream
```

Si la web queda “pensando” y la API da **502**: el backend no escucha en **8001**. Revisar `grep PORT backend/.env.prod` y que `server.js` use `process.env.PORT`.

---

### 3b. Solo frontend cambió (sin tocar backend)

```bash
cd /home/retailso/torneogolf-source/frontend
npm run build
/bin/cp -rf dist/index.html /home/retailso/torneogolf.retailsolutionstimetracker.com/
/bin/cp -rf dist/assets/* /home/retailso/torneogolf.retailsolutionstimetracker.com/assets/
```

Si cambiaste backend:

```bash
pm2 restart torneogolf-backend
```

---

### 4. Verificar

- Probar la web en el navegador (si podés, en ventana incógnito o con caché limpiada).
- Si algo falla: `pm2 logs torneogolf-backend --lines 30`

---

## Verificar que todo subió bien (si no ves los cambios)

Ejecutá estos comandos **por SSH en el VPS** para ver en qué paso falló.

**1. ¿Los archivos fuente están en el servidor con el código nuevo?**

```bash
# Debe mostrar una línea con "formatHcpForDisplay" y "Math.abs"
grep -l "formatHcpForDisplay\|Math.abs" /home/retailso/torneogolf-source/frontend/src/utils/scoreUtils.ts 2>/dev/null && echo "OK: scoreUtils tiene el código nuevo" || echo "FALTA: subí frontend/src/utils/scoreUtils.ts por FileZilla"
```

Si sale "FALTA", subí de nuevo por FileZilla los archivos del frontend que te indicaron y volvé a correr estos pasos.

**2. ¿Se hizo el build después de subir?**

```bash
# Fecha de los archivos en dist (deben ser recientes)
ls -la /home/retailso/torneogolf-source/frontend/dist/assets/*.js 2>/dev/null | head -3
```

Si no existe `dist/` o los archivos son viejos, ejecutá en el VPS:

```bash
cd /home/retailso/torneogolf-source/frontend
npm run build
```

**3. ¿Se copió el build a la carpeta que sirve Nginx?**

```bash
# Fecha de los archivos que sirve la web (deben ser recientes)
ls -la /home/retailso/torneogolf.retailsolutionstimetracker.com/assets/*.js 2>/dev/null | head -3
```

Si los archivos son viejos o no existen, ejecutá:

```bash
cp -r /home/retailso/torneogolf-source/frontend/dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/
```

**4. Backend: ¿están los archivos del backend?**

```bash
grep -l "updateParticipantTeePreference" /home/retailso/torneogolf-source/backend/src/server.js 2>/dev/null && echo "OK: server.js actualizado" || echo "FALTA: subí backend/src/server.js"
```

**4b. Rankings / `database.js` (crear torneo con flag de ranking)**

```bash
grep -l "postInsertBaseParams" /home/retailso/torneogolf-source/backend/src/services/database.js 2>/dev/null && echo "OK: database.js con fix createTournament+ranking" || echo "FALTA: subí backend/src/services/database.js"
```

**4c. ¿PM2 está ejecutando el código de `torneogolf-source`?**

```bash
pm2 show torneogolf-backend | egrep "script path|exec cwd"
```

El `script path` debería apuntar a algo como `/home/retailso/torneogolf-source/backend/src/server.js` y el cwd al proyecto `torneogolf-source`, no a otra copia del repo.

**4d. Probar la API de rankings (debe ser JSON con `success`, no 404)**

Sustituí `CLUB_ID` y el año; el puerto suele ser el del backend (ej. 8000 si probás por SSH con curl al localhost):

```bash
curl -sS -o /tmp/rank.json -w "%{http_code}" "http://127.0.0.1:8000/api/club/CLUB_ID/rankings/annual/2026"
echo
head -c 400 /tmp/rank.json; echo
```

Si el código HTTP no es `200`, el front **no puede** mostrar tablas aunque subas bien el frontend: revisá `server.js` y reiniciá PM2.

Si salió "FALTA", subí los archivos del backend por FileZilla y luego:

```bash
pm2 restart torneogolf-backend
```

**5. Navegador**

- Probá en **ventana de incógnito** o **Ctrl+Shift+R** (recarga forzada).
- En Chrome: F12 → pestaña **Red** → marcar **Deshabilitar caché** → recargar la página.

**Resumen:** Si no ves los cambios, casi siempre es: (A) no se subieron todos los archivos por FileZilla, (B) no se corrió `npm run build` después de subir, (C) no se corrió `cp -r dist/* ...`, o (D) caché del navegador. Los comandos de arriba te dicen cuál es.

---

## Confirmar que estás en el lugar correcto (diagnóstico en el VPS)

En el proyecto hay **dos esquemas** posibles. Ejecutá por SSH estos comandos para ver cuál usa tu servidor:

```bash
# 1) ¿Existe el código en torneogolf-source?
ls -la /home/retailso/torneogolf-source/frontend/src/components/CreateTournamentModalSimple.tsx

# 2) ¿Existe la carpeta donde copiamos el build (esquema A)?
ls -la /home/retailso/torneogolf.retailsolutionstimetracker.com/

# 3) ¿O el código está en /var/www (esquema B)?
ls -la /var/www/torneogolf/frontend/dist/  2>/dev/null || echo "No existe esquema B"

# 4) ¿Desde dónde sirve Nginx el sitio? (buscar "root" o "alias" para tu dominio)
grep -r "torneogolf\|retailsolution" /etc/nginx/ 2>/dev/null | head -20
```

- Si **solo existe** `/home/retailso/torneogolf-source/` y Nginx apunta a `torneogolf.retailsolutionstimetracker.com`, usá el **paso 3** de este documento (build en `torneogolf-source/frontend` y `cp -r dist/*` a esa carpeta).
- Si el código está en **`/var/www/torneogolf/`** y Nginx apunta a algo como `/var/www/torneogolf/...`, entonces:
  - Subí archivos con FileZilla a `/var/www/torneogolf/` (misma estructura).
  - En el VPS: `cd /var/www/torneogolf/frontend && npm run build` (no hace falta copiar si Nginx ya apunta a `frontend/dist/`).
  - `pm2 restart torneogolf-backend`.

Anotá la ruta que te salga en el punto 4 y usala como “carpeta que sirve Nginx” para el `cp` o para confirmar que el build queda ahí.

---

## Si no ves los cambios (Editar torneo, Resultados - Configuración, bandas Scratch)

Si en producción seguís viendo la versión vieja (por ejemplo en **Editar torneo** → **Resultados - Configuración** no aparece la opción Scratch con las 4 bandas, o en **Resultados** las categorías viejas):

1. **Caché del navegador**
   - Probá en **ventana de incógnito** o **Ctrl+Shift+R** (recarga forzada).
   - O en Chrome: F12 → pestaña Red → marcar "Deshabilitar caché" → recargar.

2. **Confirmar que el build se copió en el VPS**
   - Por SSH: `ls -la /home/retailso/torneogolf.retailsolutionstimetracker.com/`
   - Los archivos deben tener la fecha/hora de cuando hiciste el `cp -r dist/* ...`. Si son viejos, repetí en el VPS:
     ```bash
     cd /home/retailso/torneogolf-source/frontend
     npm run build
     cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/
     ```

3. **Confirmar que subiste los archivos del frontend**
   - Para Editar torneo y Resultados - Configuración tienen que estar en el servidor (en `torneogolf-source`):
     - `frontend/src/components/CreateTournamentModalSimple.tsx`
     - `frontend/src/pages/TournamentResults.tsx`
   - Si no los subiste, subilos con FileZilla y después volvé a hacer en el VPS el **paso 3** (build + copiar dist + reiniciar backend).

4. **Reiniciar solo el backend** (por si cambiaste algo de API):
   ```bash
   pm2 restart torneogolf-backend
   ```

---

## Sync masivo AAG semanal (cron en backend)

Si desplegás esta funcionalidad:

1. Subí `backend/src/schedulers/aagWeeklySyncScheduler.js` y los cambios en `backend/src/server.js`, `backend/package.json`.
2. **Base de datos:** ejecutá en MySQL el script `backend/migrations/add_aag_sync_logs.sql` (tabla `aag_sync_logs` para historial del cron).
3. En el VPS: `cd /home/retailso/torneogolf-source/backend && npm install` (instala `node-cron`).
4. En el **`.env.prod` del servidor** (no subir el archivo por Git; editarlo en el VPS o por FileZilla con cuidado):
   - `AAG_WEEKLY_SYNC_ENABLED=true` para activar (solo con `NODE_ENV=production`).
   - Opcional: `AAG_WEEKLY_SYNC_CRON=0 6 * * 4` (jueves 06:00, hora del servidor).
   - Opcional: `AAG_WEEKLY_SYNC_CLUB_ID=1` (club a sincronizar).
5. `pm2 restart torneogolf-backend` y revisá logs: debe aparecer `[AAG weekly sync] Scheduler activo` o el mensaje de deshabilitado.

---

## Resumen en una frase

**Subir archivos a `/home/retailso/torneogolf-source/` con FileZilla → en el VPS: `cd /home/retailso/torneogolf-source/frontend` → `npm run build` → `cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/` (con eso se ven los cambios). Si tocaste backend: `pm2 restart torneogolf-backend`.**

---

## Qué archivos subir (referencia)

Cada vez que hagas cambios, subí **los archivos que tocaste** en esa actualización. Para una lista ampliada de archivos del proyecto, mirá `CHECKLIST_PRODUCCION.md`.

- Backend: todo lo que esté en `backend/src/` que hayas modificado (`server.js`, `services/database.js`, etc.).
- Frontend: todo lo que esté en `frontend/src/` que hayas modificado (páginas, componentes, hooks, types, services, etc.).

No hace falta subir de nuevo archivos que no cambiaron.

---

## Si estás en otro chat o no te acordás

Decile al asistente: **"Para actualizar producción seguí los pasos del archivo ACTUALIZAR_PRODUCCION.md de este proyecto."** Ahí están las rutas y comandos que funcionan en este VPS.

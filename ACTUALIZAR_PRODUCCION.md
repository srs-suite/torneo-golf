# Cómo actualizar producción (Torneogolf) — proceso que SÍ funciona

**Usá este documento cada vez que subas cambios.** Si en otro chat te piden "cómo actualizo", abrí este archivo o decí: "seguí los pasos de ACTUALIZAR_PRODUCCION.md".

---

## Por qué a veces la actualización no se ve

1. **Ruta equivocada:** En este VPS el código está en `/home/retailso/torneogolf-source/` (usuario `retailso`), no en `/root/` ni en `/var/www/torneogolf/`.
2. **Frontend no actualizado:** Nginx sirve los archivos desde **otra carpeta**: `/home/retailso/torneogolf.retailsolutionstimetracker.com/`. Solo subir archivos a `torneogolf-source` no basta: hay que hacer **build** y **copiar** el contenido de `dist/` a esa carpeta.
3. **No reiniciar el backend:** Después de cambiar archivos del backend hay que hacer `pm2 restart teetracker-backend`.
4. **Reiniciar todo:** No usar `pm2 restart all` si tenés otros sistemas en el mismo VPS; solo reiniciar el proceso de torneogolf.

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

### 3. En el VPS (por SSH)

Conectate al VPS y ejecutá **en este orden**. **Con el build + copiar dist se ven los cambios** en el frontend:

```bash
cd /home/retailso/torneogolf-source/frontend
npm run build
cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/
```

Si cambiaste algo del backend, reiniciá solo el proceso de torneogolf (no `pm2 restart all`):

```bash
pm2 restart teetracker-backend
```

---

### 4. Verificar

- Probar la web en el navegador (si podés, en ventana incógnito o con caché limpiada).
- Si algo falla: `pm2 logs teetracker-backend --lines 30`

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
  - `pm2 restart teetracker-backend`.

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
   pm2 restart teetracker-backend
   ```

---

## Resumen en una frase

**Subir archivos a `/home/retailso/torneogolf-source/` con FileZilla → en el VPS: `cd /home/retailso/torneogolf-source/frontend` → `npm run build` → `cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/` (con eso se ven los cambios). Si tocaste backend: `pm2 restart teetracker-backend`.**

---

## Qué archivos subir (referencia)

Cada vez que hagas cambios, subí **los archivos que tocaste** en esa actualización. Para una lista ampliada de archivos del proyecto, mirá `CHECKLIST_PRODUCCION.md`.

- Backend: todo lo que esté en `backend/src/` que hayas modificado (`server.js`, `services/database.js`, etc.).
- Frontend: todo lo que esté en `frontend/src/` que hayas modificado (páginas, componentes, hooks, types, services, etc.).

No hace falta subir de nuevo archivos que no cambiaron.

---

## Si estás en otro chat o no te acordás

Decile al asistente: **"Para actualizar producción seguí los pasos del archivo ACTUALIZAR_PRODUCCION.md de este proyecto."** Ahí están las rutas y comandos que funcionan en este VPS.

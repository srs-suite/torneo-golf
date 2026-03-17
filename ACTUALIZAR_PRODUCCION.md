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

Conectate al VPS y ejecutá **en este orden**:

```bash
# 1) Ir al frontend y compilar
cd /home/retailso/torneogolf-source/frontend
npm run build

# 2) Copiar el build a la carpeta que sirve Nginx (obligatorio para que se vean los cambios)
cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/

# 3) Reiniciar solo el backend de torneogolf (no "pm2 restart all")
pm2 restart teetracker-backend
```

---

### 4. Verificar

- Probar la web en el navegador (si podés, en ventana incógnito o con caché limpiada).
- Si algo falla: `pm2 logs teetracker-backend --lines 30`

---

## Resumen en una frase

**Subir archivos a `/home/retailso/torneogolf-source/` con FileZilla → en el VPS: `cd frontend && npm run build` → `cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/` → `pm2 restart teetracker-backend`.**

---

## Qué archivos subir (referencia)

Cada vez que hagas cambios, subí **los archivos que tocaste** en esa actualización. Para una lista ampliada de archivos del proyecto, mirá `CHECKLIST_PRODUCCION.md`.

- Backend: todo lo que esté en `backend/src/` que hayas modificado (`server.js`, `services/database.js`, etc.).
- Frontend: todo lo que esté en `frontend/src/` que hayas modificado (páginas, componentes, hooks, types, services, etc.).

No hace falta subir de nuevo archivos que no cambiaron.

---

## Si estás en otro chat o no te acordás

Decile al asistente: **"Para actualizar producción seguí los pasos del archivo ACTUALIZAR_PRODUCCION.md de este proyecto."** Ahí están las rutas y comandos que funcionan en este VPS.

# Guía: subir cambios con FileZilla y reiniciar el VPS

## GitHub (ya hecho)

El último push fue a: **origin** → `https://github.com/srs-suite/torneo-golf.git` (rama `main`).

Si tenés que subir a **otro repo** (otra cuenta u organización), agregá el remoto y hacé push ahí:

```bash
# Ejemplo: si el repo real es otro
git remote add produccion https://github.com/OTRO-USUARIO/OTRO-REPO.git
git push produccion main
```

Si no usás otro repo, con el push a `origin` ya está.

---

## Rutas en el servidor (dos posibles)

Según cómo tengas montado el VPS:

| Esquema | Dónde está el código | Dónde sirve Nginx el frontend |
|--------|-----------------------|-------------------------------|
| **A** (usado en sesiones recientes) | `/home/retailso/torneogolf-source/` | `/home/retailso/torneogolf.retailsolutionstimetracker.com/` |
| **B** (guía anterior) | `/var/www/torneogolf/` | `/var/www/torneogolf/frontend/dist/` |

Usá la **ruta base** que realmente uses en el servidor.

---

## 1. Qué subir con FileZilla

Subí estos archivos **manteniendo la misma estructura de carpetas** que en tu proyecto.

### Backend (2 archivos)

| En tu PC | En el servidor (elegí A o B) |
|----------|------------------------------|
| `backend/src/server.js` | **A:** `.../torneogolf-source/backend/src/server.js` · **B:** `.../torneogolf/backend/src/server.js` |
| `backend/src/services/database.js` | **A:** `.../torneogolf-source/backend/src/services/database.js` · **B:** `.../torneogolf/backend/src/services/database.js` |

### Frontend (3 archivos)

| En tu PC | En el servidor (elegí A o B) |
|----------|------------------------------|
| `frontend/src/pages/PublicInscription.tsx` | **A:** `.../torneogolf-source/frontend/src/pages/PublicInscription.tsx` · **B:** `.../torneogolf/frontend/src/pages/PublicInscription.tsx` |
| `frontend/src/pages/TeeTimeManagerSimple.tsx` | **A:** `.../torneogolf-source/frontend/src/pages/TeeTimeManagerSimple.tsx` · **B:** `.../torneogolf/frontend/src/pages/TeeTimeManagerSimple.tsx` |
| `frontend/src/types/tournament.ts` | **A:** `.../torneogolf-source/frontend/src/types/tournament.ts` · **B:** `.../torneogolf/frontend/src/types/tournament.ts` |

---

## 2. En el VPS después de subir

Conectate por SSH y ejecutá según el esquema que uses.

### Si usás esquema A (`/home/retailso/torneogolf-source`)

```bash
# 1) Build del frontend
cd /home/retailso/torneogolf-source/frontend
npm run build

# 2) Copiar build a la carpeta que sirve Nginx
cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/

# 3) Reiniciar solo el backend (no tocar otros sistemas)
pm2 restart teetracker-backend
```

### Si usás esquema B (`/var/www/torneogolf`)

```bash
# 1) Build del frontend
cd /var/www/torneogolf/frontend
npm run build

# 2) Reiniciar solo el proceso de torneogolf (no "pm2 restart all")
pm2 restart teetracker-backend
# Si tenés proceso para el frontend:
# pm2 restart teetracker-frontend
```

### Verificar

```bash
pm2 list
```

Buscá el proceso de torneogolf (ej. `teetracker-backend`) y usá ese nombre en el `restart`. No uses `pm2 restart all` si tenés otros sistemas en el mismo VPS.

---

## Resumen rápido

1. **GitHub:** Ya subido a `origin` (srs-suite/torneo-golf). Si necesitás otro remoto, agregalo y hacé `git push <remoto> main`.
2. **FileZilla:** Subir los 5 archivos a la **misma ruta** donde está el proyecto en el VPS (A: `torneogolf-source`, B: `torneogolf`).
3. **VPS:** `cd frontend && npm run build`, luego (en A) copiar `dist/*` a la carpeta del sitio, y `pm2 restart teetracker-backend`.

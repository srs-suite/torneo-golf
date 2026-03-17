# Checklist: archivos para que producción quede igual que dev

Revisá que **todos** estos archivos estén en el VPS (misma ruta que en tu proyecto). Si falta alguno, subilo con FileZilla.

---

## 1. Base de datos

Si usás **la misma base de datos en dev y en producción**, la columna `flyer_url` ya existe (la tenés en dev). No hace falta ejecutar ninguna migración.

Solo si en algún momento tuvieras una BD de producción distinta y sin esa columna, ejecutarías:
`backend/migrations/add_flyer_url_to_tournaments.sql`

---

## 2. Backend (2 archivos)

| Archivo | Qué incluye |
|---------|--------------|
| `backend/src/server.js` | Ruta POST flyer-upload, servir `/uploads/tournaments/`, devolver flyer_url en torneo |
| `backend/src/services/database.js` | flyer_url en create/update torneo, getTournamentForPublicInscription con flyer_url, getTournamentGroups con turno por mayoría (group_tee_preference), asignación a grupo por turno+HCP+espacio, sesión por mayoría |

---

## 3. Frontend (todos los que tocamos)

| Archivo | Qué incluye |
|---------|--------------|
| `frontend/src/components/CreateTournamentModalSimple.tsx` | Flyer: input URL + subir archivo + vista previa |
| `frontend/src/components/TournamentParticipantsModal.tsx` | Enlace inscripción en el modal, toast import, participants_count/participants, handicap_index tipo |
| `frontend/src/components/TeeTimeManagerModal.tsx` | Group.starting_hole \| null, value del select con ?? '' |
| `frontend/src/components/CreateExternalPlayerModal.tsx` | Arreglos tipo indexVal y handicap_index/handicap_local |
| `frontend/src/pages/ClubAdmin.tsx` | Enlace "Enlace inscripción" bajo el nombre del torneo (visible en celular) |
| `frontend/src/pages/TeeTimeManagerSimple.tsx` | afternoonStartHour, getSessionFromTime con hora del torneo, formato hora, botones mañana/tarde, groups_by_hcp, sin handleConfigChange/formatTime sin usar |
| `frontend/src/pages/PublicInscription.tsx` | Mostrar flyer (flyer_url), tipo TournamentInfo sin flyerUrl |
| `frontend/src/hooks/useParticipants.ts` | useUpdateParticipantHandicap, invalidación tournament-groups |
| `frontend/src/hooks/useTournaments.ts` | toast() en lugar de toast.info() |
| `frontend/src/services/tournamentService.ts` | uploadFlyer (flyer-upload), tipos que usen flyer_url |
| `frontend/src/services/participantService.ts` | Lo que use el frontend de participantes (si se tocó) |
| `frontend/src/types/tournament.ts` | flyer_url, participants_count en TournamentGroup, groups_by_hcp |
| `frontend/src/types/participant.ts` | Tipos que se hayan ajustado (si se tocó) |
| `frontend/src/utils/teeSelection.tsx` | Cambios de utilidades (si se tocó) |

---

## 4. Carpetas en el servidor

- **Backend:** que exista `backend/uploads/tournaments/` (el código la crea si no existe al subir el primer flyer; si querés crearla a mano: `mkdir -p backend/uploads/tournaments`).
- **Variable de entorno (opcional):** si el frontend y la API están en dominios distintos, en el backend puede hacer falta `API_BASE_URL` para que la URL del flyer sea absoluta (ej. `https://tu-api.com`).

---

## 5. Después de subir

1. **Frontend:** en la carpeta del proyecto (ej. `/home/retailso/torneogolf-source`):
   ```bash
   cd frontend && npm run build
   ```
2. **Reiniciar solo tee tracker:**
   ```bash
   pm2 restart teetracker-backend
   pm2 restart teetracker-frontend
   ```

---

## 6. Comprobar en producción

- [ ] Crear/editar torneo: aparece la sección "Flyer del torneo" (URL + subir archivo).
- [ ] Página de inscripción pública: si el torneo tiene flyer_url, se muestra la imagen.
- [ ] Lista de torneos (incluso en celular): en torneos con inscripción por web se ve "Enlace inscripción" bajo el nombre.
- [ ] Modal Participantes: con inscripción por web se ve el recuadro "Enlace para inscripción desde el celular" y "Copiar enlace".
- [ ] Gestión de tee times: turno "Tarde" cuando corresponde; formato de hora HH:mm; botones Mañana/Tarde igual que en dev.

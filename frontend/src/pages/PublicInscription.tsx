import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone, Trophy, Sun, Moon, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { resolveFlyerDisplayUrl } from '@/utils/flyerUrl';

interface TournamentInfo {
  tournament_id: number;
  tournament_name: string;
  tournament_date: string;
  registration_deadline?: string;
  max_participants?: number;
  /** 0 o false = solo inscripción individual (grupos asignados por el club/HCP); 1 o true = permitir crear/unirse a grupos */
  public_inscription_allow_groups?: number | boolean;
  /** 1 = torneo organizado por HCP (no se puede elegir grupo en inscripción); 0 = por grupos */
  groups_by_hcp?: number | boolean;
  /** URL de la imagen del flyer para mostrar en la página de inscripción */
  flyer_url?: string | null;
}

interface GroupOption {
  group_number: number;
  count: number;
  player_names: string;
}

interface ParticipantWithoutGroup {
  participation_id: number;
  player_name: string;
}

export default function PublicInscription() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>();
  const [step, setStep] = useState<'phone' | 'inscribe' | 'already'>('phone');
  const [phone, setPhone] = useState('');
  /** Teléfono o matrícula para el paso de identificación */
  const [phoneOrMatricula, setPhoneOrMatricula] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [memberName, setMemberName] = useState('');
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupChoice, setGroupChoice] = useState<'none' | 'create' | 'join'>( 'none');
  const [joinGroupNumber, setJoinGroupNumber] = useState<number | ''>('');
  const [participantsWithoutGroup, setParticipantsWithoutGroup] = useState<ParticipantWithoutGroup[]>([]);
  const [addToGroupIds, setAddToGroupIds] = useState<number[]>([]);
  const [teePreference, setTeePreference] = useState<'morning' | 'afternoon' | ''>('');
  const [inscribing, setInscribing] = useState(false);
  const [justInscribed, setJustInscribed] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [inscriptionClosed, setInscriptionClosed] = useState(false);

  const storageKey = `inscription_${clubId}_${tournamentId}`;

  const resetForNext = () => {
    localStorage.removeItem(storageKey);
    setStep('phone');
    setToken('');
    setMemberName('');
    setPhone('');
    setPhoneOrMatricula('');
    setGroupChoice('none');
    setJoinGroupNumber('');
    setParticipantsWithoutGroup([]);
    setAddToGroupIds([]);
    setTeePreference('');
    setJustInscribed(true);
  };

  const inscribeAnother = () => {
    localStorage.removeItem(storageKey);
    setStep('phone');
    setToken('');
    setMemberName('');
    setPhone('');
    setPhoneOrMatricula('');
    setGroupChoice('none');
    setJoinGroupNumber('');
    setParticipantsWithoutGroup([]);
    setAddToGroupIds([]);
    setTeePreference('');
    setJustInscribed(false);
  };

  const cancelAndBackToPhone = () => {
    localStorage.removeItem(storageKey);
    setStep('phone');
    setToken('');
    setMemberName('');
    setPhone('');
    setPhoneOrMatricula('');
    setGroupChoice('none');
    setJoinGroupNumber('');
    setParticipantsWithoutGroup([]);
    setAddToGroupIds([]);
    setTeePreference('');
    setError('');
  };

  const loadParticipantsWithoutGroup = async () => {
    if (!token || !clubId || !tournamentId) return;
    try {
      const res = await axios.get(
        `/api/public/inscription/${clubId}/tournament/${tournamentId}/participants-without-group`,
        { params: { token } }
      );
      if (res.data.success && Array.isArray(res.data.participants)) {
        setParticipantsWithoutGroup(res.data.participants);
      }
    } catch {
      setParticipantsWithoutGroup([]);
    }
  };

  const loadTournamentAndGroups = async () => {
    if (!clubId || !tournamentId) return;
    setInscriptionClosed(false);
    setError('');
    try {
      const [tRes, gRes] = await Promise.all([
        axios.get(`/api/public/inscription/${clubId}/tournament/${tournamentId}`),
        axios.get(`/api/public/inscription/${clubId}/tournament/${tournamentId}/groups`)
      ]);
      if (tRes.data.success) setTournament(tRes.data.tournament);
      if (gRes.data.success) setGroups(gRes.data.groups || []);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      const status = err.response?.status;
      const message = err.response?.data?.error || '';
      if (status === 403 || (message && message.toLowerCase().includes('plazo'))) {
        setInscriptionClosed(true);
        setTournament(null);
        setError('');
      } else {
        setError('No se pudo cargar el torneo.');
      }
    }
  };

  const checkAlreadyInscribed = async () => {
    if (!token || !clubId || !tournamentId) return false;
    try {
      const res = await axios.post(`/api/public/inscription/${clubId}/tournament/${tournamentId}/status`, { token });
      return res.data.success && res.data.alreadyInscribed === true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!clubId || !tournamentId) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { token: t, memberName: n } = JSON.parse(saved);
        if (t && n) {
          setToken(t);
          setMemberName(n);
          setStep('inscribe');
        }
      } catch (_) {}
    }
    loadTournamentAndGroups();
  }, [clubId, tournamentId]);

  // Al volver a la pestaña o a la app (p. ej. en el celular), refrescar datos por si el club cambió la modalidad (por grupos / por HCP)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && clubId && tournamentId) {
        loadTournamentAndGroups();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [clubId, tournamentId]);

  // Si el torneo no permite formar grupos (organización por HCP o allow_groups desactivado), forzar inscripción solo individual
  const allowGroupSelection = tournament && tournament.public_inscription_allow_groups !== 0 && tournament.public_inscription_allow_groups !== false
    && (tournament.groups_by_hcp !== 1 && tournament.groups_by_hcp !== true);
  useEffect(() => {
    if (tournament && !allowGroupSelection) {
      setGroupChoice('none');
      setJoinGroupNumber('');
      setAddToGroupIds([]);
    }
  }, [tournament?.public_inscription_allow_groups, tournament?.groups_by_hcp]);

  // Al elegir "crear grupo", cargar lista de inscriptos sin grupo para poder sumarlos
  useEffect(() => {
    if (groupChoice === 'create' && token && clubId && tournamentId) {
      setAddToGroupIds([]);
      loadParticipantsWithoutGroup();
    } else if (groupChoice !== 'create') {
      setParticipantsWithoutGroup([]);
      setAddToGroupIds([]);
    }
  }, [groupChoice, token, clubId, tournamentId]);

  // Si ya tiene token y está en paso inscribe, verificar si ya está inscripto (ej. recargó la página)
  useEffect(() => {
    if (!token || step !== 'inscribe' || !clubId || !tournamentId) return;
    let cancelled = false;
    setCheckingStatus(true);
    (async () => {
      try {
        const already = await checkAlreadyInscribed();
        if (!cancelled && already) setStep('already');
      } catch {
        // Si falla la verificación, mostramos el formulario de inscripción igual
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, step, clubId, tournamentId]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJustInscribed(false);
    setError('');
    const value = (phoneOrMatricula || phone).trim();
    if (!value) {
      setError('Ingresá tu teléfono o número de matrícula.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`/api/public/inscription/${clubId}/verify`, {
        phone: value,
        member_number: value
      });
      if (res.data.success) {
        const { token: newToken, memberName: name } = res.data;
        setToken(newToken);
        setMemberName(name);
        localStorage.setItem(storageKey, JSON.stringify({ token: newToken, memberName: name }));
        setStep('inscribe');
        await loadTournamentAndGroups();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'No encontrado. Verificá teléfono o matrícula y que seas socio activo.');
    } finally {
      setLoading(false);
    }
  };

  const handleInscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (groupChoice === 'join') {
      if (joinGroupNumber === '') {
        setError('Elegí un grupo para continuar.');
        return;
      }
    } else if (!teePreference) {
      setError('Elegí turno mañana o tarde para continuar.');
      return;
    }
    setError('');
    setInscribing(true);
    try {
      const body: any = { token };
      if (allowGroupSelection && groupChoice === 'create') {
        body.createGroup = true;
        if (addToGroupIds.length > 0) body.addToGroup = addToGroupIds;
      }
      if (allowGroupSelection && groupChoice === 'join' && joinGroupNumber !== '') body.groupNumber = Number(joinGroupNumber);
      if ((!allowGroupSelection || groupChoice !== 'join') && teePreference) body.teeTimePreference = teePreference;
      await axios.post(`/api/public/inscription/${clubId}/tournament/${tournamentId}/inscribe`, body);
      resetForNext();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      const msg = e.response?.data?.error || 'No se pudo completar la inscripción.';
      if (e.response?.status === 403 || (msg && msg.toLowerCase().includes('plazo'))) {
        setInscriptionClosed(true);
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setInscribing(false);
    }
  };

  if (!clubId || !tournamentId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <p className="text-gray-600">Faltan datos del torneo en la URL.</p>
      </div>
    );
  }

  if (inscriptionClosed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
          <div className="flex justify-center gap-2 text-amber-600 mb-4">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Inscripciones cerradas</h1>
          <p className="text-gray-600 mb-4">
            El plazo de inscripción para este torneo ha finalizado. Ya no es posible anotarse por esta vía.
          </p>
          <p className="text-sm text-gray-500">Para consultas, contactá al organizador del torneo.</p>
        </div>
      </div>
    );
  }

  const flyerUrl = resolveFlyerDisplayUrl(tournament?.flyer_url);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 pb-12 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 mb-6">
        {flyerUrl ? (
          <div className="mb-4 flex justify-center bg-gray-50 rounded-lg border border-gray-200 p-2 min-h-[120px]">
            <img
              src={flyerUrl}
              alt="Flyer del torneo"
              className="w-full max-h-64 object-contain rounded-lg"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                const parent = el.parentElement;
                if (parent && !parent.querySelector('.flyer-fallback')) {
                  const fallback = document.createElement('p');
                  fallback.className = 'flyer-fallback text-sm text-gray-500';
                  fallback.textContent = 'No se pudo cargar la imagen del flyer.';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <Trophy className="w-8 h-8" />
          <h1 className="text-xl font-bold">Inscripción al torneo</h1>
        </div>
        {tournament && (
          <p className="text-lg font-semibold text-gray-800 mb-6">
            {tournament.tournament_name}
            {tournament.tournament_date && (
              <span className="block text-sm font-normal text-gray-500 mt-0.5">
                {new Date(tournament.tournament_date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </p>
        )}

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            {justInscribed && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">Inscripción realizada. Ingresá el teléfono del próximo jugador para inscribirlo.</p>
              </div>
            )}
            <p className="text-gray-600 mb-4">Ingresá tu teléfono o número de matrícula (como está en el club) para continuar.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="tel"
                value={phoneOrMatricula || phone}
                onChange={(e) => {
                  const v = e.target.value;
                  setPhoneOrMatricula(v);
                  setPhone(v);
                }}
                placeholder="Ej: 11 1234 5678 o matrícula"
                className="w-full sm:flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-3 text-base"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex-shrink-0 bg-green-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" />
                {loading ? '...' : 'Continuar'}
              </button>
            </div>
            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
          </form>
        )}

        {step === 'already' && (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Ya estás inscripto</h2>
            {tournament && <p className="font-medium text-gray-700 mb-2">{tournament.tournament_name}</p>}
            <p className="text-gray-600 mb-6">No hace falta que te anotes de nuevo. Cualquier cambio de grupo u horario lo puede ajustar el organizador.</p>
            <button
              type="button"
              onClick={inscribeAnother}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium border border-gray-300"
            >
              Inscribir a otra persona
            </button>
          </div>
        )}

        {step === 'inscribe' && checkingStatus && (
          <p className="text-gray-600 py-4">Verificando...</p>
        )}

        {step === 'inscribe' && !checkingStatus && tournament && (
          <form onSubmit={handleInscribe}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="text-gray-600">Hola, <strong>{memberName}</strong>. Completá tu inscripción.</p>
              <button
                type="button"
                onClick={cancelAndBackToPhone}
                className="text-sm text-gray-500 hover:text-gray-700 underline shrink-0"
              >
                Usar otro teléfono
              </button>
            </div>

            {!allowGroupSelection && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800 font-medium">Inscripción individual</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {tournament.groups_by_hcp === 1 || tournament.groups_by_hcp === true
                    ? 'Este torneo está organizado por handicap. Los grupos los asigna el club. Solo podés inscribirte de forma individual.'
                    : 'Los grupos serán asignados por el club. Solo podés inscribirte de forma individual.'}
                </p>
              </div>
            )}

            <div className="space-y-4 mb-4">
              {allowGroupSelection && (
                <>
              <p className="font-medium text-gray-700">¿Querés armar o sumarte a un grupo? (máx. 4 por grupo)</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="group" checked={groupChoice === 'none'} onChange={() => setGroupChoice('none')} />
                  No, inscribirme solo
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="group" checked={groupChoice === 'create'} onChange={() => setGroupChoice('create')} />
                  Crear un nuevo grupo
                </label>
                {groupChoice === 'create' && (
                  <div className="ml-6 pl-4 border-l-2 border-gray-200 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Inscriptos sin grupo (opcional, máx. 3):</p>
                    {participantsWithoutGroup.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay otros inscriptos sin grupo para sumar.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                        {participantsWithoutGroup.map((p) => (
                          <label key={p.participation_id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={addToGroupIds.includes(p.participation_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (addToGroupIds.length < 3) setAddToGroupIds([...addToGroupIds, p.participation_id]);
                                } else {
                                  setAddToGroupIds(addToGroupIds.filter((id) => id !== p.participation_id));
                                }
                              }}
                            />
                            {p.player_name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {groups.length > 0 && (
                  <>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="group" checked={groupChoice === 'join'} onChange={() => setGroupChoice('join')} />
                      Unirme a un grupo existente
                    </label>
                    {groupChoice === 'join' && (
                      <select
                        value={joinGroupNumber}
                        onChange={(e) => setJoinGroupNumber(e.target.value === '' ? '' : Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 mt-1"
                      >
                        <option value="">Elegí un grupo</option>
                        {groups.map((g) => (
                          <option key={g.group_number} value={g.group_number}>
                            Grupo {g.group_number} ({g.count}/4) – {g.player_names}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
                </>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-2">Si un administrador cambió la modalidad del torneo (por grupos / por HCP), actualizá la página para ver las opciones actuales.</p>

            {groupChoice !== 'join' && (
              <div className="space-y-2 mb-6">
                <p className="font-medium text-gray-700">Turno <span className="text-red-600">*</span></p>
                <p className="text-sm text-gray-500 mb-2">Elegí si preferís salir por la mañana o por la tarde (obligatorio).</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <input type="radio" name="tee" checked={teePreference === 'morning'} onChange={() => setTeePreference('morning')} />
                    Mañana
                  </label>
                  <label className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <input type="radio" name="tee" checked={teePreference === 'afternoon'} onChange={() => setTeePreference('afternoon')} />
                    Tarde
                  </label>
                </div>
                {!teePreference && (
                  <p className="text-amber-700 text-sm mt-2 font-medium">Seleccioná mañana o tarde para poder guardar la inscripción.</p>
                )}
              </div>
            )}

            {groupChoice === 'join' && joinGroupNumber !== '' && (
              <p className="text-gray-600 text-sm mb-4">Al unirte a este grupo, vas a salir en el mismo turno que el resto del grupo (mañana o tarde según lo definido).</p>
            )}

            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <button
              type="submit"
              disabled={inscribing || (groupChoice === 'join' ? joinGroupNumber === '' : !teePreference)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inscribing ? 'Inscribiendo...' : 'Inscribirme al torneo'}
            </button>
            {groupChoice === 'join' && joinGroupNumber === '' && (
              <p className="text-center text-gray-500 text-sm mt-2">Elegí un grupo para habilitar el botón.</p>
            )}
            {groupChoice !== 'join' && !teePreference && (
              <p className="text-center text-gray-500 text-sm mt-2">Elegí un turno para habilitar el botón.</p>
            )}
          </form>
        )}

      </div>
    </div>
  );
}

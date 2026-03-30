import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, Ban, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { verifyMobilePaymentsPin } from '@/services/participantService'

type PaymentStatus = 'pending' | 'paid' | 'waived'

const MIN_SEARCH_LEN = 2
const MAX_LIST = 25

function normalizeDigits(s: string) {
  return String(s || '').replace(/\D/g, '')
}

export default function TournamentMobilePayments() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const clubIdNum = Number(clubId || 0)
  const tournamentIdNum = Number(tournamentId || 0)
  const [query, setQuery] = useState('')
  const [participants, setParticipants] = useState<any[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinSubmitting, setPinSubmitting] = useState(false)
  const [tournamentName, setTournamentName] = useState('')
  const [entryFee, setEntryFee] = useState(0)
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null)

  useEffect(() => {
    if (!sessionToken) return
    let cancelled = false
    axios
      .get(`/api/club/${clubIdNum}/tournaments/${tournamentIdNum}`)
      .then((res) => {
        const t = res.data?.data
        if (!cancelled && t) {
          setTournamentName(String(t.tournament_name || ''))
          setEntryFee(Number(t.entry_fee || 0))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionToken, clubIdNum, tournamentIdNum])

  const sessionStorageKey = `mobile-payments-session-${clubIdNum}-${tournamentIdNum}`

  const clearMobilePaymentSession = useCallback(() => {
    sessionStorage.removeItem(sessionStorageKey)
    setSessionToken(null)
    setParticipantsLoading(false)
    setParticipants([])
    setSelectedParticipant(null)
    setQuery('')
    setPinInput('')
  }, [sessionStorageKey])

  useEffect(() => {
    if (!clubIdNum || !tournamentIdNum) {
      setParticipantsLoading(false)
      return
    }
    const params = new URLSearchParams(location.search)
    const wantReset = params.get('reiniciar') === '1' || params.get('pin') === '1'
    if (wantReset) {
      sessionStorage.removeItem(sessionStorageKey)
      params.delete('reiniciar')
      params.delete('pin')
      const qs = params.toString()
      navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true })
    }
    const stored = sessionStorage.getItem(sessionStorageKey)
    if (stored) setSessionToken(stored)
    else setParticipantsLoading(false)
  }, [clubIdNum, tournamentIdNum, sessionStorageKey, location.pathname, location.search, navigate])

  const loadParticipants = async (token: string) => {
    const response = await axios.get(
      `/api/club/${clubIdNum}/tournaments/${tournamentIdNum}/mobile-payments-participants`,
      { params: { session: token } }
    )
    setParticipants(response.data.data || [])
  }

  useEffect(() => {
    if (!sessionToken) return
    const run = async () => {
      try {
        setParticipantsLoading(true)
        await loadParticipants(sessionToken)
      } catch (error: any) {
        sessionStorage.removeItem(sessionStorageKey)
        setSessionToken(null)
        toast.error(error?.response?.data?.error || 'Sesión vencida')
      } finally {
        setParticipantsLoading(false)
      }
    }
    run()
  }, [sessionToken, sessionStorageKey])

  const selectedId =
    selectedParticipant != null
      ? (selectedParticipant.participant_id ?? selectedParticipant.participation_id)
      : null

  useEffect(() => {
    if (selectedId == null || !participants.length) return
    const fresh = participants.find((p) => (p.participant_id ?? p.participation_id) === selectedId)
    if (fresh) setSelectedParticipant(fresh)
  }, [participants, selectedId])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = pinInput.replace(/\D/g, '').slice(0, 6)
    if (digits.length !== 6) {
      toast.error('Ingresá el código de 6 dígitos')
      return
    }
    setPinSubmitting(true)
    try {
      const { sessionToken: st } = await verifyMobilePaymentsPin(clubIdNum, tournamentIdNum, digits)
      sessionStorage.setItem(sessionStorageKey, st)
      setSessionToken(st)
      setPinInput('')
      toast.success('Acceso concedido')
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Código incorrecto')
    } finally {
      setPinSubmitting(false)
    }
  }

  const eligible = useMemo(
    () => participants.filter((p: any) => p.status === 'registered' || p.status === 'confirmed'),
    [participants]
  )

  const filtered = useMemo(() => {
    const raw = query.trim()
    const q = raw.toLowerCase()
    const qDigits = normalizeDigits(raw)
    if (raw.length < MIN_SEARCH_LEN) return []

    return eligible
      .filter((p: any) => {
        const name = String(p.player_name || '').toLowerCase()
        const member = String(p.member_number || '').toLowerCase()
        const phoneDigits = normalizeDigits(p.player_phone || p.phone || '')
        const nameMatch = name.includes(q)
        const memberMatch = member.includes(q)
        const phoneMatch = qDigits.length >= 2 && phoneDigits.includes(qDigits)
        return nameMatch || memberMatch || phoneMatch
      })
      .slice(0, MAX_LIST)
  }, [eligible, query])

  const quickSetStatus = async (participant: any, status: PaymentStatus) => {
    const feeAmount = Number(participant.fee_amount ?? entryFee ?? 0)
    const payload: any = {
      payment_status: status,
      fee_amount: feeAmount,
      paid_amount: status === 'paid' ? feeAmount : 0
    }

    try {
      const participantId = participant.participant_id ?? participant.participation_id
      setUpdatingId(participantId)
      await axios.put(
        `/api/club/${clubIdNum}/tournaments/${tournamentIdNum}/mobile-payments-participants/${participantId}/payment`,
        payload,
        { params: { session: sessionToken } }
      )
      if (sessionToken) await loadParticipants(sessionToken)
      toast.success('Cobro actualizado')
    } catch (error) {
      console.error('Error updating mobile payment:', error)
      toast.error('No se pudo actualizar el pago')
    } finally {
      setUpdatingId(null)
    }
  }

  if (!clubIdNum || !tournamentIdNum) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white border rounded-xl p-6 max-w-md w-full shadow-sm text-center text-gray-700">
          <p className="font-medium text-gray-900">Link incompleto o inválido</p>
          <p className="text-sm mt-2">
            Tiene que ser la dirección de cobros móvil del torneo (club y torneo en el link). Volvé a escanear el QR o
            pedí el enlace en mesa.
          </p>
        </div>
      </div>
    )
  }

  if (!sessionToken && !participantsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white border rounded-xl p-6 max-w-md w-full shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 text-center">Cobros del torneo</h1>
          <p className="text-base text-gray-600 mt-3 text-center leading-relaxed">
            Pedí el código de seguridad a la mesa de inscripción e ingresalo abajo.
          </p>
          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de 6 dígitos"
              className="w-full px-4 py-4 border rounded-xl text-center text-3xl font-mono tracking-[0.35em]"
            />
            <button
              type="submit"
              disabled={pinSubmitting || pinInput.replace(/\D/g, '').length !== 6}
              className="w-full py-4 rounded-xl bg-gray-900 text-white text-base font-semibold disabled:opacity-50 min-h-[52px]"
            >
              {pinSubmitting ? 'Verificando…' : 'Continuar'}
            </button>
          </form>
          <p className="text-xs text-center text-gray-500 mt-4">
            Si ya habías entrado en este celular y no te pide código, en la pantalla de búsqueda usá «Pedir código otra
            vez» o abrí el mismo link agregando al final{' '}
            <button
              type="button"
              className="text-indigo-600 underline"
              onClick={() =>
                navigate({ pathname: location.pathname, search: '?reiniciar=1' }, { replace: true })
              }
            >
              ?reiniciar=1
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const loading = participantsLoading
  const searchTooShort = query.trim().length > 0 && query.trim().length < MIN_SEARCH_LEN
  const showEmptyHint = query.trim().length === 0
  const participantIdForUpdate = selectedParticipant
    ? (selectedParticipant.participant_id ?? selectedParticipant.participation_id)
    : null
  const updating = participantIdForUpdate != null && updatingId === participantIdForUpdate

  const renderPaymentActions = (p: any) => {
    const status = (p.payment_status || 'pending') as PaymentStatus
    const statusBadge =
      status === 'paid'
        ? 'bg-green-100 text-green-800'
        : status === 'waived'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-amber-100 text-amber-800'

    return (
      <>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900 break-words">{p.player_name}</p>
            <p className="text-base text-gray-600 mt-1">
              Matrícula: {p.member_number || '—'}
              {p.player_phone || p.phone ? (
                <span className="block sm:inline sm:before:content-['—_'] sm:before:mx-1">
                  Tel: {p.player_phone || p.phone}
                </span>
              ) : null}
            </p>
            <p className="text-base text-gray-700 mt-2">
              Arancel:{' '}
              <span className="font-semibold">{Number(p.fee_amount ?? entryFee ?? 0).toFixed(0)}</span>
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${statusBadge}`}>
            {status === 'paid' ? 'Pagado' : status === 'waived' ? 'Bonificado' : 'Pendiente'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => quickSetStatus(p, 'pending')}
            disabled={updating}
            className="inline-flex items-center justify-center gap-2 text-base py-4 rounded-xl border-2 border-amber-300 text-amber-800 bg-amber-50 font-medium min-h-[52px]"
          >
            <Clock3 className="w-5 h-5 shrink-0" /> Pendiente
          </button>
          <button
            type="button"
            onClick={() => quickSetStatus(p, 'paid')}
            disabled={updating}
            className="inline-flex items-center justify-center gap-2 text-base py-4 rounded-xl border-2 border-green-400 text-green-800 bg-green-50 font-medium min-h-[52px]"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" /> Pagado
          </button>
          <button
            type="button"
            onClick={() => quickSetStatus(p, 'waived')}
            disabled={updating}
            className="inline-flex items-center justify-center gap-2 text-base py-4 rounded-xl border-2 border-blue-300 text-blue-800 bg-blue-50 font-medium min-h-[52px]"
          >
            <Ban className="w-5 h-5 shrink-0" /> Bonificado
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-3 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedParticipant) {
                setSelectedParticipant(null)
              } else {
                navigate(-1)
              }
            }}
            className="p-3 rounded-xl border border-gray-300 bg-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={selectedParticipant ? 'Volver a la búsqueda' : 'Volver'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {selectedParticipant ? 'Registrar cobro' : 'Cobros móvil'}
            </h1>
            <p className="text-sm text-gray-600 truncate">{tournamentName || 'Torneo'}</p>
          </div>
        </div>

        {!selectedParticipant && (
          <div className="max-w-lg mx-auto px-3 pb-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, matrícula o teléfono…"
                autoComplete="off"
                autoCorrect="off"
                className="w-full pl-12 pr-4 py-4 border rounded-xl text-base min-h-[48px]"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Escribí al menos {MIN_SEARCH_LEN} caracteres para buscar. Luego elegí al jugador y registrá el cobro.
            </p>
            <button
              type="button"
              onClick={clearMobilePaymentSession}
              className="text-sm text-indigo-600 underline mt-3 text-left"
            >
              Pedir código otra vez
            </button>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : selectedParticipant ? (
          <div className="bg-white border rounded-xl p-5 shadow-sm">{renderPaymentActions(selectedParticipant)}</div>
        ) : showEmptyHint ? (
          <div className="bg-white border rounded-xl p-8 text-center text-base text-gray-600 leading-relaxed">
            Usá el buscador arriba para encontrar al jugador por nombre, matrícula o teléfono.
          </div>
        ) : searchTooShort ? (
          <div className="bg-white border rounded-xl p-8 text-center text-base text-gray-600">
            Escribí al menos {MIN_SEARCH_LEN} caracteres.
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-base text-gray-600">
            No hay coincidencias. Probá con otra palabra o número.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p: any) => {
              const id = p.participant_id ?? p.participation_id
              const status = (p.payment_status || 'pending') as PaymentStatus
              const shortStatus =
                status === 'paid' ? 'Pagado' : status === 'waived' ? 'Bonif.' : 'Pend.'
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelectedParticipant(p)}
                    className="w-full text-left bg-white border rounded-xl p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[56px]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900 break-words">{p.player_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {p.member_number ? `Mat. ${p.member_number}` : 'Sin matrícula'}
                          {p.player_phone || p.phone ? ` · ${p.player_phone || p.phone}` : ''}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 shrink-0 pt-0.5">{shortStatus}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

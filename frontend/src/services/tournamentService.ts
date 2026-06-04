import axios from 'axios'
import { Tournament, CreateTournamentData, TournamentParticipant, TournamentGroup, TournamentStats } from '@/types/tournament'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token si existe
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clubToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const tournamentService = {
  // Obtener todos los torneos de un club
  async getTournaments(clubId: number): Promise<Tournament[]> {
    console.log(`🏆 API: GET /club/${clubId}/tournaments`)
    const response = await api.get(`/club/${clubId}/tournaments`)
    console.log('🏆 Tournaments response:', response.data)
    return response.data.data || response.data
  },

  // Obtener un torneo específico
  async getTournament(clubId: number, tournamentId: number): Promise<Tournament> {
    console.log(`🏆 API: GET /club/${clubId}/tournaments/${tournamentId}`)
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}`)
    console.log('🏆 Tournament response:', response.data)
    return response.data.data || response.data
  },

  // Crear nuevo torneo
  async createTournament(clubId: number, tournamentData: CreateTournamentData): Promise<Tournament> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments`, tournamentData)
    const response = await api.post(`/club/${clubId}/tournaments`, tournamentData)
    console.log('🏆 Create tournament response:', response.data)
    return response.data.data || response.data
  },

  // Actualizar torneo
  async updateTournament(clubId: number, tournamentId: number, tournamentData: Partial<CreateTournamentData>): Promise<Tournament> {
    console.log(`🏆 API: PUT /club/${clubId}/tournaments/${tournamentId}`, tournamentData)
    const response = await api.put(`/club/${clubId}/tournaments/${tournamentId}`, tournamentData)
    console.log('🏆 Update tournament response:', response.data)
    return response.data.data || response.data
  },

  /** Sube una imagen del flyer (data URL en base64) y devuelve la URL pública. */
  async uploadFlyer(clubId: number, tournamentId: number, imageDataUrl: string): Promise<{ url: string }> {
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/flyer-upload`, { image: imageDataUrl }, {
      timeout: 120000,
    })
    return response.data
  },

  // Eliminar torneo
  async deleteTournament(clubId: number, tournamentId: number): Promise<void> {
    console.log(`🏆 API: DELETE /club/${clubId}/tournaments/${tournamentId}`)
    await api.delete(`/club/${clubId}/tournaments/${tournamentId}`)
    console.log('🏆 Tournament deleted successfully')
  },

  // Cambiar estado del torneo
  async updateTournamentStatus(clubId: number, tournamentId: number, status: Tournament['status']): Promise<Tournament> {
    console.log(`🏆 API: PATCH /club/${clubId}/tournaments/${tournamentId}/status`, { status })
    const response = await api.patch(`/club/${clubId}/tournaments/${tournamentId}/status`, { status })
    console.log('🏆 Tournament status updated:', response.data)
    return response.data.data || response.data
  },

  // Obtener participantes del torneo (misma forma que participantService: participant_id = participation_id para cruzar datos en tee times / impresión)
  async getTournamentParticipants(clubId: number, tournamentId: number): Promise<TournamentParticipant[]> {
    console.log(`🏆 API: GET /club/${clubId}/tournaments/${tournamentId}/participants`)
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}/participants`)
    console.log('🏆 Tournament participants response:', response.data)
    const raw = response.data.data || response.data
    const list = Array.isArray(raw) ? raw : []
    return list.map((p: Record<string, unknown> & { participation_id?: number; participant_id?: number }) => ({
      ...p,
      participant_id: p.participation_id ?? p.participant_id,
    })) as TournamentParticipant[]
  },

  // Agregar participante al torneo
  async addParticipant(clubId: number, tournamentId: number, participantData: {
    player_id?: number
    player_name?: string
    player_email?: string
    player_phone?: string
    player_club?: string
    handicap_index: number
    is_member?: boolean
    notes?: string
    /** Número de grupo (opcional; si el torneo usa grupos). */
    group_number?: number | null
    member_id?: number | null
    external_player_id?: number | null
    player_type?: 'member' | 'visitor' | 'external'
    status?: string
    payment_status?: string
  }): Promise<TournamentParticipant> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/participants`, participantData)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/participants`, participantData)
    console.log('🏆 Participant added response:', response.data)
    return response.data.data || response.data
  },

  // Remover participante del torneo
  async removeParticipant(clubId: number, tournamentId: number, participantId: number): Promise<void> {
    console.log(`🏆 API: DELETE /club/${clubId}/tournaments/${tournamentId}/participants/${participantId}`)
    await api.delete(`/club/${clubId}/tournaments/${tournamentId}/participants/${participantId}`)
    console.log('🏆 Participant removed successfully')
  },

  // Generar grupos automáticamente
  async generateGroups(clubId: number, tournamentId: number, options: {
    groupSize?: number
    autoAssignByHandicap?: boolean
    preserveExistingGroups?: boolean
    byHcp?: boolean
  } = {}): Promise<TournamentGroup[]> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/generate-groups`)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/generate-groups`, options)
    console.log('🏆 Groups generated response:', response.data)
    return response.data.data || response.data
  },

  // Reacomodar participantes por HCP (mover al grupo con número más bajo que tenga su banda y espacio)
  async rebalanceGroupsByHcp(clubId: number, tournamentId: number): Promise<{ moved: number; message?: string }> {
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/rebalance-groups-by-hcp`)
    return response.data.data ?? response.data
  },

  // Mover jugador entre grupos
  async movePlayerToGroup(clubId: number, tournamentId: number, participationId: number, newGroupNumber: number): Promise<void> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/move-player`)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/move-player`, {
      participationId,
      newGroupNumber
    })
    console.log('🏆 Player moved response:', response.data)
    return response.data
  },

  async moveGroupToHole(
    clubId: number,
    tournamentId: number,
    groupNumber: number,
    newStartingHole: number,
    newTeeTime?: string,
    preferredSession?: 'morning' | 'afternoon' | null
  ): Promise<void> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/move-group`)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/move-group`, {
      groupNumber,
      newStartingHole,
      newTeeTime,
      ...(preferredSession === 'morning' || preferredSession === 'afternoon' ? { preferredSession } : {})
    })
    console.log('🏆 Group moved response:', response.data)
    return response.data
  },

  async swapGroupNumbers(clubId: number, tournamentId: number, groupNumber1: number, groupNumber2: number): Promise<void> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/swap-group-numbers`)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/swap-group-numbers`, {
      groupNumber1,
      groupNumber2
    })
    console.log('🏆 Group numbers swapped response:', response.data)
    return response.data
  },

  async createEmptyGroup(clubId: number, tournamentId: number, config?: { hole?: number; time?: string | null; silent?: boolean }): Promise<TournamentGroup> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/create-empty-group`, config)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/create-empty-group`, config || {})
    console.log('🏆 Empty group created response:', response.data)
    return response.data.data
  },

  async deleteEmptyGroup(clubId: number, tournamentId: number, groupNumber: number): Promise<void> {
    console.log(`🏆 API: DELETE /club/${clubId}/tournaments/${tournamentId}/delete-empty-group`)
    const response = await api.delete(`/club/${clubId}/tournaments/${tournamentId}/delete-empty-group`, {
      data: { groupNumber }
    })
    console.log('🏆 Empty group deleted response:', response.data)
  },

  async clearGroups(clubId: number, tournamentId: number): Promise<void> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/clear-groups`)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/clear-groups`)
    console.log('🏆 Groups cleared response:', response.data)
  },

  // Obtener grupos del torneo
  async getTournamentGroups(clubId: number, tournamentId: number): Promise<TournamentGroup[]> {
    console.log(`🏆 API: GET /club/${clubId}/tournaments/${tournamentId}/groups`)
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}/groups`)
    console.log('🏆 Tournament groups response:', response.data)
    return response.data.data || response.data
  },

  // Asignar tee times
  async assignTeeTimes(clubId: number, tournamentId: number, teeTimeData: {
    start_time: string
    interval_minutes: number
    course_holes: number
    enable_two_sessions: boolean
    enable_simultaneous_starts: boolean
    morning_end_time?: string
    afternoon_start_time?: string
    preferred_session?: string
  }): Promise<TournamentGroup[]> {
    console.log(`🏆 API: POST /club/${clubId}/tournaments/${tournamentId}/assign-tee-times`, teeTimeData)
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/assign-tee-times`, teeTimeData)
    console.log('🏆 Tee times assigned response:', response.data)
    return response.data.data || response.data
  },

  // Obtener estadísticas del torneo
  async getTournamentStats(clubId: number, tournamentId: number): Promise<TournamentStats> {
    console.log(`🏆 API: GET /club/${clubId}/tournaments/${tournamentId}/stats`)
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}/stats`)
    console.log('🏆 Tournament stats response:', response.data)
    return response.data.data || response.data
  },

  // Buscar jugadores para agregar al torneo
  async searchPlayers(clubId: number, query: string): Promise<any[]> {
    console.log(`🏆 API: GET /club/${clubId}/search-players?q=${query}`)
    const response = await api.get(`/club/${clubId}/search-players`, { params: { q: query } })
    console.log('🏆 Search players response:', response.data)
    return response.data.data || response.data
  },

  // Obtener rankings anuales
  async getAnnualRankings(clubId: number, year: number): Promise<any> {
    console.log(`🏆 API: GET /club/${clubId}/rankings/annual/${year}`)
    const response = await api.get(`/club/${clubId}/rankings/annual/${year}`)
    console.log('🏆 Annual rankings response:', response.data)
    return response.data.data || response.data
  },

  /** Torneos del año marcados «Contabilizar para el ranking» (candidatos a incluir en el acumulado). */
  async getAnnualRankingCandidates(clubId: number, year: number): Promise<any[]> {
    const response = await api.get(`/club/${clubId}/rankings/annual/${year}/candidates`)
    return response.data.data || response.data || []
  },

  /** Estado guardado de qué torneos cuentan (vacío = provisorio: todos los candidatos). */
  async getAnnualRankingSelection(clubId: number, year: number): Promise<{ uses_explicit_selection: boolean; tournament_ids: number[] }> {
    const response = await api.get(`/club/${clubId}/rankings/annual/${year}/selection`)
    return response.data.data || response.data
  },

  /** Guarda la lista de torneos que conforman el acumulado del año. [] = volver a modo provisorio. */
  async putAnnualRankingSelection(clubId: number, year: number, tournamentIds: number[]): Promise<any> {
    const response = await api.put(`/club/${clubId}/rankings/annual/${year}/selection`, {
      tournament_ids: tournamentIds,
    })
    return response.data.data || response.data
  },

  // Obtener ranking de un torneo específico
  async getTournamentRanking(clubId: number, tournamentId: number): Promise<any> {
    console.log(`🏆 API: GET /club/${clubId}/rankings/tournament/${tournamentId}`)
    const response = await api.get(`/club/${clubId}/rankings/tournament/${tournamentId}`)
    console.log('🏆 Tournament ranking response:', response.data)
    return response.data.data || response.data
  }
}

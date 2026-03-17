export interface Tournament {
  tournament_id: number
  course_id: number
  tournament_name: string
  tournament_date: string
  start_time?: string
  end_time?: string
  tournament_type: 'stroke_play' | 'match_play' | 'scramble' | 'best_ball'
  max_participants?: number
  registration_deadline?: string
  entry_fee: number
  prize_pool: number
  description?: string
  rules?: string
  is_ranking_event?: boolean
  results_mode?: 'standard' | 'scratch_bands'
  separate_ladies?: boolean
  ladies_by_hcp?: boolean
  status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled'
  /** Inscripción por web: si es true, hay URL pública para que los jugadores se anoten */
  public_inscription?: boolean
  /** Si false, en inscripción web no se puede crear/unir grupos (solo individual, club asigna por HCP) */
  public_inscription_allow_groups?: boolean | number
  /** URL de la imagen del flyer para la página de inscripción pública */
  flyer_url?: string | null
  /** 1 = últimos grupos generados por HCP (serpentina); 0 = por inscripción/grupos */
  groups_by_hcp?: number | boolean
  /** 0 = consecutivas, 1 = simultáneas (shotgun) */
  enable_simultaneous_starts?: number | boolean
  afternoon_start_time?: string
  preferred_session?: 'morning' | 'afternoon'
  tee_interval_minutes?: number
  enable_two_sessions?: number | boolean
  weather_conditions?: string
  created_by?: number
  created_at: string
  updated_at: string
  
  // Campos calculados/adicionales
  current_participants?: number
  course_name?: string
  configured_groups?: number
  groups_with_tee_times?: number
  tee_time_status?: 'configured' | 'groups_only' | 'not_configured'
}

export interface TournamentParticipant {
  participant_id: number
  participation_id?: number
  tournament_id: number
  player_id: number
  member_id?: number | null
  external_player_id?: number | null
  registration_date: string
  handicap_index: number
  handicap_local?: number
  course_handicap: number
  group_number?: number
  tee_time?: string
  status: 'registered' | 'confirmed' | 'cancelled' | 'no_show' | 'completed'
  entry_fee_paid: boolean
  notes?: string
  player_type?: 'member' | 'visitor' | 'external'
  
  // Datos del jugador
  player_name?: string
  player_email?: string
  player_phone?: string
  player_club?: string
  is_member?: boolean
}

export interface TournamentGroup {
  group_id: number
  tournament_id: number
  group_number: number
  tee_time: string
  tee_position: string
  group_size: number
  starting_hole?: number | null
  /** Preferencia mañana/tarde elegida al inscribirse (respeta lo que eligió el grupo) */
  group_tee_preference?: 'morning' | 'afternoon' | null
  status: 'pending' | 'playing' | 'completed'
  notes?: string
  
  // Participantes del grupo
  participants?: TournamentParticipant[]
  /** Cuando la API devuelve conteo en lugar del array */
  participants_count?: number
}

export interface TeeTime {
  time: string
  available_spots: number
  total_spots: number
  groups: TournamentGroup[]
}

export interface CreateTournamentData {
  tournament_name: string
  tournament_date: string
  start_time?: string
  end_time?: string
  tournament_type: Tournament['tournament_type']
  status?: Tournament['status']
  max_participants?: number
  registration_deadline?: string
  entry_fee: number
  prize_pool: number
  description?: string
  rules?: string
  is_ranking_event?: boolean
  results_mode?: 'standard' | 'scratch_bands'
  separate_ladies?: boolean
  ladies_by_hcp?: boolean
  public_inscription?: boolean
  public_inscription_allow_groups?: boolean
  flyer_url?: string
  /** Tipo de salida: false = consecutivas, true = simultáneas (shotgun) */
  enable_simultaneous_starts?: boolean
  afternoon_start_time?: string
  preferred_session?: 'morning' | 'afternoon'
  tee_interval_minutes?: number
  enable_two_sessions?: boolean
  /** 1 = agrupación por HCP (serpentina), 0 = por grupos (inscripción) */
  groups_by_hcp?: number | boolean
}

export interface TournamentStats {
  total_participants: number
  total_groups: number
  confirmed_participants: number
  pending_participants: number
  total_revenue: number
  average_handicap: number
}

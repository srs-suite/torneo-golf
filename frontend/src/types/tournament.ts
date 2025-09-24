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
  status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled'
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
  starting_hole?: number
  status: 'pending' | 'playing' | 'completed'
  notes?: string
  
  // Participantes del grupo
  participants?: TournamentParticipant[]
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
}

export interface TournamentStats {
  total_participants: number
  total_groups: number
  confirmed_participants: number
  pending_participants: number
  total_revenue: number
  average_handicap: number
}

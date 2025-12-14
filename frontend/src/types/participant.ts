export interface Participant {
  participant_id: number
  tournament_id: number
  player_id?: number | null
  member_id?: number | null
  external_player_id?: number | null
  player_name: string
  player_email?: string
  player_phone?: string
  handicap_index: number
  handicap_local?: number
  member_number?: string
  player_club: string
  player_type: 'member' | 'visitor' | 'external'
  registration_date: string
  status: 'registered' | 'confirmed' | 'cancelled' | 'checked_in'
  payment_status: 'pending' | 'paid' | 'waived' | 'refunded'
  fee_amount?: number
  paid_amount?: number
  payment_method?: string | null
  receipt_number?: string | null
  paid_at?: string | null
  payment_notes?: string | null
  notes?: string
  display_club?: string
}

export interface PlayerSearchResult {
  player_id?: number | null
  player_name: string
  player_email?: string
  player_phone?: string
  handicap_index: number
  handicap_local?: number
  player_club: string
  player_type: 'member' | 'visitor' | 'external'
  is_home_member?: boolean
  member_number?: string
}

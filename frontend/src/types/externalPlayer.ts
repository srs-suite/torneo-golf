/** Fila de `external_players` para pantalla de gestión (GET .../external-players/registry) */
export interface ExternalPlayerRegistry {
  external_id: number
  full_name: string
  email?: string | null
  phone?: string | null
  gender?: string | null
  handicap_index: number | null
  handicap_local: number | null
  member_number?: string | null
  home_club?: string | null
  notes?: string | null
  aag_last_check_at?: string | null
  aag_sync_status?: string | null
  aag_sync_message?: string | null
  created_at?: string
  updated_at?: string
}

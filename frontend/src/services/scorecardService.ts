import { api } from '@/lib/api'

export interface ScorecardData {
  member_id?: number | null
  external_player_id?: number | null
  scores: { [hole: number]: number }
  entry_method: 'manual' | 'mobile' | 'photo' | 'import'
  verified_card: boolean
  original_archived: boolean
  entry_notes: string
  entered_by?: number | null
}

export interface Scorecard {
  scorecard_id: number
  tournament_id: number
  member_id?: number | null
  external_player_id?: number | null
  course_id: number
  total_gross: number
  total_net: number
  front_nine: number
  back_nine: number
  holes_completed: number
  entry_method: string
  verified_card: boolean
  original_archived: boolean
  entry_notes: string
  entered_by?: number | null
  created_at: string
  updated_at: string
  player_name: string
  player_first_name: string
  player_last_name: string
  handicap_index?: number
  hole_scores: { [hole: number]: number }
}

class ScorecardService {
  async getTournamentScorecards(clubId: number, tournamentId: number, includeAll: boolean = false): Promise<Scorecard[]> {
    const params = includeAll ? '?includeAll=true' : '';
    console.log(`📊 API: GET /club/${clubId}/tournaments/${tournamentId}/scorecards${params}`)
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}/scorecards${params}`)
    console.log('📊 Tournament scorecards response:', response.data)
    return response.data.data
  }

  async getPlayerScorecard(
    clubId: number, 
    tournamentId: number, 
    playerId: number, 
    isExternal: boolean = false
  ): Promise<Scorecard | null> {
    console.log(`📋 API: GET /club/${clubId}/tournaments/${tournamentId}/scorecards/player/${playerId}?external=${isExternal}`)
    try {
      const response = await api.get(
        `/club/${clubId}/tournaments/${tournamentId}/scorecards/player/${playerId}`,
        { params: { external: isExternal } }
      )
      console.log('📋 Player scorecard response:', response.data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null // No scorecard found
      }
      throw error
    }
  }

  async saveScorecard(clubId: number, tournamentId: number, scorecardData: ScorecardData): Promise<any> {
    console.log(`📝 API: POST /club/${clubId}/tournaments/${tournamentId}/scorecards`)
    console.log('📝 Scorecard data:', scorecardData)
    
    const response = await api.post(`/club/${clubId}/tournaments/${tournamentId}/scorecards`, scorecardData)
    console.log('📝 Save scorecard response:', response.data)
    return response.data
  }

  async updateScorecard(clubId: number, scorecardId: number, updateData: Partial<ScorecardData>): Promise<any> {
    console.log(`📝 API: PUT /club/${clubId}/scorecards/${scorecardId}`)
    console.log('📝 Update data:', updateData)
    
    const response = await api.put(`/club/${clubId}/scorecards/${scorecardId}`, updateData)
    console.log('📝 Update scorecard response:', response.data)
    return response.data
  }

  async deleteScorecard(clubId: number, scorecardId: number): Promise<any> {
    console.log(`🗑️ API: DELETE /club/${clubId}/scorecards/${scorecardId}`)
    
    const response = await api.delete(`/club/${clubId}/scorecards/${scorecardId}`)
    console.log('🗑️ Delete scorecard response:', response.data)
    return response.data
  }

  async uploadScorecardPhoto(clubId: number, scorecardId: number, photoFile: File): Promise<any> {
    console.log(`📸 API: POST /club/${clubId}/scorecards/${scorecardId}/photo`)
    
    const formData = new FormData()
    formData.append('photo', photoFile)
    
    const response = await api.post(
      `/club/${clubId}/scorecards/${scorecardId}/photo`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    console.log('📸 Upload photo response:', response.data)
    return response.data
  }

  async getScorecardDetail(clubId: number, tournamentId: number, scorecardId: number): Promise<any> {
    console.log(`👁️ API: GET /club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecardId}`)
    
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecardId}`)
    console.log('👁️ Get scorecard detail response:', response.data)
    return response.data.data
  }

  async getScorecardForPrint(clubId: number, tournamentId: number, scorecardId: number): Promise<any> {
    console.log(`🖨️ API: GET /club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecardId}/print`)
    
    const response = await api.get(`/club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecardId}/print`)
    console.log('🖨️ Get scorecard for print response:', response.data)
    return response.data.data
  }
}

export const scorecardService = new ScorecardService()


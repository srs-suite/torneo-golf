// Club types matching the backend
export interface Club {
  course_id: number
  club_code: string
  course_name: string
  address: string
  city: string
  country: string
  timezone: string
  currency: string
  phone?: string
  email?: string
  website?: string
  logo_path?: string
  enable_field_characteristics?: boolean
  par: number
  physical_holes: number
  max_members: number
  slope_rating?: number
  course_rating?: number
  subscription_status: 'active' | 'suspended' | 'cancelled'
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed fields from backend
  total_tournaments?: number
  administrators?: number
  total_members?: number
}

export interface CreateClubRequest {
  clubCode: string
  clubName: string
  address: string
  city: string
  country: string
  timezone: string
  currency: string
  phone?: string
  email?: string
  website?: string
  logoPath?: string
  enableFieldCharacteristics?: boolean
  par?: number
  physicalHoles?: number
  maxMembers?: number
  slopeRating?: number
  courseRating?: number
  adminName: string
  adminEmail: string
  adminUsername: string
  adminPassword: string
}

export interface UpdateClubRequest {
  clubCode?: string
  clubName?: string
  address?: string
  city?: string
  country?: string
  timezone?: string
  currency?: string
  phone?: string
  email?: string
  website?: string
  logoPath?: string
  enableFieldCharacteristics?: boolean
  par?: number
  physicalHoles?: number
  maxMembers?: number
  slopeRating?: number
  courseRating?: number
  subscription_status?: 'active' | 'suspended' | 'cancelled'
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

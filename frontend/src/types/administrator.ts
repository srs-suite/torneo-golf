export interface Administrator {
  admin_id: number
  course_id?: number // null para admin del sistema
  username: string
  email: string
  full_name: string
  role: 'system_admin' | 'club_admin'
  is_primary_admin: boolean
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  // Info del club (si es admin de club)
  club_name?: string
  club_code?: string
}

export interface CreateAdministratorRequest {
  courseId?: number // null para admin del sistema
  username: string
  email: string
  fullName: string
  password: string
  role: 'system_admin' | 'club_admin'
  isPrimaryAdmin?: boolean
}

export interface UpdateAdministratorRequest {
  username?: string
  email?: string
  fullName?: string
  password?: string
  isActive?: boolean
  isPrimaryAdmin?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

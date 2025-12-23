export interface Member {
  member_id: number;
  course_id: number;
  member_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: 'M' | 'F' | 'Other';
  handicap_index: number;
  handicap_local?: number;
  membership_type: 'full' | 'associate' | 'junior' | 'guest';
  membership_status: 'active' | 'inactive' | 'suspended';
  emergency_contact?: string;
  emergency_phone?: string;
  notes?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMemberRequest {
  course_id: number;
  member_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: 'M' | 'F' | 'Other';
  handicap_index?: number;
  handicap_local?: number;
  membership_type?: 'full' | 'associate' | 'junior' | 'guest';
  emergency_contact?: string;
  emergency_phone?: string;
  notes?: string;
  created_by?: number;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  memberId: number;
}

export interface MemberFilters {
  search: string;
  status: string;
  membershipType: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

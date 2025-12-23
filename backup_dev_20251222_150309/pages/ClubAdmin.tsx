import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Users, 
  Trophy, 
  Clock, 
  Settings, 
  UserPlus,
  Upload,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  User,

  Mail,
  Phone,
  LogOut,
  Plus,
  FileText,
  Smartphone,
  ArrowUpDown,
  Check,
  X,
  Award,
  Camera,
  QrCode,
  DollarSign

} from 'lucide-react'
import { useMembers, useClearClubMembers, useUpdateMember, useDeleteMember, useUpdateMemberStatus } from '@/hooks/useMembers'
import { useTournaments, useDeleteTournament } from '@/hooks/useTournaments'
import { useClubs } from '@/hooks/useClubs'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { CreateMemberModal } from '@/components/CreateMemberModal'
import { MemberDetailsModal } from '@/components/MemberDetailsModal'
import { CreateTournamentModalSimple as CreateTournamentModal } from '@/components/CreateTournamentModalSimple'
import { TournamentParticipantsModal } from '@/components/TournamentParticipantsModal'
import { ExcelImportModal } from '@/components/ExcelImportModal'


import { LoadingSpinner } from '@/components/LoadingSpinner'
import { UserManagement } from '@/components/UserManagement'
import { FinancialReportQR } from '@/components/FinancialReportQR'
import { Member } from '@/types/member'
import { Tournament } from '@/types/tournament'

interface ClubData {
  course_id: number
  course_name: string
  location: string
  phone?: string
  email?: string
  website?: string
  logo_path?: string
}

export function ClubAdmin() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { permissions, isLoading: permissionsLoading } = useUserPermissions(clubId)
  
  const [activeTab, setActiveTab] = useState(() => {
    // Check if there's a tab parameter in the URL
    const tabParam = searchParams.get('tab')
    
    // Determinar la pestaña por defecto según permisos
    const defaultTab = permissions.canViewMembers ? 'members' : 
                      permissions.canViewTournaments ? 'tournaments' : 
                      permissions.canViewSettings ? 'settings' : 'tournaments'
    
    return tabParam && ['members', 'tournaments', 'settings'].includes(tabParam) 
      ? tabParam 
      : defaultTab
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateTournamentModal, setShowCreateTournamentModal] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [showExcelImportModal, setShowExcelImportModal] = useState(false)

  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [viewingMember, setViewingMember] = useState<Member | null>(null)
  const [showMemberDetailsModal, setShowMemberDetailsModal] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [tournamentSearchTerm, setTournamentSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Activo' | 'Inactivo'>('all')
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState<'all' | Tournament['status']>('all')
  const [clubData, setClubData] = useState<ClubData | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingIndex, setEditingIndex] = useState<{memberId: number, value: string} | null>(null)
  const [editingHCP, setEditingHCP] = useState<{memberId: number, value: string} | null>(null)

  const { data: clubs = [] } = useClubs()

  // Sanitize to plain ASCII: remove diacritics and any non-ASCII glyphs
  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip combining marks
      .replace(/[^\x20-\x7E]/g, '');   // strip non-ASCII visible chars
    return base.replace(/\s+/g, ' ').trim();
  }
  
  const { 
    data: members = [], 
    isLoading: membersLoading,
    refetch: refetchMembers 
  } = useMembers(clubId ? parseInt(clubId) : 0)

  // Get current club data to check field characteristics
  const currentClub = clubs.find(club => club.course_id === parseInt(clubId || '0'))
  
  // Calculate HCP using correct formula with appropriate tee or show manual HCP
  const calculateHCP = (member: any) => {
    // If field characteristics are disabled, show manual HCP
    if (!currentClub?.enable_field_characteristics) {
      return member.handicap_local !== null && member.handicap_local !== undefined ? Math.round(member.handicap_local) : '-';
    }
    
    // Calculate HCP automatically when field characteristics are enabled
    if (!member.handicap_index || member.handicap_index === 0) return '-';
    
    // Simple tee selection logic (can be enhanced later)
    // For now, use default values based on gender
    let slopeRating = 125;
    let courseRating = 72.3;
    let par = 72;
    
    if (member.gender === 'F') {
      // Red tees for women
      slopeRating = 118;
      courseRating = 69.8;
    } else if (member.gender === 'M') {
      // Select tee based on handicap
      if (member.handicap_index <= 0) {
        // Black tees (Professional)
        slopeRating = 135;
        courseRating = 74.2;
      } else if (member.handicap_index <= 10) {
        // Blue tees (Low handicap)
        slopeRating = 130;
        courseRating = 72.8;
      } else {
        // White tees (Medium/High handicap)
        slopeRating = 125;
        courseRating = 71.5;
      }
    }
    
    const hcp = member.handicap_index * (slopeRating / 113) + (courseRating - par);
    return Math.round(hcp);
  };

  const { 
    data: tournaments = [], 
    isLoading: tournamentsLoading,
    refetch: refetchTournaments 
  } = useTournaments(clubId ? parseInt(clubId) : 0)

  const deleteTournament = useDeleteTournament(clubId ? parseInt(clubId) : 0)
  const clearMembersMutation = useClearClubMembers(clubId ? parseInt(clubId) : 0)
  const updateMemberMutation = useUpdateMember(clubId ? parseInt(clubId) : 0)
  const deleteMemberMutation = useDeleteMember(clubId ? parseInt(clubId) : 0)
  const updateMemberStatusMutation = useUpdateMemberStatus(clubId ? parseInt(clubId) : 0)





  // Handle tab changes from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['members', 'tournaments', 'settings'].includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [searchParams, activeTab])

  useEffect(() => {
    // Usar el hook useClubs que ya funciona correctamente
    if (clubId && clubs.length > 0) {
      console.log('All clubs:', clubs)
      console.log('Looking for clubId:', clubId)
      
      const club = clubs.find((c: any) => c.course_id === parseInt(clubId))
      console.log('Found club:', club)
      
      if (club) {
        setClubData({
          course_id: club.course_id,
          course_name: club.course_name,
          // Build safe location without "undefined, undefined"
          location: [club.city, club.country].filter(Boolean).join(', '),
          phone: club.phone || '',
          email: club.email || '',
          website: club.website || ''
        })
      }
    }
  }, [clubId, clubs])

  const handleLogout = () => {
    const adminRole = localStorage.getItem('adminRole')
    
    // Si es administrador de sistema, solo borrar datos del club y volver al dashboard
    if (adminRole === 'system_admin') {
      localStorage.removeItem('clubId')
      navigate('/dashboard')
    } else {
      // Si es admin de club, cerrar sesión completamente
      localStorage.clear()
      navigate('/login')
    }
  }

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handleIndexEdit = (memberId: number, currentValue: number | null) => {
    // Si el valor es 0 o null, empezar con campo vacío
    const displayValue = (!currentValue || currentValue === 0) ? '' : currentValue.toString()
    setEditingIndex({ memberId, value: displayValue })
  }

  const handleIndexSave = async (memberId: number) => {
    if (!editingIndex) return
    
    try {
      // Si está vacío, usar 0, sino parsear el valor
      const indexValue = editingIndex.value.trim() === '' ? 0 : parseFloat(editingIndex.value)
      
      await updateMemberMutation.mutateAsync({
        memberId,
        handicap_index: isNaN(indexValue) ? 0 : indexValue
      })
      setEditingIndex(null)
    } catch (error) {
      console.error('Error updating index:', error)
    }
  }

  const handleIndexCancel = () => {
    setEditingIndex(null)
  }

  const handleHCPEdit = (memberId: number) => {
    // Siempre empezar con campo vacío para facilitar la edición
    setEditingHCP({ memberId, value: '' })
  }

  const handleHCPSave = async (memberId: number) => {
    if (!editingHCP) return
    
    try {
      // Si está vacío, usar 0, sino parsear el valor como entero
      const hcpValue = editingHCP.value.trim() === '' ? 0 : parseInt(editingHCP.value)
      
      await updateMemberMutation.mutateAsync({
        memberId,
        handicap_local: isNaN(hcpValue) ? 0 : hcpValue
      })
      setEditingHCP(null)
    } catch (error) {
      console.error('Error updating HCP:', error)
    }
  }

  const handleHCPCancel = () => {
    setEditingHCP(null)
  }

  const filteredMembers = members
    .filter(member => {
      const matchesSearch = 
        member.first_name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.last_name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.phone?.includes(memberSearchTerm)
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'Activo' && member.membership_status === 'active') ||
        (statusFilter === 'Inactivo' && member.membership_status === 'inactive')
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB)
      } else {
        return nameB.localeCompare(nameA)
      }
    })

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.tournament_name.toLowerCase().includes(tournamentSearchTerm.toLowerCase())
    const matchesStatus = tournamentStatusFilter === 'all' || tournament.status === tournamentStatusFilter
    return matchesSearch && matchesStatus
  })

  // Filtrar pestañas según permisos
  const allTabs = [
    { id: 'members', label: 'Socios', icon: Users, count: members.length, permission: permissions.canViewMembers },
    { id: 'tournaments', label: 'Torneos', icon: Trophy, count: tournaments.length, permission: permissions.canViewTournaments },
    { id: 'photos', label: 'Fotos', icon: Camera, count: 0, permission: permissions.canViewPhotos },
    { id: 'settings', label: 'Configuración', icon: Settings, count: 0, permission: permissions.canViewSettings }
  ]
  
  // Filtro más estricto: solo tabs con permission === true o === 1
  // Usar useMemo para recalcular cuando cambien los permisos
  const tabs = useMemo(() => {
    const filtered = allTabs.filter(tab => tab.permission === true)
    console.log('🔍 DEBUG TABS (recalculado):', {
      permissionsLoading,
      canViewPhotos: permissions.canViewPhotos,
      canViewSettings: permissions.canViewSettings,
      allTabs: allTabs.map(t => ({ id: t.id, permission: t.permission })),
      filteredTabs: filtered.map(t => t.id)
    })
    return filtered
  }, [permissions.canViewMembers, permissions.canViewTournaments, permissions.canViewAccounting, 
      permissions.canViewPhotos, permissions.canViewSettings, permissionsLoading])

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'open': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return 'Borrador'
      case 'open': return 'Abierto'
      case 'closed': return 'Cerrado'
      case 'in_progress': return 'En Progreso'
      case 'completed': return 'Completado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const handleEditTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setShowCreateTournamentModal(true)
  }

  const handleManageParticipants = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setShowParticipantsModal(true)
  }

  const handleManageTeeTimes = (tournament: Tournament) => {
    navigate(`/club/${clubId}/tournaments/${tournament.tournament_id}/tee-times`)
  }

  const handleDeleteTournament = async (tournamentId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este torneo?')) {
      await deleteTournament.mutateAsync(tournamentId)
      refetchTournaments()
    }
  }

  // Member management functions
  const handleViewMember = (member: Member) => {
    console.log('👁️ Viendo detalles de:', member);
    setViewingMember(member);
    setShowMemberDetailsModal(true);
  }

  const handleEditMember = (member: Member) => {
    console.log('🔧 Editando miembro:', member);
    setEditingMember(member);
    setShowCreateModal(true);
  }

  const handleDeleteMember = async (member: Member) => {
    console.log('🗑️ Acción eliminar en miembro:', member);
    if (member.membership_status === 'active') {
      // Si está activo, ofrecemos desactivar en lugar de eliminar
      if (window.confirm(`¿Está seguro de que desea desactivar al socio ${member.first_name} ${member.last_name}? Podrá reactivarlo posteriormente.`)) {
        await updateMemberStatusMutation.mutateAsync({ memberId: member.member_id, status: 'inactive' });
      }
    } else {
      // Si ya está inactivo, ofrecemos eliminación permanente
      if (window.confirm(`¿Está seguro de que desea eliminar PERMANENTEMENTE al socio ${member.first_name} ${member.last_name}? Esta acción no se puede deshacer y se perderá todo el historial.`)) {
        await deleteMemberMutation.mutateAsync(member.member_id);
      }
    }
  }



  if (!clubData || permissionsLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{sanitizeAscii(clubData.course_name)}</h1>
                <p className="text-sm text-gray-600">{clubData.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {localStorage.getItem('adminUsername') || 'Usuario'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  navigate(`/club/${clubId}/admin?tab=${tab.id}`)
                }}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id 
                    ? 'border-gray-900 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
            {/* Enlaces externos en la misma línea */}
            {permissions.canViewTournaments && (
              <button
                onClick={() => navigate(`/club/${clubId}/rankings`)}
                className="flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <Trophy className="w-4 h-4" />
                <span>Ranking</span>
              </button>
            )}
            {permissions.canViewAccounting && (
              <button
                onClick={() => navigate(`/club/${clubId}/accounting`)}
                className="flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <DollarSign className="w-4 h-4" />
                <span>Contabilidad</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Members Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Socios</h2>
                <p className="text-gray-600">Administra los socios de tu club</p>
              </div>
              {permissions.canEditMembers && (
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowExcelImportModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Importar Excel</span>
                  </button>
                  {permissions.canDeleteMembers && (
                    <button
                      onClick={() => {
                        if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los socios? Esta acción no se puede deshacer.')) {
                          clearMembersMutation.mutate();
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      disabled={clearMembersMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{clearMembersMutation.isPending ? 'Limpiando...' : 'Limpiar Socios'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Agregar Socio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar socios..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    {memberSearchTerm && (
                      <button
                        onClick={() => setMemberSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Activo' | 'Inactivo')}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="Activo">Activos</option>
                      <option value="Inactivo">Inactivos</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Table */}
            {membersLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header fijo */}
                <div className="bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-6 gap-4 px-6 py-3">
                    <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button 
                        onClick={handleSortToggle}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Socio</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matrícula
                    </div>
                    <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Index
                    </div>
                    <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HCP
                    </div>
                    <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </div>
                    <div className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </div>
                  </div>
                </div>
                
                {/* Cuerpo scrolleable */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                      {filteredMembers.map((member) => (
                        <div key={member.member_id} className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.first_name} {member.last_name}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-900 flex items-center">
                            {member.member_number || '-'}
                          </div>
                          <div className="text-sm text-gray-900 flex items-center">
                            {editingIndex?.memberId === member.member_id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="50"
                                  placeholder="0.0"
                                  value={editingIndex.value}
                                  onChange={(e) => setEditingIndex({...editingIndex, value: e.target.value})}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleIndexSave(member.member_id)
                                    } else if (e.key === 'Escape') {
                                      handleIndexCancel()
                                    }
                                  }}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleIndexSave(member.member_id)}
                                  className="text-green-600 hover:text-green-800"
                                  disabled={updateMemberMutation.isPending}
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleIndexCancel}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleIndexEdit(member.member_id, member.handicap_index)}
                                className="hover:bg-gray-100 px-2 py-1 rounded"
                              >
                                {member.handicap_index || 0}
                              </button>
                            )}
                          </div>
                          <div className="text-sm text-gray-900 flex items-center">
                            {/* Show manual HCP editing when field characteristics are disabled */}
                            {!currentClub?.enable_field_characteristics ? (
                              editingHCP?.memberId === member.member_id ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="72"
                                    placeholder="Ingrese HCP"
                                    value={editingHCP.value}
                                    onChange={(e) => setEditingHCP({...editingHCP, value: e.target.value})}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleHCPSave(member.member_id)
                                      } else if (e.key === 'Escape') {
                                        handleHCPCancel()
                                      }
                                    }}
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleHCPSave(member.member_id)}
                                    className="text-green-600 hover:text-green-800"
                                    disabled={updateMemberMutation.isPending}
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleHCPCancel}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleHCPEdit(member.member_id)}
                                  className="hover:bg-gray-100 px-2 py-1 rounded"
                                  title="Hacer clic para editar HCP manualmente"
                                >
                                  {member.handicap_local !== null && member.handicap_local !== undefined ? Math.round(member.handicap_local) : '-'}
                                </button>
                              )
                            ) : (
                              // Show calculated HCP when field characteristics are enabled
                              <span title="HCP calculado automáticamente">{calculateHCP(member)}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <div className="space-y-1">
                              {member.email && (
                                <div className="flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {member.email}
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm font-medium flex items-center justify-end">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleViewMember(member)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEditMember(member)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Editar miembro"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteMember(member)}
                                className="text-gray-400 hover:text-red-600"
                                title={member.membership_status === 'active' ? 'Desactivar' : 'Eliminar permanentemente'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    {filteredMembers.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay socios</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {memberSearchTerm || statusFilter !== 'all' 
                            ? 'No se encontraron socios con los filtros aplicados.' 
                            : 'Comienza agregando tu primer socio.'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {/* Tournaments Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Torneos</h2>
                <p className="text-gray-600">Administra los torneos de tu club</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateTournamentModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Torneo</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar torneos..."
                      value={tournamentSearchTerm}
                      onChange={(e) => setTournamentSearchTerm(e.target.value)}
                      className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    {tournamentSearchTerm && (
                      <button
                        onClick={() => setTournamentSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={tournamentStatusFilter}
                      onChange={(e) => setTournamentStatusFilter(e.target.value as 'all' | Tournament['status'])}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="draft">Borrador</option>
                      <option value="open">Abierto</option>
                      <option value="closed">Cerrado</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournaments List */}
            {tournamentsLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {filteredTournaments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>
                            Torneo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                            Participantes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '16%' }}>
                            Inscripción
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTournaments.map((tournament) => (
                          <tr key={tournament.tournament_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                  <Trophy className="w-5 h-5 text-white" />
                                </div>
                                <div className="ml-4 flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 leading-tight">
                                    {tournament.tournament_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {tournament.tournament_type === 'stroke_play' && 'Stroke Play'}
                                    {tournament.tournament_type === 'match_play' && 'Match Play'}
                                    {tournament.tournament_type === 'scramble' && 'Scramble'}
                                    {tournament.tournament_type === 'best_ball' && 'Best Ball'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(tournament.tournament_date).toLocaleDateString('es-ES')}
                              </div>
                              {tournament.start_time && (
                                <div className="text-sm text-gray-500">
                                  {tournament.start_time}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>{tournament.current_participants || 0}</div>
                              {tournament.max_participants && (
                                <div className="text-xs text-gray-500">
                                  Máx: {tournament.max_participants}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tournament.status)}`}>
                                {getStatusLabel(tournament.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${tournament.entry_fee?.toLocaleString('es-AR') || 0}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-1">
                                {/* Grupo principal: gestión */}
                                <div className="flex items-center space-x-1 mr-2">
                                  <button 
                                    onClick={() => handleManageParticipants(tournament)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Gestionar Participantes"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleManageTeeTimes(tournament)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Gestionar Tee Times"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {/* Grupo secundario: tarjetas y resultados */}
                                <div className="flex items-center space-x-1 mr-2">
                                  <button 
                                    onClick={() => navigate(`/club/${clubId}/tournaments/${tournament.tournament_id}/scorecard-selection`)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Carga Manual de Tarjetas"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => navigate(`/club/${clubId}/tournaments/${tournament.tournament_id}/results`)}
                                    className="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                    title="Resultados Finales por Categorías"
                                  >
                                    <Award className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      // Aquí podrías mostrar una lista de participantes para seleccionar
                                      // Por ahora, redirigimos a un jugador ejemplo
                                      const firstParticipant = 1 // Esto sería dinámico
                                      navigate(`/club/${clubId}/tournaments/${tournament.tournament_id}/mobile/${firstParticipant}`)
                                    }}
                                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="Scorecard Móvil"
                                  >
                                    <Smartphone className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {/* Grupo de configuración */}
                                <div className="flex items-center space-x-1">
                                  <button 
                                    onClick={() => handleEditTournament(tournament)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Editar Torneo"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTournament(tournament.tournament_id)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar Torneo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay torneos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {tournamentSearchTerm || tournamentStatusFilter !== 'all' 
                        ? 'No se encontraron torneos con los filtros aplicados.' 
                        : 'Comienza creando tu primer torneo.'
                      }
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowCreateTournamentModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Primer Torneo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}





        {activeTab === 'photos' && (
          <PhotoManagementSection clubId={clubId} />
        )}

        {activeTab === 'payments' && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Redirigiendo a la página de pagos...</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <UserManagement clubId={parseInt(clubId || '0')} />
            <FinancialReportQR />
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateMemberModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingMember(null)
            refetchMembers()
          }}
          editMember={editingMember}
          clubId={clubId ? parseInt(clubId) : 0}
        />
      )}

      {showMemberDetailsModal && (
        <MemberDetailsModal
          isOpen={showMemberDetailsModal}
          onClose={() => {
            setShowMemberDetailsModal(false)
            setViewingMember(null)
          }}
          member={viewingMember}
          clubId={clubId ? parseInt(clubId) : 0}
        />
      )}

      {showCreateTournamentModal && (
        <CreateTournamentModal
          isOpen={showCreateTournamentModal}
          onClose={() => {
            setShowCreateTournamentModal(false)
            setSelectedTournament(null)
          }}
          onSuccess={() => {
            setShowCreateTournamentModal(false)
            setSelectedTournament(null)
            refetchTournaments()
          }}
          tournament={selectedTournament}
          clubId={clubId ? parseInt(clubId) : 0}
        />
      )}

      {showParticipantsModal && selectedTournament && (
        <TournamentParticipantsModal
          isOpen={showParticipantsModal}
          onClose={() => {
            setShowParticipantsModal(false)
            setSelectedTournament(null)
            // Refetch tournaments to update participant counts
            refetchTournaments()
          }}
          tournament={selectedTournament}
          clubId={clubId ? parseInt(clubId) : 0}
        />
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        clubId={clubId ? parseInt(clubId) : 0}
        onImportSuccess={() => {
          refetchMembers()
          setShowExcelImportModal(false)
        }}
      />

    </div>
  )
}

// Componente para gestión de fotos
function PhotoManagementSection({ clubId }: { clubId: string | undefined }) {
  const [phoneAuthData, setPhoneAuthData] = useState<{
    qrCode: string | null
    authUrl: string | null
    expiresAt: string | null
    isLoading: boolean
    error: string | null
  }>({
    qrCode: null,
    authUrl: null,
    expiresAt: null,
    isLoading: false,
    error: null
  })

  const [playerQRs, setPlayerQRs] = useState<{[key: string]: string}>({})
  const [tournamentId, setTournamentId] = useState<string>('')
  const [participants, setParticipants] = useState<any[]>([])
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([])
  const [playerFilter, setPlayerFilter] = useState<string>('')

  // Generar QR de autorización para teléfono
  const generatePhoneAuth = async () => {
    if (!tournamentId) {
      alert('Selecciona un torneo primero')
      return
    }

    setPhoneAuthData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/system/generate-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournamentId,
          adminId: 1 // TODO: obtener del contexto real
        })
      })

      const result = await response.json()

      if (result.success) {
        setPhoneAuthData({
          qrCode: result.qrCode,
          authUrl: result.authUrl,
          expiresAt: result.expiresAt,
          isLoading: false,
          error: null
        })
      } else {
        setPhoneAuthData(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Error generando QR'
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      setPhoneAuthData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Error de conexión'
      }))
    }
  }

  // Cargar participantes del torneo
  const loadParticipants = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/club/${clubId}/tournaments/${tournamentId}/participants`)
      const result = await response.json()
      console.log('👥 Respuesta de participantes:', result)
      
      // Handle both response formats
      const participants = result.data || result || []
      setParticipants(participants)
      console.log('✅ Participantes cargados:', participants.length)
    } catch (error) {
      console.error('Error cargando participantes:', error)
    }
  }

  // Generar QR para un jugador específico
  const generatePlayerQR = async (playerId: string, playerName: string) => {
    try {
      const response = await fetch('/api/system/generate-player-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerId,
          playerName: playerName,
          tournamentId: tournamentId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setPlayerQRs(prev => ({
          ...prev,
          [playerId]: result.qrCode
        }))
      }
    } catch (error) {
      console.error('Error generando QR de jugador:', error)
    }
  }

  // Cargar torneos disponibles
  const loadTournaments = async () => {
    try {
      const response = await fetch(`/api/club/${clubId}/tournaments`)
      const result = await response.json()
      console.log('📋 Respuesta de torneos:', result)
      
      // Handle both response formats
      const tournaments = result.data || result || []
      setAvailableTournaments(tournaments)
      console.log('✅ Torneos cargados:', tournaments.length)
    } catch (error) {
      console.error('Error cargando torneos:', error)
    }
  }

  // Efecto para cargar torneos al montar el componente
  useEffect(() => {
    if (clubId) {
      loadTournaments()
    }
  }, [clubId])

  // Efecto para cargar participantes cuando cambia el torneo
  useEffect(() => {
    console.log('🔄 Effect participantes - tournamentId:', tournamentId)
    if (tournamentId) {
      console.log('📞 Llamando loadParticipants con:', tournamentId)
      loadParticipants(tournamentId)
    }
  }, [tournamentId])

  // Filtrar participantes basado en el texto de búsqueda
  const filteredParticipants = participants.filter(participant => {
    if (!playerFilter) return true
    const playerName = participant.player_name || participant.member_name || participant.full_name || ''
    return playerName.toLowerCase().includes(playerFilter.toLowerCase())
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">📷 Sistema de Fotos</h2>
          <p className="text-gray-600">Autorizar teléfonos y generar QRs para cargar tarjetas por foto</p>
        </div>
      </div>

      {/* Selector de Torneo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">1. Seleccionar Torneo</h3>
        <select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecciona un torneo...</option>
          {availableTournaments.map((tournament) => (
            <option key={tournament.tournament_id} value={tournament.tournament_id}>
              {tournament.tournament_name} - {tournament.tournament_date ? new Date(tournament.tournament_date).toLocaleDateString('es-ES') : 'Sin fecha'}
            </option>
          ))}
        </select>
      </div>

      {/* Autorización de Teléfono */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📱 2. Autorizar Teléfono para Subir Fotos
        </h3>
        
        <div className="space-y-4">
          <button
            onClick={generatePhoneAuth}
            disabled={phoneAuthData.isLoading || !tournamentId}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <QrCode className="h-5 w-5" />
            {phoneAuthData.isLoading ? 'Generando...' : 'Generar QR de Autorización'}
          </button>

          {phoneAuthData.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {phoneAuthData.error}
            </div>
          )}

          {phoneAuthData.qrCode && (
            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <h4 className="font-medium text-gray-900 mb-4">
                📱 Escanea este QR con el teléfono que vas a usar
              </h4>
              <img
                src={phoneAuthData.qrCode}
                alt="QR de autorización"
                className="mx-auto mb-4"
                style={{ maxWidth: '300px' }}
              />
              <p className="text-sm text-gray-600 mb-2">
                ⏰ Válido hasta: {phoneAuthData.expiresAt ? new Date(phoneAuthData.expiresAt).toLocaleString('es-ES') : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                URL: {phoneAuthData.authUrl}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QRs de Jugadores */}
      {participants.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🏷️ 3. QRs de Jugadores (para stickers)
          </h3>
          
          {/* Filtro de búsqueda */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar jugador por nombre..."
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {playerFilter && (
              <p className="text-sm text-gray-600 mt-2">
                Mostrando {filteredParticipants.length} de {participants.length} jugadores
              </p>
            )}
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredParticipants.map((participant) => {
              const playerId = participant.participation_id || participant.member_id || participant.external_player_id
              const playerName = participant.player_name || participant.member_name || participant.full_name || 'Jugador sin nombre'
              const hasQR = playerQRs[playerId]

              return (
                <div key={playerId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="font-medium">{playerName}</span>
                  
                  <div className="flex items-center gap-3">
                    {!hasQR ? (
                      <button
                        onClick={() => generatePlayerQR(playerId, playerName)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                      >
                        Generar QR
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <img
                          src={hasQR}
                          alt={`QR de ${playerName}`}
                          className="w-16 h-16 border border-gray-200 rounded"
                        />
                        <button
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = hasQR
                            link.download = `QR_${playerName.replace(/\s+/g, '_')}.png`
                            link.click()
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          📥 Descargar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">📋 Instrucciones de Uso</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Selecciona el torneo activo</li>
          <li>Genera y escanea el QR de autorización con el teléfono del torneo</li>
          <li>Opcionalmente, genera QRs de jugadores para pegar como stickers en las tarjetas</li>
          <li>Desde el teléfono autorizado, toma fotos de las tarjetas</li>
          <li>Selecciona el jugador (manual o por QR) y sube la foto</li>
          <li>El sistema procesará la tarjeta automáticamente</li>
        </ol>
      </div>
    </div>
  )
}

export default ClubAdmin

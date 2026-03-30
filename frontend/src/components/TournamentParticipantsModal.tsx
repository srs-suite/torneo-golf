import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  X, 
  Plus, 
  Search, 
  User, 
  Trophy,
  Trash2,
  Filter,
  Clock,
  UserCheck,
  UserX,
  Users,
  Download,
  DollarSign,
  MessageCircle,
  Link2,
  QrCode
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { SearchInput } from './SearchInput'
import { Tournament } from '@/types/tournament'
import { Participant, PlayerSearchResult } from '@/types/participant'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useParticipants, useAddParticipant, useRemoveParticipant, useUpdateParticipantHandicap, useUpdateParticipantTeePreference, useSearchPlayers, useExternalPlayers, useDeleteExternalPlayer } from '@/hooks/useParticipants'
import { calculateHCPFromIndexDefault } from '@/utils/teeSelection'
import { formatHcpForDisplay } from '@/utils/scoreUtils'
import { getPublicAppOrigin } from '@/utils/publicAppOrigin'
import { useTournamentGroups } from '@/hooks/useTournaments'
import { generateMobilePaymentsPin, getParticipantWhatsAppInscriptionUrl } from '@/services/participantService'
import { CreateExternalPlayerModal } from '@/components/CreateExternalPlayerModal'
import { PaymentModal } from '@/components/PaymentModal'
import { toast } from 'react-hot-toast'

interface TournamentParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament
  clubId: number
}

export function TournamentParticipantsModal({ 
  isOpen, 
  onClose, 
  tournament, 
  clubId 
}: TournamentParticipantsModalProps) {
  const [playerSearchTerm, setPlayerSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | Participant['status']>('all')
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showCreateExternalModal, setShowCreateExternalModal] = useState(false)
  const [showMembersList, setShowMembersList] = useState(false)
  const [showExternalPlayersList, setShowExternalPlayersList] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())
  const [selectedExternalPlayers, setSelectedExternalPlayers] = useState<Set<number>>(new Set())
  const [clubMembers, setClubMembers] = useState<PlayerSearchResult[]>([])
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [externalPlayerSearchTerm, setExternalPlayerSearchTerm] = useState('')
  const [externalPlayerNameForModal, setExternalPlayerNameForModal] = useState('')
  const [editingExternalPlayer, setEditingExternalPlayer] = useState<any>(null)
  // Búsqueda/filtrado de participantes existentes
  const [participantSearch, setParticipantSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'waived'>('all')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showFilterPopover) return
    const onMouseDown = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showFilterPopover])

  // Function to format names: Primera Letra Mayúscula y resto minúscula
  const formatName = (name: string): string => {
    if (!name) return name
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Filter members by search term (name or member number)
  const matchesMemberSearch = (member: PlayerSearchResult, searchTerm: string) => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    const nameMatch = member.player_name.toLowerCase().includes(term)
    const memberNumberMatch = member.member_number?.toLowerCase().includes(term) || false
    
    return nameMatch || memberNumberMatch
  }

  // React Query hooks
  const { data: participants = [], refetch } = useParticipants(clubId, tournament.tournament_id)
  const { data: externalPlayersData = [] } = useExternalPlayers(clubId, showExternalPlayersList)
  const addParticipant = useAddParticipant(clubId, tournament.tournament_id)
  const removeParticipant = useRemoveParticipant(clubId, tournament.tournament_id)
  const updateParticipantHandicap = useUpdateParticipantHandicap(clubId, tournament.tournament_id)
  const updateParticipantTeePreference = useUpdateParticipantTeePreference(clubId, tournament.tournament_id)
  const deleteExternalPlayer = useDeleteExternalPlayer(clubId)
  const searchPlayers = useSearchPlayers(clubId)
  // const createExternalPlayer = useCreateExternalPlayer(clubId)

  const [paymentEditing, setPaymentEditing] = useState<Participant | null>(null)
  const [showMobileAccessModal, setShowMobileAccessModal] = useState(false)
  const [mobilePaymentsPin, setMobilePaymentsPin] = useState('')
  const [mobileAccessLoading, setMobileAccessLoading] = useState(false)
  const [addToGroupNumber, setAddToGroupNumber] = useState<number | ''>('')
  const [preferredSessionForAdd, setPreferredSessionForAdd] = useState<'morning' | 'afternoon'>('morning')
  const [editingIndexParticipantId, setEditingIndexParticipantId] = useState<number | null>(null)
  const [editingIndexValue, setEditingIndexValue] = useState<string>('')
  const [savingIndexParticipantId, setSavingIndexParticipantId] = useState<number | null>(null)
  const allowGroups = (tournament as any)?.public_inscription_allow_groups !== 0 && (tournament as any)?.public_inscription_allow_groups !== false
  const groupsByHcp = (tournament as any)?.results_mode === 'scratch_bands'
  const { data: tournamentGroups = [] } = useTournamentGroups(clubId, tournament.tournament_id)
  const groupNumbers = Array.from(new Set(tournamentGroups.map((g: any) => g.group_number).filter((n: number) => n != null))).sort((a, b) => (a as number) - (b as number)) as number[]

  // Sanitize to ASCII like other pages
  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
    return base.replace(/\s+/g, ' ').trim()
  }

  // Reset search when modal opens
  useEffect(() => {
    if (!isOpen) return
    setPlayerSearchTerm('')
    setSearchResults([])
    setShowAddParticipant(false)
    setSelectedMembers(new Set())
    setSelectedExternalPlayers(new Set())
    setAddToGroupNumber('')
    loadClubMembers()
    // Evitar bucles: refetch una vez al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Derive external players from query data (avoids infinite loop from useEffect + setState)
  const externalPlayers = useMemo(() => {
    const playersFormatted: PlayerSearchResult[] = (externalPlayersData ?? []).map((player: any) => {
      const formattedName = formatName(player.player_name || 'Jugador Externo')
      return {
        player_id: player.player_id,
        player_name: formattedName,
        player_email: player.player_email || '',
        player_phone: player.player_phone || '',
        gender: player.gender ?? undefined,
        handicap_index: player.handicap_index ?? undefined,
        handicap_local: player.handicap_local ?? undefined,
        player_club: player.player_club || 'Sin club',
        player_type: 'external' as const,
        is_home_member: false,
        member_number: player.member_number || '',
        notes: player.notes ?? ''
      }
    })
    return playersFormatted.sort((a, b) =>
      a.player_name.localeCompare(b.player_name, 'es', { sensitivity: 'base' })
    )
  }, [externalPlayersData])

  // Load club members
  const loadClubMembers = async () => {
    try {
      const response = await fetch(`/api/club/${clubId}/members`)
      const data = await response.json()
      
      const membersAsPlayers: PlayerSearchResult[] = data.data.map((member: any) => {
        // Try different name fields that might exist
        let rawName = member.full_name || 
                     member.name || 
                     `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
                     member.member_name ||
                     'Socio Sin Nombre'
        
        // Format the name properly
        const formattedName = formatName(rawName)
        
        return {
          player_id: member.member_id,
          player_name: formattedName,
          player_email: member.email || '',
          player_phone: member.phone || '',
          handicap_index: member.handicap_index || 0,
          handicap_local: member.handicap_local || 0,
          player_club: '',
          player_type: 'member' as const,
          is_home_member: true,
          member_number: member.member_number || ''
        }
      })
      
      // Sort members alphabetically by name
      const sortedMembers = membersAsPlayers.sort((a, b) => 
        a.player_name.localeCompare(b.player_name, 'es', { sensitivity: 'base' })
      )
      
      setClubMembers(sortedMembers)
    } catch (error) {
      console.error('Error loading club members:', error)
    }
  }

  const handleSearchPlayers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchPlayers.mutateAsync(searchTerm)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching players:', error)
      setSearchResults([])
    }
  }

  const handleAddParticipant = async (player: PlayerSearchResult) => {
    try {
      // Check for duplicates
      const existingMemberIds = participants.map(p => p.player_id).filter(Boolean)
      if (existingMemberIds.includes(player.player_id)) {
        alert(`${player.player_name} ya está registrado en el torneo`)
        return
      }

      const participantData = {
        // Para miembros del club
        member_id: player.player_type === 'member' || player.player_type === 'visitor' ? player.player_id : null,
        // Para jugadores externos
        external_player_id: player.player_type === 'external' ? player.player_id : null,
        player_name: player.player_name,
        player_email: player.player_email,
        player_phone: player.player_phone,
        handicap_index: player.handicap_index,
        player_club: player.player_club,
        player_type: player.player_type === 'external' ? 'external' : 'member',
        status: 'registered',
        payment_status: 'pending',
        ...(allowGroups && !groupsByHcp && addToGroupNumber !== '' ? { group_number: addToGroupNumber as number } : {}),
        ...(allowGroups ? { preferred_session: preferredSessionForAdd } : {})
      }

      await addParticipant.mutateAsync(participantData)
      setPlayerSearchTerm('')
      setSearchResults([])
      setShowAddParticipant(false)
      setStatusFilter('registered') // Switch to registered filter to show newly added participant
      // Refresh participants to update the filtered lists
      refetch()
    } catch (error) {
      console.error('Error adding participant:', error)
    }
  }

  const handleDeleteExternalPlayer = async (playerId: number, playerName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${playerName}?`)) {
      try {
        await deleteExternalPlayer.mutateAsync(playerId)
      } catch (error) {
        console.error('Error deleting external player:', error)
      }
    }
  }

  const handleExportToExcel = () => {
    if (participants.length === 0) {
      alert('No hay participantes para exportar.')
      return
    }

    // Preparar los datos para el Excel
    const excelData = participants.map((participant, index) => ({
      'N°': index + 1,
      'Nombre y Apellido': participant.player_name,
      'Matrícula': participant.member_number || '',
      'Index': participant.handicap_index != null ? participant.handicap_index : '',
      'HCP': formatHcpForDisplay(participant.handicap_local ?? (participant as any).handicap_index, (participant as any).handicap_index),
      'Club': participant.player_club || '',
      'Tipo': participant.player_type === 'member' ? 'Socio' : 'Externo',
      'Estado': participant.status === 'registered' ? 'Registrado' : 
               participant.status === 'cancelled' ? 'Cancelado' : 
               participant.status,
      'Email': participant.player_email || '',
      'Teléfono': participant.player_phone || ''
    }))

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Ajustar el ancho de las columnas
    const columnWidths = [
      { wch: 5 },  // N°
      { wch: 25 }, // Nombre y Apellido
      { wch: 12 }, // Matrícula
      { wch: 8 },  // Index
      { wch: 8 },  // HCP
      { wch: 20 }, // Club
      { wch: 10 }, // Tipo
      { wch: 12 }, // Estado
      { wch: 25 }, // Email
      { wch: 15 }  // Teléfono
    ]
    worksheet['!cols'] = columnWidths

    // Agregar el worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes')

    // Generar nombre de archivo con fecha
    const date = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
    const filename = `Participantes_${tournament.tournament_name.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.xlsx`

    // Descargar el archivo
    XLSX.writeFile(workbook, filename)
  }

  /** Arma un texto con el listado de inscriptos y abre WhatsApp para enviarlo (grupo o contacto). */
  const handleSendListByWhatsApp = () => {
    // Orden de inscripción: primero el que se inscribió primero.
    const source = filteredParticipants.length > 0 ? filteredParticipants : participants
    const list = [...source].sort((a, b) => {
      const tsA = Date.parse(String(a.registration_date || ''))
      const tsB = Date.parse(String(b.registration_date || ''))
      const hasA = Number.isFinite(tsA)
      const hasB = Number.isFinite(tsB)

      if (hasA && hasB && tsA !== tsB) return tsA - tsB
      if (hasA && !hasB) return -1
      if (!hasA && hasB) return 1

      const idA = Number((a as any).participation_id ?? a.participant_id ?? 0)
      const idB = Number((b as any).participation_id ?? b.participant_id ?? 0)
      return idA - idB
    })
    if (list.length === 0) {
      toast.error('No hay participantes para enviar.')
      return
    }
    const dateStr = tournament.tournament_date
      ? new Date(tournament.tournament_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : ''
    const now = new Date()
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
    let message = `📋 Inscriptos - ${tournament.tournament_name}`
    if (dateStr) message += ` - ${dateStr}`
    message += ` - ${timeStr}`
    message += '\n\n'
    list.forEach((p, i) => {
      const hcpVal = p.handicap_local != null ? Math.round(Number(p.handicap_local)) : (p.handicap_index != null ? Math.round(Number(p.handicap_index)) : null)
      const hcp = formatHcpForDisplay(hcpVal, (p as any).handicap_index)
      const turnoRaw = (p as any).tee_time_preference ?? (p as any).teeTimePreference ?? (p as any).preferred_session
      const turno = turnoRaw === 'afternoon' || turnoRaw === 'tarde' ? 'Tarde' : turnoRaw === 'morning' || turnoRaw === 'mañana' ? 'Mañana' : '-'
      message += `${i + 1}. ${formatName(p.player_name || '')} - HCP ${hcp} - ${turno}\n`
    })
    message += `\nTotal: ${list.length} inscripto(s)`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    toast.success('Se abrió WhatsApp con el listado. Elegí el chat o grupo y enviá.')
  }

  const publicAppOrigin = getPublicAppOrigin()
  const mobilePaymentsFixedUrl =
    publicAppOrigin && clubId && tournament.tournament_id
      ? `${publicAppOrigin}/c/${clubId}/t/${tournament.tournament_id}/cobro?reiniciar=1`
      : ''

  const openMobilePaymentsModal = () => {
    setShowMobileAccessModal(true)
  }

  useEffect(() => {
    if (!showMobileAccessModal) return
    let cancelled = false
    setMobileAccessLoading(true)
    setMobilePaymentsPin('')
    ;(async () => {
      try {
        const { pin } = await generateMobilePaymentsPin(clubId, tournament.tournament_id)
        if (!cancelled) setMobilePaymentsPin(pin)
      } catch (error) {
        console.error('Error creating mobile payments access:', error)
        if (!cancelled) {
          toast.error('No se pudo generar el código (¿iniciaste sesión como admin?)')
          setShowMobileAccessModal(false)
        }
      } finally {
        if (!cancelled) setMobileAccessLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showMobileAccessModal, clubId, tournament.tournament_id])

  const handleRegenerateMobilePaymentsPin = async () => {
    try {
      setMobileAccessLoading(true)
      const { pin } = await generateMobilePaymentsPin(clubId, tournament.tournament_id)
      setMobilePaymentsPin(pin)
      toast.success('Código nuevo generado')
    } catch (error) {
      console.error('Error regenerating pin:', error)
      toast.error('No se pudo regenerar el código')
    } finally {
      setMobileAccessLoading(false)
    }
  }

  const handleCopyMobilePaymentsLink = async () => {
    if (!mobilePaymentsFixedUrl) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mobilePaymentsFixedUrl)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = mobilePaymentsFixedUrl
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      toast.success('Link de cobros copiado')
    } catch (error) {
      console.error('Error copying mobile payments link:', error)
      toast.error('No se pudo copiar el link')
    }
  }

  const handleCopyMobilePaymentsPin = async () => {
    if (!mobilePaymentsPin) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mobilePaymentsPin)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = mobilePaymentsPin
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      toast.success('Código copiado')
    } catch (error) {
      console.error('Error copying pin:', error)
      toast.error('No se pudo copiar el código')
    }
  }

  const [mobilePaymentsQrDataUrl, setMobilePaymentsQrDataUrl] = useState('')

  useEffect(() => {
    if (!showMobileAccessModal || !mobilePaymentsFixedUrl) {
      setMobilePaymentsQrDataUrl('')
      return
    }
    let cancelled = false
    import('qrcode')
      .then((QR) =>
        QR.default.toDataURL(mobilePaymentsFixedUrl, {
          width: 320,
          margin: 3,
          errorCorrectionLevel: 'H'
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setMobilePaymentsQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setMobilePaymentsQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [showMobileAccessModal, mobilePaymentsFixedUrl])

  const handleToggleSelectMember = (memberId: number) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleSelectAllMembers = () => {
    const availableMembers = clubMembers.filter(member => {
      const isAlreadyAdded = participants.some(p => {
        // Check both player_id and member_id fields since members could be stored either way
        const matchesPlayerId = p.player_id && member.player_id && p.player_id === member.player_id
        const matchesMemberId = (p as any).member_id && member.player_id && (p as any).member_id === member.player_id
        return matchesPlayerId || matchesMemberId
      })
      
      // Apply search filter
      const matchesSearch = matchesMemberSearch(member, memberSearchTerm)
      
      return !isAlreadyAdded && matchesSearch
    })
    
    const allIds = new Set(availableMembers.map(m => m.player_id!))
    setSelectedMembers(selectedMembers.size === allIds.size ? new Set() : allIds)
  }

  const handleToggleSelectExternalPlayer = (playerId: number) => {
    const newSelection = new Set(selectedExternalPlayers)
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId)
    } else {
      newSelection.add(playerId)
    }
    setSelectedExternalPlayers(newSelection)
  }

  const handleSelectAllExternalPlayers = () => {
    const availableExternalPlayers = externalPlayers.filter(player => {
      const isAlreadyAdded = participants.some(p => {
        // For external players, check external_player_id first (newer entries)
        if (p.external_player_id && player.player_id && p.external_player_id === player.player_id) {
          return true
        }
        // For legacy external players (without external_player_id), compare by name
        if (p.player_type === 'external' && p.player_name && player.player_name &&
            p.player_name.toLowerCase().trim() === player.player_name.toLowerCase().trim()) {
          return true
        }
        return false
      })
      
      // Apply search filter
      const matchesSearch = matchesMemberSearch(player, externalPlayerSearchTerm)
      
      return !isAlreadyAdded && matchesSearch
    })
    
    const allIds = new Set(availableExternalPlayers.map(p => p.player_id!))
    setSelectedExternalPlayers(selectedExternalPlayers.size === allIds.size ? new Set() : allIds)
  }

  const handleAddSelectedMembers = async () => {
    try {
      const selectedMembersList = clubMembers.filter(member => 
        selectedMembers.has(member.player_id!)
      )
      
      // Check for duplicates
      const duplicates: string[] = []
      const validMembers: typeof selectedMembersList = []
      
      selectedMembersList.forEach(member => {
        const isAlreadyAdded = participants.some(p => {
          // Check both player_id and member_id fields since members could be stored either way
          const matchesPlayerId = p.player_id && member.player_id && p.player_id === member.player_id
          const matchesMemberId = (p as any).member_id && member.player_id && (p as any).member_id === member.player_id
          return matchesPlayerId || matchesMemberId
        })
        
        if (isAlreadyAdded) {
          duplicates.push(member.player_name)
        } else {
          validMembers.push(member)
        }
      })
      
      if (duplicates.length > 0) {
        alert(`Los siguientes socios ya están registrados en el torneo:\n${duplicates.join('\n')}`)
      }
      
      // Add only non-duplicate members
      for (const member of validMembers) {
        const participantData = {
          member_id: member.player_id,
          player_name: member.player_name,
          player_email: member.player_email,
          player_phone: member.player_phone,
          handicap_index: member.handicap_index,
          player_club: member.player_club,
          player_type: 'member' as const,
          status: 'registered' as const,
          payment_status: 'pending' as const,
          ...(allowGroups && !groupsByHcp && addToGroupNumber !== '' ? { group_number: addToGroupNumber as number } : {}),
          ...(allowGroups ? { preferred_session: preferredSessionForAdd } : {})
        }

        await addParticipant.mutateAsync(participantData)
      }

      setSelectedMembers(new Set())
      if (validMembers.length > 0) {
        setShowMembersList(false)
        // Switch to 'registered' filter to show newly added participants
        setStatusFilter('registered')
        // Refresh participants to update the filtered lists
        refetch()
      }
    } catch (error) {
      console.error('Error adding selected members:', error)
    }
  }

  const handleAddSelectedExternalPlayers = async () => {
    try {
      const selectedExternalPlayersList = externalPlayers.filter(player => 
        selectedExternalPlayers.has(player.player_id!)
      )
      
      // Check for duplicates
      const existingPlayerIds = participants.map(p => p.player_id).filter(Boolean)
      const duplicates: string[] = []
      const validPlayers: typeof selectedExternalPlayersList = []
      
      selectedExternalPlayersList.forEach(player => {
        if (existingPlayerIds.includes(player.player_id)) {
          duplicates.push(player.player_name)
        } else {
          validPlayers.push(player)
        }
      })
      
      if (duplicates.length > 0) {
        alert(`Los siguientes jugadores ya están registrados en el torneo:\n${duplicates.join('\n')}`)
      }
      
      // Add only non-duplicate players
      for (const player of validPlayers) {
        const participantData = {
          player_id: player.player_id,
          external_player_id: player.player_id, // Map player_id to external_player_id for backend
          player_name: player.player_name,
          player_email: player.player_email,
          player_phone: player.player_phone,
          handicap_index: player.handicap_index,
          handicap_local: player.handicap_local, // Add handicap_local field
          member_number: player.member_number, // Add member_number field
          player_club: player.player_club,
          player_type: player.player_type,
          ...(allowGroups && !groupsByHcp && addToGroupNumber !== '' ? { group_number: addToGroupNumber as number } : {}),
          ...(allowGroups ? { preferred_session: preferredSessionForAdd } : {})
        }

        await addParticipant.mutateAsync(participantData)
      }

      setSelectedExternalPlayers(new Set())
      if (validPlayers.length > 0) {
        setShowExternalPlayersList(false)
        // Switch to 'registered' filter to show newly added participants
        setStatusFilter('registered')
        // Refresh participants to update the filtered lists
        refetch()
      }
    } catch (error) {
      console.error('Error adding selected external players:', error)
    }
  }

  const handleRemoveParticipant = async (participantId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este participante?')) {
      try {
        await removeParticipant.mutateAsync(participantId)
      } catch (error) {
        console.error('Error removing participant:', error)
      }
    }
  }

  const filteredParticipants = participants
    .filter(participant => statusFilter === 'all' || participant.status === statusFilter)
    .filter(participant => {
      if (paymentFilter === 'all') return true
      return (participant.payment_status || 'pending') === paymentFilter
    })
    .filter(participant => {
      if (!participantSearch.trim()) return true
      const q = participantSearch.toLowerCase()
      return (
        (participant.player_name || '').toLowerCase().includes(q) ||
        (participant.member_number || '').toLowerCase().includes(q)
      )
    })

  // Statistics
  const stats = useMemo(() => {
    const total = participants.length
    const registered = participants.filter(p => p.status === 'registered').length
    const cancelled = participants.filter(p => p.status === 'cancelled').length
    const paid = participants.filter(p => p.payment_status === 'paid').length
    const pending = participants.filter(p => p.payment_status === 'pending').length
    
    return { total, registered, cancelled, paid, pending }
  }, [participants])

  const getStatusColor = (status: Participant['status']) => {
    switch (status) {
      case 'registered': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Participant['status']) => {
    switch (status) {
      case 'registered': return 'Registrado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-black text-white p-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold">Participantes del Torneo</h2>
            <p className="text-gray-300 text-sm">{tournament.tournament_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-6 rounded-b-lg">
          {/* Stats: más compactos */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div
              className="bg-blue-50 p-3 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => {
                setStatusFilter('all')
                setShowMembersList(false)
                setShowExternalPlayersList(false)
              }}
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue-600">Total</p>
                  <p className="text-lg font-bold text-blue-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div
              className="bg-yellow-50 p-3 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
              onClick={() => {
                setStatusFilter('registered')
                setShowMembersList(false)
                setShowExternalPlayersList(false)
              }}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-yellow-600">Registrados</p>
                  <p className="text-lg font-bold text-yellow-900">{stats.registered}</p>
                  <p className="text-[10px] text-yellow-700 mt-0.5">✓{stats.paid} pag · ⏳{stats.pending} pend</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-600">Cupos</p>
                  <p className="text-lg font-bold text-gray-900">
                    {tournament.max_participants ? `${stats.total}/${tournament.max_participants}` : stats.total}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: una sola fila compacta */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
              {allowGroups && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-600">Turno:</span>
                  <select
                    value={preferredSessionForAdd}
                    onChange={(e) => setPreferredSessionForAdd(e.target.value as 'morning' | 'afternoon')}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    title="Mañana o Tarde"
                  >
                    <option value="morning">Mañana</option>
                    <option value="afternoon">Tarde</option>
                  </select>
                  {!groupsByHcp && (
                    <>
                      <span className="text-xs font-medium text-gray-600">Grupo:</span>
                      <select
                        value={addToGroupNumber}
                        onChange={(e) => setAddToGroupNumber(e.target.value === '' ? '' : Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="">—</option>
                        {groupNumbers.map((num) => {
                          const g = tournamentGroups.find((g: any) => g.group_number === num)
                          const count = g?.participants_count ?? g?.participants?.length ?? 0
                          const full = count >= 4
                          return (
                            <option key={num} value={num} disabled={full}>
                              {num}{full ? ' (lleno)' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setShowMembersList(!showMembersList)
                  setShowExternalPlayersList(false)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
              >
                <Users className="w-4 h-4" />
                <span>Agregar Socio del Club</span>
              </button>
              <button
                onClick={() => {
                  setShowExternalPlayersList(!showExternalPlayersList)
                  setShowMembersList(false)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <UserX className="w-4 h-4" />
                <span>Agregar Jugador Externo</span>
              </button>
              {participants.length > 0 && (
                <>
                  <button
                    onClick={openMobilePaymentsModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 text-sm border border-indigo-200"
                    title="Link fijo + QR; generá un código de seguridad para quien cobra en el teléfono"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>{mobileAccessLoading ? 'Generando...' : 'Acceso cobros'}</span>
                  </button>
                  <button
                    onClick={handleSendListByWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    title="Enviar listado de inscriptos por WhatsApp (al grupo o contacto que elijas)"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Listado WhatsApp</span>
                  </button>
                  <button
                    onClick={handleExportToExcel}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    title={`Exportar ${participants.length} participante(s) a Excel`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel ({participants.length})</span>
                  </button>
                </>
              )}
            <div className="relative" ref={filterPopoverRef}>
              <button
                type="button"
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm"
                title="Filtros por estado y pago"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filtros</span>
                {((statusFilter !== 'all' ? 1 : 0) + (paymentFilter !== 'all' ? 1 : 0)) > 0 && (
                  <span className="bg-gray-200 text-gray-700 text-xs rounded-full px-1.5">
                    {(statusFilter !== 'all' ? 1 : 0) + (paymentFilter !== 'all' ? 1 : 0)}
                  </span>
                )}
              </button>
              {showFilterPopover && (
                <div className="absolute left-0 top-full mt-1 z-50 py-2 px-3 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
                  <p className="text-xs font-medium text-gray-500 mb-2">Estado</p>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | Participant['status'])}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="registered">Registrados</option>
                    <option value="cancelled">Cancelados</option>
                  </select>
                  <p className="text-xs font-medium text-gray-500 mb-2">Pago</p>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="paid">Pagados</option>
                    <option value="waived">Bonificados</option>
                  </select>
                </div>
              )}
            </div>
            <div className="relative flex-1 min-w-[140px] max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar participante o matrícula..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="pl-8 pr-7 py-1.5 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              {participantSearch && (
                <button
                  type="button"
                  onClick={() => setParticipantSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Add Participant Section */}
          {showAddParticipant && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buscar Jugadores</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={playerSearchTerm}
                    onChange={(e) => {
                      setPlayerSearchTerm(e.target.value)
                      handleSearchPlayers(e.target.value)
                    }}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                {searchPlayers.isPending && (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((player, index) => {
                      const typeInfo = {
                        'member': { label: 'Miembro', color: 'bg-blue-100 text-blue-800', icon: UserCheck },
                        'visitor': { label: 'Visitante', color: 'bg-purple-100 text-purple-800', icon: User },
                        'external': { label: 'Externo', color: 'bg-gray-100 text-gray-800', icon: UserX }
                      }[player.player_type] || { label: 'Desconocido', color: 'bg-gray-100 text-gray-800', icon: User }
                      
                      const isAlreadyAdded = participants.some(p => {
                        // For external players, check external_player_id first (newer entries)
                        if (p.player_type === 'external' && p.external_player_id && player.player_id && p.external_player_id === player.player_id) {
                          return true
                        }
                        // For club members, check member_id  
                        if (p.player_type === 'member' && p.player_id && player.player_id && p.player_id === player.player_id) {
                          return true
                        }
                        // For legacy external players (without external_player_id), compare by name
                        if (p.player_type === 'external' && p.player_name && player.player_name &&
                            p.player_name.toLowerCase().trim() === player.player_name.toLowerCase().trim()) {
                          return true
                        }
                        return false
                      })
                      
                      return (
                        <div
                          key={`${player.player_id || 'external'}-${index}`}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <typeInfo.icon className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{player.player_name}</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                                {player.is_home_member && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Local
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {player.player_club} • HCP: {player.handicap_index}
                              </div>
                              {player.player_email && (
                                <div className="text-xs text-gray-400">{player.player_email}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddParticipant(player)}
                            disabled={addParticipant.isPending || isAlreadyAdded}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAlreadyAdded ? 'Ya inscrito' : 'Agregar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Club Members List */}
          {showMembersList && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Socios del Club</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSelectAllMembers}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    {selectedMembers.size === clubMembers.filter(member => {
                      const isAlreadyAdded = participants.some(p => {
                        // Check both player_id and member_id fields since members could be stored either way
                        const matchesPlayerId = p.player_id && member.player_id && p.player_id === member.player_id
                        const matchesMemberId = (p as any).member_id && member.player_id && (p as any).member_id === member.player_id
                        return matchesPlayerId || matchesMemberId
                      })
                      const matchesSearch = matchesMemberSearch(member, memberSearchTerm)
                      return !isAlreadyAdded && matchesSearch
                    }).length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </button>
                  {selectedMembers.size > 0 && (
                    <button
                      onClick={handleAddSelectedMembers}
                      disabled={addParticipant.isPending}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar {selectedMembers.size} Seleccionados</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Search Filter */}
              <div className="mb-4">
                <SearchInput
                  value={memberSearchTerm}
                  onChange={setMemberSearchTerm}
                  placeholder="Buscar por nombre o número de matrícula..."
                />
              </div>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pb-6 px-1 scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {clubMembers
                  .filter((member) => {
                    // Only show members that are NOT already added to the tournament
                    const isAlreadyAdded = participants.some(p => {
                      // Check both player_id and member_id fields since members could be stored either way
                      const matchesPlayerId = p.player_id && member.player_id && p.player_id === member.player_id
                      const matchesMemberId = p.member_id && member.player_id && p.member_id === member.player_id
                      return matchesPlayerId || matchesMemberId
                    })
                    
                    // Apply search filter
                    const matchesSearch = matchesMemberSearch(member, memberSearchTerm)
                    
                    return !isAlreadyAdded && matchesSearch
                  })
                  .sort((a, b) => {
                    // Sort alphabetically by player name
                    return a.player_name.localeCompare(b.player_name, 'es', { sensitivity: 'base' })
                  })
                  .map((member) => {
                    const isSelected = selectedMembers.has(member.player_id!)
                    
                    return (
                    <div
                      key={member.player_id}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-gray-200 border-gray-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectMember(member.player_id!)}
                          className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        />
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {member.player_name}
                            </span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Socio
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.member_number && `N°: ${member.member_number} • `}
                            Index: {member.handicap_index != null ? member.handicap_index : 'N/A'}
                            {' '}• HCP: {formatHcpForDisplay(member.handicap_local, (member as any).handicap_index)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {clubMembers.filter((member) => {
                const isAlreadyAdded = participants.some(p => {
                  // Check both player_id and member_id fields since members could be stored either way
                  const matchesPlayerId = p.player_id && member.player_id && p.player_id === member.player_id
                  const matchesMemberId = p.member_id && member.player_id && p.member_id === member.player_id
                  return matchesPlayerId || matchesMemberId
                })
                const matchesSearch = matchesMemberSearch(member, memberSearchTerm)
                return !isAlreadyAdded && matchesSearch
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {clubMembers.length === 0 
                    ? 'No se encontraron socios en el club'
                    : memberSearchTerm !== ''
                    ? 'No se encontraron socios que coincidan con la búsqueda'
                    : 'Todos los socios del club ya están agregados al torneo'
                  }
                </div>
              )}
            </div>
          )}

          {/* External Players List */}
          {showExternalPlayersList && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Jugadores Externos</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSelectAllExternalPlayers}
                    className="px-3 py-1 text-sm bg-blue-200 text-blue-700 rounded hover:bg-blue-300 transition-colors"
                  >
                    {selectedExternalPlayers.size === externalPlayers.filter(player => {
                      const isAlreadyAdded = participants.some(p => {
                        // For external players, check external_player_id first (newer entries)
                        if (p.external_player_id && player.player_id && p.external_player_id === player.player_id) {
                          return true
                        }
                        // For legacy external players (without external_player_id), compare by name
                        if (p.player_type === 'external' && p.player_name && player.player_name &&
                            p.player_name.toLowerCase().trim() === player.player_name.toLowerCase().trim()) {
                          return true
                        }
                        return false
                      })
                      const matchesSearch = matchesMemberSearch(player, externalPlayerSearchTerm)
                      return !isAlreadyAdded && matchesSearch
                    }).length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </button>
                  {selectedExternalPlayers.size > 0 && (
                    <button
                      onClick={handleAddSelectedExternalPlayers}
                      disabled={addParticipant.isPending}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar {selectedExternalPlayers.size} Seleccionados</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowCreateExternalModal(true)
                      // Pass the current search term to pre-fill the name field
                      setExternalPlayerNameForModal(externalPlayerSearchTerm)
                    }}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Crear Nuevo</span>
                  </button>
                </div>
              </div>
              
              {/* Search Filter */}
              <div className="mb-4">
                <SearchInput
                  value={externalPlayerSearchTerm}
                  onChange={setExternalPlayerSearchTerm}
                  placeholder="Buscar por nombre o número de matrícula..."
                />
              </div>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pb-6 px-1 scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {externalPlayers
                  .filter((player) => {
                    // Only show players that are NOT already added to the tournament
                    const isAlreadyAdded = participants.some(p => {
                      // For external players, check external_player_id first
                      if (player.player_type === 'external') {
                        // If both have external_player_id, compare them
                        if (p.external_player_id && player.player_id) {
                          return p.external_player_id === player.player_id
                        }
                        // If participant doesn't have external_player_id (legacy data), compare by name
                        if (p.player_type === 'external' && !p.external_player_id) {
                          return p.player_name && player.player_name && 
                                 p.player_name.toLowerCase().trim() === player.player_name.toLowerCase().trim()
                        }
                        return false
                      }
                      // For club members, check member_id
                      if (p.player_type === 'member' && p.player_id && player.player_id && p.player_id === player.player_id) {
                        return true
                      }
                      // For external players, check external_player_id (newer entries)
                      if (p.player_type === 'external' && p.external_player_id && player.player_id && p.external_player_id === player.player_id) {
                        return true
                      }
                      // For legacy external players (without external_player_id), compare by name
                      if (p.player_type === 'external' && p.player_name && player.player_name &&
                          p.player_name.toLowerCase().trim() === player.player_name.toLowerCase().trim()) {
                        return true
                      }
                      return false
                    })
                    
                    // Apply search filter
                    const matchesSearch = matchesMemberSearch(player, externalPlayerSearchTerm)
                    
                    return !isAlreadyAdded && matchesSearch
                  })
                  .sort((a, b) => {
                    // Sort alphabetically by player name
                    return a.player_name.localeCompare(b.player_name, 'es', { sensitivity: 'base' })
                  })
                  .map((player) => {
                    const isSelected = selectedExternalPlayers.has(player.player_id!)
                    
                    return (
                      <div
                        key={player.player_id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 border-blue-300' 
                            : 'bg-white border-gray-200 hover:bg-blue-50'
                        }`}
                        onClick={() => handleToggleSelectExternalPlayer(player.player_id!)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectExternalPlayer(player.player_id!)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                          <UserX className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {player.player_name}
                            </span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Externo
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {player.member_number && `N°: ${player.member_number} • `}
                            Index: {player.handicap_index != null ? player.handicap_index : 'N/A'}
                            {' '}• HCP: {formatHcpForDisplay(player.handicap_local, (player as any).handicap_index)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {player.player_club}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingExternalPlayer(player)
                              setExternalPlayerNameForModal('')
                              setShowCreateExternalModal(true)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 transition-colors"
                            title="Editar jugador"
                          >
                            <UserX className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteExternalPlayer(player.player_id!, player.player_name)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded border border-red-700 transition-colors"
                            title="Eliminar jugador"
                          >
                            <Trash2 className="w-3 h-3" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )
                })}
              </div>
              
              {externalPlayers.filter((player) => {
                const isAlreadyAdded = participants.some(p => {
                  // For external players, check external_player_id first (newer entries)
                  if (p.external_player_id && player.player_id && p.external_player_id === player.player_id) {
                    return true
                  }
                  // For legacy external players (without external_player_id), compare by name
                  if (p.player_type === 'external' && p.player_name && player.player_name &&
                      p.player_name.toLowerCase().trim() === player.player_name.toLowerCase().trim()) {
                    return true
                  }
                  return false
                })
                const matchesSearch = matchesMemberSearch(player, externalPlayerSearchTerm)
                return !isAlreadyAdded && matchesSearch
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {externalPlayers.length === 0 
                    ? 'No hay jugadores externos registrados'
                    : externalPlayerSearchTerm !== ''
                    ? 'No se encontraron jugadores que coincidan con la búsqueda'
                    : 'Todos los jugadores externos ya están agregados al torneo'
                  }
                </div>
              )}
            </div>
          )}

          {/* Participants List */}
          {!showMembersList && !showExternalPlayersList && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-8">
            {filteredParticipants.length > 0 ? (
              <div className="overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Club
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matrícula
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Index
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        HCP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Turno
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParticipants.map((participant) => {
                      return (
                        <tr key={participant.participant_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatName(participant.player_name)}</div>
                            {participant.player_type === 'external' && (
                              <div className="text-xs text-blue-600 font-medium">Externo</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sanitizeAscii(participant.display_club || participant.player_club)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.member_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {savingIndexParticipantId === participant.participant_id ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 text-sm">
                                <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                Guardando...
                              </span>
                            ) : editingIndexParticipantId === participant.participant_id ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                value={editingIndexValue}
                                onChange={(e) => setEditingIndexValue(e.target.value)}
                                onBlur={() => {
                                  const v = editingIndexValue.trim()
                                  setEditingIndexParticipantId(null)
                                  if (v === '') {
                                    setSavingIndexParticipantId(participant.participant_id)
                                    updateParticipantHandicap.mutate(
                                      { participantId: participant.participant_id, handicap_index: null, handicap_local: null },
                                      { onSettled: () => { refetch(); setSavingIndexParticipantId(null) } }
                                    )
                                  } else {
                                    const num = Number(v)
                                    if (!Number.isFinite(num)) return
                                    const local = calculateHCPFromIndexDefault(num, (participant as any).gender)
                                    setSavingIndexParticipantId(participant.participant_id)
                                    updateParticipantHandicap.mutate(
                                      { participantId: participant.participant_id, handicap_index: num, handicap_local: local ?? undefined },
                                      { onSettled: () => { refetch(); setSavingIndexParticipantId(null) } }
                                    )
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                }}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIndexParticipantId(participant.participant_id)
                                  setEditingIndexValue(participant.handicap_index != null && participant.handicap_index !== undefined ? String(participant.handicap_index) : '')
                                }}
                                className="text-left underline decoration-dotted hover:bg-gray-100 rounded px-1 py-0.5 min-w-[2rem]"
                                title="Clic para editar index"
                              >
                                {participant.handicap_index !== null && participant.handicap_index !== undefined ? participant.handicap_index : '—'}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatHcpForDisplay(participant.handicap_local ?? (participant as any).handicap_index, (participant as any).handicap_index)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(participant.status)}`}>
                                {getStatusLabel(participant.status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <select
                              value={(() => {
                                const turnoRaw = (participant as any).tee_time_preference ?? (participant as any).teeTimePreference ?? (participant as any).preferred_session
                                return turnoRaw === 'afternoon' || turnoRaw === 'tarde' ? 'afternoon' : turnoRaw === 'morning' || turnoRaw === 'mañana' ? 'morning' : ''
                              })()}
                              onChange={(e) => {
                                const v = e.target.value
                                updateParticipantTeePreference.mutate({
                                  participantId: participant.participant_id,
                                  preferred_session: v === '' ? null : (v as 'morning' | 'afternoon')
                                })
                              }}
                              className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[100px] bg-white"
                              title="Elegir o cambiar turno (Mañana/Tarde)"
                            >
                              <option value="">Sin definir</option>
                              <option value="morning">Mañana</option>
                              <option value="afternoon">Tarde</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(participant.registration_date).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" style={{width: '180px'}}>
                            <button
                              onClick={async () => {
                                try {
                                  const { whatsappUrl } = await getParticipantWhatsAppInscriptionUrl(clubId, tournament.tournament_id, participant.participant_id);
                                  window.open(whatsappUrl, '_blank');
                                  toast.success('Se abrió WhatsApp para enviar la confirmación de inscripción');
                                } catch (e: any) {
                                  toast.error(e.response?.data?.error || 'No se pudo generar el enlace (¿tiene teléfono cargado?)');
                                }
                              }}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 hover:text-green-900 hover:bg-green-50 rounded border border-green-200 hover:border-green-300 transition-colors mr-2"
                              title="Enviar confirmación de inscripción por WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPaymentEditing(participant)}
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border transition-colors mr-2 ${
                                (participant.payment_status === 'paid')
                                  ? 'text-green-700 hover:text-green-900 hover:bg-green-50 border-green-200 hover:border-green-300'
                                  : 'text-red-700 hover:text-red-900 hover:bg-red-50 border-red-200 hover:border-red-300'
                              }`}
                              title={(participant.payment_status === 'paid') ? 'Cobro registrado' : 'Registrar cobro'}
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveParticipant(participant.participant_id)}
                              disabled={removeParticipant.isPending}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 disabled:opacity-50 transition-colors"
                              title="Eliminar participante"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay participantes</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter !== 'all'
                    ? 'No se encontraron participantes con el filtro aplicado.'
                    : 'Comienza agregando con los botones de arriba (Socio del Club o Jugador Externo).'
                  }
                </p>
              </div>
            )}
          </div>
          )}
          
        </div>
      </div>

      {/* Modal para crear jugador externo */}
      {showCreateExternalModal && (
        <CreateExternalPlayerModal
          isOpen={showCreateExternalModal}
          onClose={() => {
            setShowCreateExternalModal(false)
            setExternalPlayerNameForModal('')
            setEditingExternalPlayer(null)
          }}
          initialName={externalPlayerNameForModal}
          editingPlayer={editingExternalPlayer}
          onSuccess={async (player: any) => {
            setShowCreateExternalModal(false)
            setExternalPlayerNameForModal('')
            setEditingExternalPlayer(null)
            if (player && (player.external_id != null || player.player_id != null)) {
              const externalId = player.external_id ?? player.player_id
              const alreadyAdded = participants.some(
                (p: any) => p.external_player_id === externalId || p.player_id === externalId
              )
              if (!alreadyAdded) {
                try {
                  const participantData = {
                    external_player_id: externalId,
                    player_name: player.full_name ?? player.player_name,
                    player_email: player.player_email ?? player.email,
                    player_phone: player.player_phone ?? player.phone,
                    player_club: player.player_club ?? player.home_club,
                    handicap_index: player.handicap_index ?? 0,
                    player_type: 'external' as const,
                    status: 'registered' as const,
                    payment_status: 'pending' as const,
                    ...(allowGroups && !groupsByHcp && addToGroupNumber !== '' ? { group_number: addToGroupNumber as number } : {}),
                    ...(allowGroups ? { preferred_session: preferredSessionForAdd } : {})
                  }
                  await addParticipant.mutateAsync(participantData)
                  setStatusFilter('registered')
                  refetch()
                } catch (err) {
                  console.error('Error adding created player to tournament:', err)
                }
              }
            }
          }}
          clubId={clubId}
        />
      )}

      {showMobileAccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileAccessModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                <h3 className="font-semibold">Cobros en teléfono</h3>
              </div>
              <button onClick={() => setShowMobileAccessModal(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600">
                El mismo QR y link sirven siempre. Quien escanee debe ingresar el código de seguridad que generás acá (cada vez que pulsás Regenerar, el código cambia).
              </p>
              <div className="text-center py-2 min-h-[4.5rem] flex flex-col items-center justify-center">
                <p className="text-xs text-gray-500 mb-1">Código de seguridad</p>
                {mobileAccessLoading && !mobilePaymentsPin ? (
                  <p className="text-sm text-gray-600">Generando código…</p>
                ) : (
                  <p className="text-3xl font-mono font-bold tracking-widest text-gray-900">{mobilePaymentsPin || '—'}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyMobilePaymentsPin}
                  disabled={!mobilePaymentsPin || mobileAccessLoading}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Copiar código
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateMobilePaymentsPin}
                  disabled={mobileAccessLoading}
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Regenerar código
                </button>
              </div>
              <input
                value={mobilePaymentsFixedUrl}
                readOnly
                title={mobilePaymentsFixedUrl}
                className="w-full px-3 py-2 border rounded-lg text-xs bg-gray-50 break-all"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyMobilePaymentsLink}
                  className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  Copiar link
                </button>
              </div>
              {mobilePaymentsQrDataUrl && (
                <div className="pt-2 border-t">
                  <img
                    src={mobilePaymentsQrDataUrl}
                    alt="QR acceso cobros"
                    className="mx-auto w-56 h-56 border rounded-md"
                  />
                  <p className="text-[11px] text-center text-gray-500 mt-2">Imprimí o mostrá este QR; el código lo das aparte.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Cobro */}
      <PaymentModal
        isOpen={!!paymentEditing}
        onClose={() => setPaymentEditing(null)}
        participant={paymentEditing}
        clubId={clubId}
        tournamentId={tournament.tournament_id}
        defaultFee={tournament.entry_fee || 0}
        onSaved={() => refetch()}
      />
    </div>
  )
}


import { Building2, Users } from 'lucide-react'
import { useClubs } from '@/hooks/useClubs'

export function Header() {
  const { data: clubs = [] } = useClubs()
  
  // Calculate real stats
  const totalClubs = clubs.length
  const totalMembers = clubs.reduce((acc, club) => acc + (club.total_members || 0), 0)
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-6">
          {/* Stats Summary */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <Building2 className="w-4 h-4 mr-1" />
              <span className="text-lg font-semibold text-gray-900">{totalClubs}</span>
              <span className="ml-1">CLUBES</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-lg font-semibold text-gray-900">{totalMembers}</span>
              <span className="ml-1">MIEMBROS</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

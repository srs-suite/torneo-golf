interface ClubStatusCardProps {
  name: string
  status: string
  members: {
    current: number
    total: number
  }
  tournaments: number
}

export function ClubStatusCard({ name, status, members, tournaments }: ClubStatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
            {status}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Miembros</div>
          <div className="text-lg font-semibold text-gray-900">
            {members.current}/{members.total}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Torneos</div>
          <div className="text-lg font-semibold text-gray-900">{tournaments}</div>
        </div>
      </div>
      
      {/* Progress bar para membership */}
      <div className="mt-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full" 
            style={{ width: `${(members.current / members.total) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

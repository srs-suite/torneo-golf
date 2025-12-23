import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string
  change: string
  icon: LucideIcon
  color: string
}

export function StatsCard({ label, value, change, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <div className={`${color} rounded-full p-3 mr-4`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              <div className="text-sm font-medium text-gray-600">{label}</div>
            </div>
          </div>
          <div className="text-sm text-green-600 font-medium">{change}</div>
        </div>
      </div>
    </div>
  )
}

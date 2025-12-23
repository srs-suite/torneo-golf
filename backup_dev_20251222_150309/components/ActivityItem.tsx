import { LucideIcon } from 'lucide-react'

interface ActivityItemProps {
  icon: LucideIcon
  title: string
  description: string
  time: string
  color: string
}

export function ActivityItem({ icon: Icon, title, description, time, color }: ActivityItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className={`${color} rounded-full p-2 flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
        <div className="text-xs text-gray-400 mt-1">{time}</div>
      </div>
    </div>
  )
}

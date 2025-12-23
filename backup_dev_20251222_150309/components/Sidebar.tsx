import { NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutGrid, 
  Building2, 
  Users, 
  CreditCard, 
  FileText, 
  Trophy,
  DollarSign,
  Settings,
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { name: 'Gestión de Clubes', href: '/clubs', icon: Building2 },
  { name: 'Administradores', href: '/administrators', icon: Users },
  { name: 'Suscripciones', href: '/subscriptions', icon: CreditCard },
  { name: 'Ranking', href: '/reports#ranking', icon: Trophy },
  { name: 'Reportes', href: '/reports', icon: FileText },
  { name: 'Configuración', href: '/configuration', icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()
  
  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }
  
  return (
    <div className="w-64 bg-black text-white flex flex-col">
      {/* Logo/Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-3">
          <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
        </div>
        <span className="text-lg font-semibold">TeeTracker Pro</span>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-medium">Admin Sistema</div>
            <div className="text-xs text-gray-400">Super Administrador</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}

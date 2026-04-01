import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Users, 
  Cake, 
  UserCheck, 
  Banknote, 
  MessageSquare, 
  Gift, 
  Receipt,
  Trophy
} from 'lucide-react'
import { Button } from '../../../components/ui/button'

const HR_sidebar = ({ activeTab, setActiveTab }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const isOnLeaderboard = location.pathname === '/admin-leaderboard'

  // HR Management sections (tabs from HR management page)
  const hrMenuItems = [
    {
      id: 'team',
      label: 'Team Management',
      icon: Users,
      tabKey: 'team'
    },
    {
      id: 'birthdays',
      label: 'Birthdays',
      icon: Cake,
      tabKey: 'birthdays'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: UserCheck,
      tabKey: 'attendance'
    },
    {
      id: 'salary',
      label: 'Salary Management',
      icon: Banknote,
      tabKey: 'salary'
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: MessageSquare,
      tabKey: 'requests'
    },
    {
      id: 'allowances',
      label: 'Allowances',
      icon: Gift,
      tabKey: 'allowances'
    },
    {
      id: 'expenses',
      label: 'Recurring Expenses',
      icon: Receipt,
      tabKey: 'expenses'
    }
  ]

  const handleTabClick = (tabKey) => {
    if (setActiveTab) {
      setActiveTab(tabKey)
    }
  }

  // When on Leaderboard page, show only HR Management link + Leaderboard (active)
  if (isOnLeaderboard) {
    return (
      <div className="fixed left-0 top-16 w-64 bg-white shadow-sm border-r border-gray-200 h-screen z-40">
        <div className="p-6 h-full flex flex-col">
          <div className="mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">HR</h2>
            <p className="text-sm text-gray-500 mt-1">Human Resources</p>
          </div>
          <nav className="space-y-2 flex-1">
            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 text-gray-500 hover:bg-gray-50/60 hover:text-gray-600"
              onClick={() => navigate('/admin-hr-management')}
            >
              <Users className="h-5 w-5 text-gray-400" />
              <span className="font-medium">HR Management</span>
            </Button>
            <Button
              variant="default"
              className="w-full justify-start space-x-3 bg-teal-50/80 text-teal-600 border-teal-100 shadow-sm"
            >
              <Trophy className="h-5 w-5 text-teal-500" />
              <span className="font-medium">Leaderboard</span>
            </Button>
          </nav>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed left-0 top-16 w-64 bg-white shadow-sm border-r border-gray-200 h-screen z-40">
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">HR Management</h2>
          <p className="text-sm text-gray-500 mt-1">Human Resources</p>
        </div>

        <nav className="space-y-2 flex-1">
          {hrMenuItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.tabKey
            
            return (
              <Button
                key={item.id}
                variant={active ? "default" : "ghost"}
                className={`w-full justify-start space-x-3 transition-all duration-300 ease-in-out ${
                  active 
                    ? 'bg-teal-50/80 text-teal-600 border-teal-100 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50/60 hover:text-gray-600'
                }`}
                onClick={() => handleTabClick(item.tabKey)}
              >
                <Icon className={`h-5 w-5 transition-colors duration-300 ease-in-out ${active ? 'text-teal-500' : 'text-gray-400 hover:text-gray-500'}`} />
                <span className={`font-medium transition-colors duration-300 ease-in-out ${active ? 'text-teal-600' : 'text-gray-500'}`}>{item.label}</span>
              </Button>
            )
          })}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 text-gray-500 hover:bg-gray-50/60 hover:text-gray-600"
              onClick={() => navigate('/admin-leaderboard')}
            >
              <Trophy className="h-5 w-5 text-gray-400 hover:text-gray-500" />
              <span className="font-medium">Leaderboard</span>
            </Button>
          </div>
        </nav>
      </div>
    </div>
  )
}

export default HR_sidebar

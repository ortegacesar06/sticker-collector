import { NavLink } from 'react-router-dom'
import { Stamp, ScanLine, CopyPlus, BarChart3 } from 'lucide-react'

const navItems = [
  { to: '/', icon: Stamp, label: 'Album' },
  { to: '/scan', icon: ScanLine, label: 'Scan' },
  { to: '/repes', icon: CopyPlus, label: 'Repes' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
]

export function BottomNav() {
  return (
    <nav 
      className="flex border-t border-surface bg-bg px-2 pt-2 pb-6 shrink-0" 
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors touch-target justify-center ${
              isActive ? 'text-accent' : 'text-missing'
            }`
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
              {isActive && <span className="sr-only">(current)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

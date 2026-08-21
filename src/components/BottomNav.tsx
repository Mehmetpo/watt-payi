import { NavLink } from 'react-router-dom';
import { Home, History, Plus, CircleUserRound } from 'lucide-react';
import './BottomNav.css';

const TABS = [
  { to: '/', label: 'Ana Sayfa', Icon: Home },
  { to: '/history', label: 'Geçmiş', Icon: History },
];

const TABS_RIGHT = [
  { to: '/profile', label: 'Profil', Icon: CircleUserRound },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' active' : '')}
        >
          <Icon className="bottom-nav__icon" size={22} strokeWidth={1.7} />
          <span>{label}</span>
        </NavLink>
      ))}

      <NavLink to="/add" aria-label="Fatura ekle" className="bottom-nav__fab">
        <Plus size={24} strokeWidth={2.2} />
      </NavLink>

      {TABS_RIGHT.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' active' : '')}
        >
          <Icon className="bottom-nav__icon" size={22} strokeWidth={1.7} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

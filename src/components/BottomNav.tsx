import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const TABS = [
  { to: '/', label: 'Ana Sayfa', icon: '◆' },
  { to: '/history', label: 'Geçmiş', icon: '▤' },
  { to: '/add', label: 'Ekle', icon: '+' },
  { to: '/profile', label: 'Profil', icon: '◐' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' active' : '')}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

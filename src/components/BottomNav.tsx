import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, History, Plus, CircleUserRound } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import './BottomNav.css';

const TABS = [
  { to: '/', labelKey: 'nav.home', Icon: Home },
  { to: '/history', labelKey: 'nav.history', Icon: History },
];

const TABS_RIGHT = [
  { to: '/profile', labelKey: 'nav.profile', Icon: CircleUserRound },
];

const ALL_TABS = [...TABS, ...TABS_RIGHT];

interface PillRect {
  left: number;
  width: number;
}

export function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [pillRect, setPillRect] = useState<PillRect | null>(null);

  const activeTo = ALL_TABS.find(({ to }) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  )?.to;

  useLayoutEffect(() => {
    function measure() {
      if (!activeTo || !navRef.current) {
        setPillRect(null);
        return;
      }
      const el = itemRefs.current.get(activeTo);
      if (!el) return;
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = el.getBoundingClientRect();
      setPillRect({ left: itemRect.left - navRect.left, width: itemRect.width });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeTo]);

  function renderTab({ to, labelKey, Icon }: (typeof ALL_TABS)[number]) {
    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        ref={(el) => {
          if (el) itemRefs.current.set(to, el);
          else itemRefs.current.delete(to);
        }}
        className={({ isActive }) => 'bottom-nav__item' + (isActive ? ' active' : '')}
      >
        <Icon className="bottom-nav__icon" size={22} strokeWidth={1.7} />
        <span className="bottom-nav__label">{t(labelKey)}</span>
      </NavLink>
    );
  }

  return (
    <nav className="bottom-nav" ref={navRef}>
      {pillRect && (
        <span
          className="bottom-nav__pill"
          aria-hidden="true"
          style={{ transform: `translateX(${pillRect.left}px)`, width: pillRect.width }}
        />
      )}
      {TABS.map(renderTab)}

      <NavLink to="/add" aria-label={t('nav.addBill')} className="bottom-nav__fab">
        <Plus size={24} strokeWidth={2.2} />
      </NavLink>

      {TABS_RIGHT.map(renderTab)}
    </nav>
  );
}

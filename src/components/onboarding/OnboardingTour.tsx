import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { User, Camera, Zap, PieChart, type LucideIcon } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import './OnboardingTour.css';

interface Slide {
  id: string;
  title: string;
  description: string;
  tileColor: string;
  Icon: LucideIcon;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    title: "watt-payi'ye hoş geldin",
    description:
      'Elektrik faturanı cihazlarına göre otomatik olarak bölüştürüp, evindeki gerçek tüketim dağılımını gösterir.',
    tileColor: 'var(--accent)',
    Icon: User,
  },
  {
    id: 'bill',
    title: 'Faturanı fotoğrafla',
    description:
      'Elektrik faturanın fotoğrafını çek, tutarı ve dönemi biz senin için okuyalım — elle girmene gerek kalmasın.',
    tileColor: 'var(--chart-4)',
    Icon: Camera,
  },
  {
    id: 'devices',
    title: 'Cihazlarını seç',
    description:
      'Evindeki buzdolabı, klima, çamaşır makinesi gibi cihazları işaretle, biz saatlik kullanımına göre payını hesaplayalım.',
    tileColor: 'var(--chart-5)',
    Icon: Zap,
  },
  {
    id: 'result',
    title: 'Harcamanı gör',
    description: 'Hangi cihaz ne kadar tüketiyor, grafikte gör — ve tasarruf için kişisel önerini al.',
    tileColor: 'var(--good)',
    Icon: PieChart,
  },
];

export function OnboardingTour() {
  const { dismiss } = useOnboarding();
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstFocusable = dialog.querySelector<HTMLElement>('button:not([disabled])');
    firstFocusable?.focus();
  }, []);

  function handleNext() {
    if (isLast) {
      dismiss();
      return;
    }
    setActiveIndex((i) => i + 1);
  }

  function handleBack() {
    if (isFirst) return;
    setActiveIndex((i) => i - 1);
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;

    if (event.shiftKey) {
      if (current === first || !dialog.contains(current)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (current === last || !dialog.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="onboarding-backdrop">
      <div
        ref={dialogRef}
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Uygulama tanıtımı"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        {/* Badge stays a fixed white circle in both themes (see .onboarding-badge),
            so the icon uses a fixed dark hex rather than --ink — --ink flips to a
            light color in dark mode and would vanish against this white badge. */}
        <div
          className="onboarding-tile"
          key={slide.id}
          style={{ '--tile-color': slide.tileColor } as CSSProperties}
        >
          <div className="onboarding-badge">
            <slide.Icon size={30} strokeWidth={1.8} color="#191A23" />
          </div>
        </div>

        <div className="onboarding-dots">
          {SLIDES.map((s, i) => (
            <span key={s.id} className={'onboarding-dot' + (i === activeIndex ? ' active' : '')} />
          ))}
        </div>

        <div className="onboarding-text" key={slide.id + '-text'}>
          <h2>{slide.title}</h2>
          <p>{slide.description}</p>
        </div>

        <div className="onboarding-footer">
          <button
            type="button"
            className="onboarding-btn-ghost"
            onClick={handleBack}
            disabled={isFirst}
            style={{ visibility: isFirst ? 'hidden' : 'visible' }}
          >
            Geri
          </button>
          <div className="onboarding-footer-right">
            <button type="button" className="onboarding-btn-ghost" onClick={dismiss}>
              Geç
            </button>
            <button type="button" className="onboarding-btn-primary" onClick={handleNext}>
              {isLast ? 'Başla' : 'İleri'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

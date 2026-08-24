import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { User, Camera, Zap, PieChart, Sparkle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import './OnboardingTour.css';

interface Slide {
  id: string;
  title: string;
  description: string;
  tileColor: string;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    title: "watt-payi'ye hoş geldin",
    description:
      'Elektrik faturanı cihazlarına göre otomatik olarak bölüştürüp, evindeki gerçek tüketim dağılımını gösterir.',
    tileColor: 'var(--accent)',
  },
  {
    id: 'bill',
    title: 'Faturanı fotoğrafla',
    description:
      'Elektrik faturanın fotoğrafını çek, tutarı ve dönemi biz senin için okuyalım — elle girmene gerek kalmasın.',
    tileColor: 'var(--chart-4)',
  },
  {
    id: 'devices',
    title: 'Cihazlarını seç',
    description:
      'Evindeki buzdolabı, klima, çamaşır makinesi gibi cihazları işaretle, biz saatlik kullanımına göre payını hesaplayalım.',
    tileColor: 'var(--chart-5)',
  },
  {
    id: 'result',
    title: 'Harcamanı gör',
    description: 'Hangi cihaz ne kadar tüketiyor, grafikte gör — ve tasarruf için kişisel önerini al.',
    tileColor: 'var(--good)',
  },
];

// Small looping CSS-only scenes (no framer-motion, see project convention) that give
// each badge a "living" feel instead of a static icon. --tile-color is inherited from
// the ancestor .onboarding-tile, so these read the right accent per slide for free.
function WelcomeScene() {
  return (
    <div className="onboarding-scene">
      <span className="onboarding-sparkle onboarding-sparkle-1">
        <Sparkle size={14} strokeWidth={2} color="var(--tile-color)" fill="var(--tile-color)" />
      </span>
      <span className="onboarding-sparkle onboarding-sparkle-2">
        <Sparkle size={10} strokeWidth={2} color="var(--tile-color)" fill="var(--tile-color)" />
      </span>
      <span className="onboarding-sparkle onboarding-sparkle-3">
        <Sparkle size={11} strokeWidth={2} color="var(--tile-color)" fill="var(--tile-color)" />
      </span>
      <User size={30} strokeWidth={1.8} color="#191A23" className="onboarding-welcome-icon" />
    </div>
  );
}

function BillScene() {
  return (
    <div className="onboarding-scene onboarding-scene-bill">
      <Camera size={30} strokeWidth={1.8} color="#191A23" />
      <span className="onboarding-scan-group">
        <span className="onboarding-scan-fill" />
        <span className="onboarding-scan-line" />
      </span>
    </div>
  );
}

function DevicesScene() {
  return (
    <div className="onboarding-scene">
      <span className="onboarding-spark-orbit">
        <span className="onboarding-spark-dot" />
      </span>
      <Zap size={30} strokeWidth={1.8} color="#191A23" className="onboarding-zap-pulse" />
    </div>
  );
}

function ResultScene() {
  return (
    <div className="onboarding-scene">
      <svg className="onboarding-donut" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="onboarding-donut-track" cx="32" cy="32" r="26" />
        <circle className="onboarding-donut-progress" cx="32" cy="32" r="26" />
      </svg>
      <PieChart size={22} strokeWidth={1.8} color="#191A23" />
    </div>
  );
}

const SCENES: Record<string, () => JSX.Element> = {
  welcome: WelcomeScene,
  bill: BillScene,
  devices: DevicesScene,
  result: ResultScene,
};

export function OnboardingTour() {
  const { dismiss } = useOnboarding();
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];
  const Scene = SCENES[slide.id];

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
    if (activeIndex === 1) {
      // About to land on slide 0, where "Geri" becomes disabled/hidden. If focus is
      // still on "Geri" when that happens, the browser evicts focus to <body>, which
      // sits outside the dialog and breaks the Tab-trap. Move focus to "Geç" now,
      // before the re-render, so there's nothing to evict.
      skipButtonRef.current?.focus();
    }
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
            <Scene />
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
            <button ref={skipButtonRef} type="button" className="onboarding-btn-ghost" onClick={dismiss}>
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

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getOnboardingSeen, setOnboardingSeen } from '../lib/onboardingStorage';

interface OnboardingContextValue {
  loading: boolean;
  seen: boolean;
  open: boolean;
  show: () => void;
  dismiss: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  loading: true,
  seen: false,
  open: false,
  show: () => {},
  dismiss: () => {},
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getOnboardingSeen().then((value) => {
      setSeen(value);
      setLoading(false);
    });
  }, []);

  function dismiss() {
    setOpen(false);
    setSeen(true);
    setOnboardingSeen();
  }

  return (
    <OnboardingContext.Provider value={{ loading, seen, open, show: () => setOpen(true), dismiss }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}

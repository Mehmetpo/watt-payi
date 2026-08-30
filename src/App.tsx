import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { LoginScreen } from './screens/auth/LoginScreen';
import { ResetPasswordScreen } from './screens/auth/ResetPasswordScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { AddFlow } from './screens/add/AddFlow';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { HistoryDetailScreen } from './screens/history/HistoryDetailScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { BottomNav } from './components/BottomNav';
import { OnboardingTour } from './components/onboarding/OnboardingTour';

function AuthedShell() {
  const { session, loading, recovery } = useAuth();
  const onboarding = useOnboarding();
  const autoShown = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (
      session &&
      !recovery &&
      !onboarding.loading &&
      !onboarding.seen &&
      !autoShown.current
    ) {
      autoShown.current = true;
      onboarding.show();
    }
  }, [session, recovery, onboarding.loading, onboarding.seen, onboarding.show]);

  if (loading) return null;
  if (recovery) return <ResetPasswordScreen />;
  if (!session) return <LoginScreen />;

  return (
    <>
      <div className="route-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/add" element={<AddFlow />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/:billId" element={<HistoryDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      {onboarding.open && <OnboardingTour />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <AuthedShell />
      </OnboardingProvider>
    </AuthProvider>
  );
}

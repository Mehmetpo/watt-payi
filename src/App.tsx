import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/auth/LoginScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { AddFlow } from './screens/add/AddFlow';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { HistoryDetailScreen } from './screens/history/HistoryDetailScreen';
import { ProfileScreen } from './screens/profile/ProfileScreen';
import { BottomNav } from './components/BottomNav';

function AuthedShell() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <LoginScreen />;

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/add" element={<AddFlow />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/history/:billId" element={<HistoryDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthedShell />
    </AuthProvider>
  );
}

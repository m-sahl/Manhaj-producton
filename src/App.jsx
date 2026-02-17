import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Members from './pages/Members';
import AddMember from './pages/AddMember';
import MemberDetails from './pages/MemberDetails';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { useState, useEffect, useCallback } from 'react';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('auth_token');
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const InactivityTracker = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    navigate('/login');
    // Optional: Alert the user
    // alert('You have been logged out due to inactivity.');
  }, [navigate]);

  useEffect(() => {
    const checkInactivity = () => {
      const isAutoLogoutEnabled = localStorage.getItem('auto_logout') === 'true';
      const durationMins = parseInt(localStorage.getItem('logout_duration')) || 15;

      if (!isAutoLogoutEnabled || !localStorage.getItem('auth_token')) return;

      const timeoutMs = durationMins * 60 * 1000;
      let timeoutId;

      const resetTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(handleLogout, timeoutMs);
      };

      // Events to track
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(name => document.addEventListener(name, resetTimer));

      // Initial start
      resetTimer();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        events.forEach(name => document.removeEventListener(name, resetTimer));
      };
    };

    // Initial setup
    let cleanup = checkInactivity();

    // Listen for setting changes from Settings.jsx
    const handleSettingsChange = () => {
      if (cleanup) cleanup();
      cleanup = checkInactivity();
    };

    window.addEventListener('securitySettingsChanged', handleSettingsChange);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('securitySettingsChanged', handleSettingsChange);
    };
  }, [handleLogout]);

  return children;
};

import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
      <Router>
        <InactivityTracker>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="members/add" element={<AddMember />} />
              <Route path="members/:id" element={<MemberDetails />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </InactivityTracker>
      </Router>
    </ToastProvider>
  );
}

export default App;

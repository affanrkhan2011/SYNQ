/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './components/AuthProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/Group';
import AuthCallback from './pages/AuthCallback';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-black"><div className="w-5 h-5 border border-white border-t-transparent animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

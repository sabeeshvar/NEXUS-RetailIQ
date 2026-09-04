import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Boxes, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c101a] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 flex items-center justify-center text-white shadow-[6px_6px_14px_#060910,-6px_-6px_14px_#18243a] mb-6 animate-pulse">
          <Boxes className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-2xl tracking-tight text-white">NEXUS</span>
          <span className="font-bold text-2xl tracking-tight text-brand-400">RetailIQ</span>
        </div>
        <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
          <span>Checking your session...</span>
        </p>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect unauthenticated users to /login preserving the intended target path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

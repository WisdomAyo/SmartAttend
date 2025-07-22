// frontend/src/components/ProtectedRoute.tsx

import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  // REMOVE isAuthenticated prop here
  // isAuthenticated: boolean; 
}

// ProtectedRoute component checks for the presence of the access token
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Check localStorage directly for the access token
  const isAuthenticated = !!localStorage.getItem('access_token');

  if (!isAuthenticated) {
    // Redirect to the login page if the token is not found
    // 'replace' prop ensures the user can't go back to the protected page via the back button
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the children (the component for the protected route)
  return <>{children}</>;
};

export default ProtectedRoute;
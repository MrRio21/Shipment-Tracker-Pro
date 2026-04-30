import { useState, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return window.localStorage.getItem("shipment-auth") === "true";
  });

  const login = () => {
    window.localStorage.setItem("shipment-auth", "true");
    setIsAuthenticated(true);
  };

  const logout = () => {
    window.localStorage.removeItem("shipment-auth");
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
}

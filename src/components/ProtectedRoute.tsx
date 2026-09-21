import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  clearToken,
  getToken,
  obtenerUsuarioActual,
} from "../lib/api";

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const token = getToken();

      if (!token) {
        if (mounted) {
          setAuthenticated(false);
          setLoading(false);
        }
        return;
      }

      try {
        // Confirma con el backend que el token siga siendo válido
        // (no esté vencido ni el usuario haya sido borrado).
        await obtenerUsuarioActual();

        if (mounted) setAuthenticated(true);
      } catch {
        clearToken();

        if (mounted) setAuthenticated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        Cargando...
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

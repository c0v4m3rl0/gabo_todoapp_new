const TOKEN_KEY = "todo_app_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ?? "Ocurrió un error inesperado",
    );
  }

  return data as T;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
}

interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export function registrar(
  nombre: string,
  correo: string,
  contraseña: string,
): Promise<AuthResponse> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nombre, correo, contraseña }),
  });
}

export function iniciarSesion(
  correo: string,
  contraseña: string,
): Promise<AuthResponse> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo, contraseña }),
  });
}

export function obtenerUsuarioActual(): Promise<{
  usuario: Usuario;
}> {
  return request("/auth/me");
}

export interface TareaApi {
  id: string;
  usuarioId: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export function obtenerTareas(): Promise<TareaApi[]> {
  return request("/tareas");
}

export function crearTarea(
  id: string,
  nombre: string,
): Promise<TareaApi> {
  return request("/tareas", {
    method: "POST",
    body: JSON.stringify({ id, nombre }),
  });
}

export function actualizarTarea(
  id: string,
  nombre: string,
): Promise<TareaApi> {
  return request(`/tareas/${id}`, {
    method: "PUT",
    body: JSON.stringify({ nombre }),
  });
}

export function eliminarTarea(id: string): Promise<void> {
  return request(`/tareas/${id}`, { method: "DELETE" });
}

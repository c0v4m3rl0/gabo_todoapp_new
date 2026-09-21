import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  actualizarTarea,
  clearToken,
  crearTarea,
  eliminarTarea,
  obtenerTareas,
  obtenerUsuarioActual,
} from "../lib/api";

import TodoForm from "../components/TodoForm";
import TodoList from "../components/TodoList";

import {
  deleteLocalTodo,
  getLocalTodoById,
  getLocalTodos,
  saveLocalTodo,
  type LocalTodo,
} from "../lib/offlineDb";

import { sincronizarPendientes } from "../lib/offlineSync";

import type { Todo } from "../components/TodoItem";

export default function TodoApp() {
  const navigate = useNavigate();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [userId, setUserId] = useState("");
  const [online, setOnline] = useState(
    navigator.onLine,
  );

  // Guardamos el userId también en un ref porque el listener de
  // "online" se registra una sola vez (deps: []) y de otra forma
  // vería siempre el valor inicial ("").
  const userIdRef = useRef(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);

      const id = userIdRef.current;

      if (!id) return;

      // Al recuperar internet: primero subimos lo pendiente,
      // luego recargamos la lista real desde el servidor.
      sincronizarPendientes(id).then(() => loadTodos(id));
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, []);

  async function loadUser() {
    try {
      const { usuario } = await obtenerUsuarioActual();

      setUserId(usuario.id);

      if (navigator.onLine) {
        await sincronizarPendientes(usuario.id);
      }

      await loadTodos(usuario.id);
    } catch {
      navigate("/");
    }
  }

  async function loadTodos(id: string) {
    const localTodos =
      await getLocalTodos(id);

    if (!navigator.onLine) {
      setTodos(
        localTodos as Todo[],
      );

      return;
    }

    try {
      const data = await obtenerTareas();

      const formatted: Todo[] = data.map(
        (todo) => ({
          id: todo.id,
          usuarioId: todo.usuarioId,
          nombre: todo.nombre,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
        }),
      );

      setTodos(formatted);

      for (const todo of formatted) {
        await saveLocalTodo({
          ...todo,
          pendingSync: false,
          existsRemote: true,
        });
      }
    } catch (error) {
      console.error(error);

      setTodos(
        localTodos as Todo[],
      );
    }
  }

  async function addTodo(nombre: string) {
    if (!userId) return;

    const id = crypto.randomUUID();

    const now =
      new Date().toISOString();

    const localTodo: LocalTodo = {
      id,
      usuarioId: userId,
      nombre,
      createdAt: now,
      updatedAt: now,
      pendingSync: true,
      existsRemote: false,
    };

    await saveLocalTodo(localTodo);

    setTodos((current) => [
      {
        id,
        usuarioId: userId,
        nombre,
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);

    if (!navigator.onLine) {
      // Se queda guardada localmente con pendingSync: true.
      // sincronizarPendientes() la subirá cuando vuelva el internet.
      return;
    }

    try {
      await crearTarea(id, nombre);

      await saveLocalTodo({
        ...localTodo,
        pendingSync: false,
        existsRemote: true,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function updateTodo(
    id: string,
    nombre: string,
  ) {
    const now =
      new Date().toISOString();

    setTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              nombre,
              updatedAt: now,
            }
          : todo,
      ),
    );

    const existing =
      (await getLocalTodoById(id)) ??
      todos.find((todo) => todo.id === id);

    if (!existing) return;

    await saveLocalTodo({
      ...existing,
      nombre,
      updatedAt: now,
      pendingSync: true,
    });

    if (!navigator.onLine) {
      return;
    }

    try {
      await actualizarTarea(id, nombre);

      await saveLocalTodo({
        ...existing,
        nombre,
        updatedAt: now,
        pendingSync: false,
        existsRemote: true,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteTodo(id: string) {
    setTodos((current) =>
      current.filter(
        (todo) => todo.id !== id,
      ),
    );

    if (!navigator.onLine) {
      // No sabemos con certeza si el servidor ya conocía esta
      // tarea, así que revisamos lo que dice IndexedDB antes de
      // dejarla marcada como pendiente de borrar.
      const existing = await getLocalTodoById(id);

      await saveLocalTodo({
        id,
        usuarioId: userId,
        nombre: existing?.nombre ?? "",
        createdAt: existing?.createdAt ?? "",
        updatedAt: new Date().toISOString(),
        pendingSync: true,
        deleted: true,
        existsRemote: existing?.existsRemote ?? true,
      });

      return;
    }

    try {
      await eliminarTarea(id);
      await deleteLocalTodo(id);
    } catch (error) {
      console.error(error);
    }
  }

  function logout() {
    clearToken();
    navigate("/");
  }

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="app-header">
          <div>
            <h1>Mis tareas</h1>

            <span
              className={
                online
                  ? "connection online"
                  : "connection offline"
              }
            >
              {online
                ? "● Conectado"
                : "● Sin conexión"}
            </span>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </header>

        <TodoForm onAdd={addTodo} />

        <TodoList
          todos={todos}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
        />
      </div>
    </main>
  );
}

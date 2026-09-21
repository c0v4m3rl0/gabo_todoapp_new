import { openDB, type DBSchema } from "idb";

export interface LocalTodo {
  id: string;
  usuarioId: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
  pendingSync?: boolean;
  deleted?: boolean;
  // true si esta tarea ya existe en el servidor (Postgres).
  // Sirve para saber, al reconectar, si hay que crearla (POST)
  // o actualizarla (PUT) en el servidor.
  existsRemote?: boolean;
}

interface TodoDB extends DBSchema {
  tareas: {
    key: string;
    value: LocalTodo;
    indexes: {
      "by-user": string;
    };
  };
}

const dbPromise = openDB<TodoDB>("todo-pwa-db", 1, {
  upgrade(db) {
    const store = db.createObjectStore("tareas", {
      keyPath: "id",
    });

    store.createIndex("by-user", "usuarioId");
  },
});

export async function getLocalTodos(
  usuarioId: string,
): Promise<LocalTodo[]> {
  const db = await dbPromise;

  const todos = await db.getAllFromIndex(
    "tareas",
    "by-user",
    usuarioId,
  );

  return todos.filter((todo) => !todo.deleted);
}

export async function getLocalTodoById(
  id: string,
): Promise<LocalTodo | undefined> {
  const db = await dbPromise;

  return db.get("tareas", id);
}

export async function saveLocalTodo(
  todo: LocalTodo,
): Promise<void> {
  const db = await dbPromise;

  await db.put("tareas", todo);
}

export async function deleteLocalTodo(
  id: string,
): Promise<void> {
  const db = await dbPromise;

  await db.delete("tareas", id);
}

export async function getPendingTodos(
  usuarioId: string,
): Promise<LocalTodo[]> {
  const db = await dbPromise;

  const todos = await db.getAllFromIndex(
    "tareas",
    "by-user",
    usuarioId,
  );

  return todos.filter(
    (todo) => todo.pendingSync === true,
  );
}

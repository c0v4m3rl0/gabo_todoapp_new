import {
  actualizarTarea,
  crearTarea,
  eliminarTarea,
} from "./api";

import {
  deleteLocalTodo,
  getPendingTodos,
  saveLocalTodo,
} from "./offlineDb";

/**
 * Recorre las tareas que quedaron marcadas como "pendingSync"
 * (creadas, editadas o borradas mientras no había internet) y
 * las manda al servidor. Se llama:
 *   1) cuando la app detecta que volvió la conexión, y
 *   2) al entrar a la app, por si quedó algo pendiente de la
 *      última vez que se usó sin internet.
 */
export async function sincronizarPendientes(
  usuarioId: string,
): Promise<void> {
  const pendientes = await getPendingTodos(usuarioId);

  for (const tarea of pendientes) {
    try {
      if (tarea.deleted) {
        // Solo hay que avisarle al servidor si la tarea ya
        // existía ahí. Si nació y se borró estando offline,
        // el servidor nunca supo de ella.
        if (tarea.existsRemote) {
          await eliminarTarea(tarea.id);
        }

        await deleteLocalTodo(tarea.id);
        continue;
      }

      if (tarea.existsRemote) {
        await actualizarTarea(tarea.id, tarea.nombre);
      } else {
        await crearTarea(tarea.id, tarea.nombre);
      }

      await saveLocalTodo({
        ...tarea,
        pendingSync: false,
        existsRemote: true,
      });
    } catch (error) {
      // Si todavía no hay internet de verdad, o el servidor
      // falla, la dejamos pendiente: se reintentará la
      // próxima vez que se llame a esta función.
      console.error(
        "No se pudo sincronizar la tarea",
        tarea.id,
        error,
      );
    }
  }
}

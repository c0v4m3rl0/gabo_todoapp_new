import "dotenv/config";
import express from "express";
import cors from "cors";
import { and, eq } from "drizzle-orm";

import { db, schema } from "./db";
import {
  comparePassword,
  generateToken,
  hashPassword,
} from "./auth";
import {
  requireAuth,
  type AuthRequest,
} from "./middleware/authMiddleware";

const app = express();
const PORT = process.env.PORT
  ? Number(process.env.PORT)
  : 3001;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// AUTENTICACIÓN (propia, sin Supabase)
// ---------------------------------------------------------

app.post("/api/auth/register", async (req, res) => {
  const { nombre, correo, contraseña } = req.body ?? {};

  if (!nombre || !correo || !contraseña) {
    return res
      .status(400)
      .json({ error: "Faltan datos (nombre, correo o contraseña)" });
  }

  if (String(contraseña).length < 6) {
    return res.status(400).json({
      error: "La contraseña debe tener al menos 6 caracteres",
    });
  }

  const existentes = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.correo, correo));

  if (existentes.length > 0) {
    return res
      .status(409)
      .json({ error: "Ese correo ya está registrado" });
  }

  const passwordHash = await hashPassword(contraseña);

  const [usuario] = await db
    .insert(schema.usuarios)
    .values({ nombre, correo, passwordHash })
    .returning();

  const token = generateToken(usuario.id);

  return res.status(201).json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
    },
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { correo, contraseña } = req.body ?? {};

  if (!correo || !contraseña) {
    return res
      .status(400)
      .json({ error: "Faltan datos (correo o contraseña)" });
  }

  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.correo, correo));

  if (!usuario) {
    return res
      .status(401)
      .json({ error: "Correo o contraseña incorrectos" });
  }

  const valido = await comparePassword(
    contraseña,
    usuario.passwordHash,
  );

  if (!valido) {
    return res
      .status(401)
      .json({ error: "Correo o contraseña incorrectos" });
  }

  const token = generateToken(usuario.id);

  return res.json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
    },
  });
});

app.get(
  "/api/auth/me",
  requireAuth,
  async (req: AuthRequest, res) => {
    const [usuario] = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, req.usuarioId!));

    if (!usuario) {
      return res
        .status(404)
        .json({ error: "Usuario no encontrado" });
    }

    return res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    });
  },
);

// ---------------------------------------------------------
// TAREAS (protegidas: requieren un token válido)
// ---------------------------------------------------------

app.get(
  "/api/tareas",
  requireAuth,
  async (req: AuthRequest, res) => {
    const tareas = await db
      .select()
      .from(schema.tareas)
      .where(eq(schema.tareas.usuarioId, req.usuarioId!))
      .orderBy(schema.tareas.createdAt);

    return res.json(tareas);
  },
);

app.post(
  "/api/tareas",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { id, nombre } = req.body ?? {};

    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ error: "El nombre de la tarea es obligatorio" });
    }

    const valores: typeof schema.tareas.$inferInsert = {
      usuarioId: req.usuarioId!,
      nombre: String(nombre).trim(),
    };

    // El id se genera en el cliente para que funcione el modo
    // sin conexión (offlineDb). Si no llega, Postgres genera uno.
    if (id) valores.id = id;

    const [tarea] = await db
      .insert(schema.tareas)
      .values(valores)
      .returning();

    return res.status(201).json(tarea);
  },
);

app.put(
  "/api/tareas/:id",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { nombre } = req.body ?? {};
    const { id } = req.params;

    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ error: "El nombre de la tarea es obligatorio" });
    }

    const [tarea] = await db
      .update(schema.tareas)
      .set({
        nombre: String(nombre).trim(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.tareas.id, id),
          eq(schema.tareas.usuarioId, req.usuarioId!),
        ),
      )
      .returning();

    if (!tarea) {
      return res
        .status(404)
        .json({ error: "Tarea no encontrada" });
    }

    return res.json(tarea);
  },
);

app.delete(
  "/api/tareas/:id",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { id } = req.params;

    const [tarea] = await db
      .delete(schema.tareas)
      .where(
        and(
          eq(schema.tareas.id, id),
          eq(schema.tareas.usuarioId, req.usuarioId!),
        ),
      )
      .returning();

    if (!tarea) {
      return res
        .status(404)
        .json({ error: "Tarea no encontrada" });
    }

    return res.status(204).send();
  },
);

app.listen(PORT, () => {
  console.log(
    `✅ Servidor de la API escuchando en http://localhost:${PORT}`,
  );
});

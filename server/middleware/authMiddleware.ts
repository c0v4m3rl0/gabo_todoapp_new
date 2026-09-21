import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { verifyToken } from "../auth";

export interface AuthRequest extends Request {
  usuarioId?: string;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No autorizado, falta el token",
    });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);
    req.usuarioId = payload.sub;
    next();
  } catch {
    return res.status(401).json({
      error: "Token inválido o expirado",
    });
  }
}

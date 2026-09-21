import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "Falta la variable JWT_SECRET en el archivo .env",
  );
}

const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION = "7d";

export async function hashPassword(
  password: string,
): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, JWT_SECRET as string, {
    expiresIn: TOKEN_EXPIRATION,
  });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_SECRET as string) as {
    sub: string;
  };
}

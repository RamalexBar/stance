import { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase";
import { UnauthorizedError } from "../shared/errors";

export interface FirebaseUserPayload {
  uid: string;
  email: string;
  emailVerified: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      firebaseUser?: FirebaseUserPayload;
    }
  }
}

/**
 * Espera un header: Authorization: Bearer <firebaseIdToken>
 * El idToken lo genera el cliente (web/mobile) usando el SDK de Firebase Auth
 * después de iniciar sesión (email/password, Google, Apple o Facebook).
 */
export async function requireFirebaseAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Falta el token de autenticación");
    }

    const idToken = header.substring("Bearer ".length).trim();
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    if (!decoded.email) {
      throw new UnauthorizedError("El token no contiene un email válido");
    }

    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: Boolean(decoded.email_verified),
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError("Token inválido o expirado"));
  }
}

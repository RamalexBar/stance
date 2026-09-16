import { Environment, EventEntity, Paddle } from "@paddle/paddle-node-sdk";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors";

let paddleClient: Paddle | null = null;

function getPaddle(): Paddle {
  if (!env.paddle.apiKey) {
    throw new AppError("Paddle no está configurado en el servidor (falta PADDLE_API_KEY).", 503);
  }
  if (!paddleClient) {
    paddleClient = new Paddle(env.paddle.apiKey, {
      environment: env.paddle.environment === "production" ? Environment.production : Environment.sandbox,
    });
  }
  return paddleClient;
}

// El checkout (creación de la transacción) ocurre en el navegador vía
// Paddle.js — a diferencia de Stripe, Paddle Billing no ofrece una página de
// pago alojada a la que el backend pueda simplemente redirigir; requiere su
// overlay/inline checkout en el sitio. Por eso este cliente solo se usa para
// verificar el webhook, no para crear sesiones de pago.
export async function verifyWebhookEvent(rawBody: string, signature: string): Promise<EventEntity> {
  const paddle = getPaddle();
  if (!env.paddle.webhookSecret) {
    throw new AppError("Falta PADDLE_WEBHOOK_SECRET en el servidor.", 503);
  }
  return paddle.webhooks.unmarshal(rawBody, env.paddle.webhookSecret, signature);
}

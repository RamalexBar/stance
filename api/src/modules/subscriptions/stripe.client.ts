import Stripe from "stripe";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!env.stripe.secretKey) {
    throw new AppError("Stripe no está configurado en el servidor (falta STRIPE_SECRET_KEY).", 503);
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey, { apiVersion: "2024-06-20" });
  }
  return stripeClient;
}

export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  priceId: string;
  existingCustomerId?: string;
}) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.existingCustomerId,
    customer_email: params.existingCustomerId ? undefined : params.userEmail,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${env.frontendUrl}/subscription?status=success`,
    cancel_url: `${env.frontendUrl}/subscription?status=canceled`,
    client_reference_id: params.userId,
    metadata: { userId: params.userId },
  });

  return session;
}

export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  if (!env.stripe.webhookSecret) {
    throw new AppError("Falta STRIPE_WEBHOOK_SECRET en el servidor.", 503);
  }
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
}

export async function getCheckoutSessionPriceId(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
  return lineItems.data[0]?.price?.id ?? null;
}

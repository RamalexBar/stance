import { EventName } from "@paddle/paddle-node-sdk";
import { NextFunction, Request, Response } from "express";
import { subscriptionsService } from "./subscriptions.service";
import { subscriptionsRepository } from "./subscriptions.repository";
import { userService } from "../users/user.service";
import { verifyWebhookEvent } from "./paddle.client";
import { PLAN_CONFIG, PlanName } from "./planLimits";
import { ok } from "../../shared/apiResponse";
import { UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

function findPlanByPriceId(priceId: string | undefined): PlanName | null {
  if (!priceId) return null;
  const entry = (Object.entries(PLAN_CONFIG) as [PlanName, (typeof PLAN_CONFIG)[PlanName]][]).find(
    ([, config]) => config.paddlePriceId === priceId
  );
  return entry ? entry[0] : null;
}

// El enum SubscriptionStatus local solo tiene ACTIVE/PAST_DUE/CANCELED/TRIALING;
// "paused" de Paddle se trata como PAST_DUE (pierde acceso, pero no se borra el
// registro como en un cancelado real).
function mapPaddleStatus(paddleStatus: string): "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" {
  switch (paddleStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "paused":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "CANCELED";
  }
}

// Todos los eventos subscription.* de Paddle (created/activated/updated/
// trialing/past_due/paused/resumed/canceled) traen la misma forma de datos,
// así que un solo handler basta — a diferencia de Stripe, Paddle no separa
// "cancelado" en un tipo de evento distinto, solo cambia el status.
async function upsertFromSubscriptionData(data: any) {
  const userId =
    data.customData?.userId ??
    (await subscriptionsRepository.findByPaddleCustomerId(data.customerId))?.userId;
  if (!userId) return;

  const priceId = data.items?.[0]?.price?.id as string | undefined;
  const plan = findPlanByPriceId(priceId);
  const existing = await subscriptionsRepository.findByUserId(userId);

  await subscriptionsRepository.upsert({
    userId,
    plan: plan ?? existing?.plan ?? "FREE",
    status: mapPaddleStatus(data.status),
    paddleCustomerId: data.customerId,
    paddleSubscriptionId: data.id,
    currentPeriodEnd: data.currentBillingPeriod?.endsAt ? new Date(data.currentBillingPeriod.endsAt) : undefined,
  });
}

export const subscriptionsController = {
  async listPlans(_req: Request, res: Response) {
    ok(
      res,
      Object.entries(PLAN_CONFIG).map(([name, config]) => ({ name, ...config }))
    );
  },

  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const result = await subscriptionsService.getStatus(userId);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["paddle-signature"] as string;
      const rawBody = (req.body as Buffer).toString();
      const event = await verifyWebhookEvent(rawBody, signature);

      switch (event.eventType) {
        case EventName.SubscriptionCreated:
        case EventName.SubscriptionActivated:
        case EventName.SubscriptionUpdated:
        case EventName.SubscriptionTrialing:
        case EventName.SubscriptionPastDue:
        case EventName.SubscriptionPaused:
        case EventName.SubscriptionResumed:
        case EventName.SubscriptionCanceled:
          await upsertFromSubscriptionData(event.data as any);
          break;
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
};

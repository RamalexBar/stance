import { NextFunction, Request, Response } from "express";
import { subscriptionsService } from "./subscriptions.service";
import { subscriptionsRepository } from "./subscriptions.repository";
import { userService } from "../users/user.service";
import { createCheckoutSession, constructWebhookEvent, getCheckoutSessionPriceId } from "./stripe.client";
import { PLAN_CONFIG, PlanName } from "./planLimits";
import { ok } from "../../shared/apiResponse";
import { AppError, UnauthorizedError } from "../../shared/errors";

async function resolveUserId(req: Request): Promise<string> {
  if (!req.firebaseUser) throw new UnauthorizedError();
  const profile = await userService.getOrCreateProfile(req.firebaseUser);
  return profile.id;
}

function findPlanByPriceId(priceId: string): PlanName | null {
  const entry = (Object.entries(PLAN_CONFIG) as [PlanName, (typeof PLAN_CONFIG)[PlanName]][]).find(
    ([, config]) => config.stripePriceId === priceId
  );
  return entry ? entry[0] : null;
}

// El enum SubscriptionStatus solo tiene ACTIVE/PAST_DUE/CANCELED/TRIALING; los
// demás estados de Stripe se mapean al más cercano en términos de acceso.
function mapStripeStatus(stripeStatus: string): "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "incomplete":
    case "paused":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "CANCELED";
  }
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

  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = await resolveUserId(req);
      const plan = req.body.plan as PlanName;
      const config = PLAN_CONFIG[plan];

      if (!config || !config.stripePriceId) {
        throw new AppError("Ese plan no está disponible para pago (falta configurar el Price ID de Stripe).", 400);
      }

      const existing = await subscriptionsRepository.findByUserId(userId);
      const session = await createCheckoutSession({
        userId,
        userEmail: req.firebaseUser!.email,
        priceId: config.stripePriceId,
        existingCustomerId: existing?.stripeCustomerId ?? undefined,
      });

      ok(res, { url: session.url });
    } catch (err) {
      next(err);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const event = constructWebhookEvent(req.body, signature);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          const userId = session.metadata?.userId ?? session.client_reference_id;
          const priceId = await getCheckoutSessionPriceId(session.id);
          if (userId) {
            await subscriptionsRepository.upsert({
              userId,
              plan: (priceId && findPlanByPriceId(priceId)) || "PREMIUM",
              status: "ACTIVE",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.created": {
          const sub = event.data.object as any;
          const existing = await subscriptionsRepository.findByStripeCustomerId(sub.customer);
          if (existing) {
            const priceId = sub.items?.data?.[0]?.price?.id;
            const plan = (priceId && findPlanByPriceId(priceId)) || existing.plan;
            await subscriptionsRepository.upsert({
              userId: existing.userId,
              plan,
              status: mapStripeStatus(sub.status),
              stripeCustomerId: sub.customer,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as any;
          const existing = await subscriptionsRepository.findByStripeCustomerId(sub.customer);
          if (existing) {
            await subscriptionsRepository.upsert({
              userId: existing.userId,
              plan: "FREE",
              status: "CANCELED",
              stripeCustomerId: sub.customer,
            });
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
};

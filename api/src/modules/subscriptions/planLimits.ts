// Fuente única de verdad para precios y límites de cada plan.
// Cambiar un número aquí lo actualiza en toda la app (backend + checkout).

export const PLAN_CONFIG = {
  FREE: {
    label: "Gratis",
    priceUsdMonthly: 0,
    stripePriceId: null as string | null,
    maxVideosPerMonth: 3,
    maxGroups: 0,
    maxAthletesPerGroup: 0,
    maxNewEnrollmentsPerMonth: 0,
    maxCoachPlansPerMonth: 1,
    allowReferenceComparison: false,
    allowReports: false,
  },
  PREMIUM: {
    label: "Premium",
    priceUsdMonthly: 9.99,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM ?? null,
    maxVideosPerMonth: Infinity,
    maxGroups: 0,
    maxAthletesPerGroup: 0,
    maxNewEnrollmentsPerMonth: 0,
    maxCoachPlansPerMonth: Infinity,
    allowReferenceComparison: true,
    allowReports: true,
  },
  COACH: {
    label: "Coach",
    priceUsdMonthly: 29,
    stripePriceId: process.env.STRIPE_PRICE_COACH ?? null,
    maxVideosPerMonth: Infinity,
    maxGroups: 1,
    maxAthletesPerGroup: 5,
    maxNewEnrollmentsPerMonth: 5,
    maxCoachPlansPerMonth: Infinity,
    allowReferenceComparison: true,
    allowReports: true,
  },
  ACADEMIA: {
    label: "Academia",
    priceUsdMonthly: 99,
    stripePriceId: process.env.STRIPE_PRICE_ACADEMIA ?? null,
    maxVideosPerMonth: Infinity,
    maxGroups: 5,
    maxAthletesPerGroup: 5,
    maxNewEnrollmentsPerMonth: 25,
    maxCoachPlansPerMonth: Infinity,
    allowReferenceComparison: true,
    allowReports: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_CONFIG;

export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

-- Switch subscriptions from Stripe to Paddle: rename the two provider-linkage
-- columns. RENAME COLUMN preserves the existing unique constraints/indexes.
ALTER TABLE "Subscription" RENAME COLUMN "stripeCustomerId" TO "paddleCustomerId";
ALTER TABLE "Subscription" RENAME COLUMN "stripeSubscriptionId" TO "paddleSubscriptionId";

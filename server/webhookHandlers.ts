import { stripe } from "./stripeClient";
import { storage } from "./storage";
import type { Request, Response } from "express";

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return res.status(500).json({ message: "Webhook secret not configured" });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    const raw = (req as any).rawBody;
    const payload = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as any);
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = Number(session.metadata?.userId);
        const plan = session.metadata?.plan as string;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (userId && plan) {
          await storage.updateUser(userId, {
            plan,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          } as any);
          console.log(`[stripe-webhook] User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const status = sub.status;
        const plan = sub.metadata?.plan as string;
        if (customerId && plan && status === "active") {
          const users = await storage.getUserByStripeCustomerId(customerId);
          if (users) {
            await storage.updateUser(users.id, { plan, stripeSubscriptionId: sub.id } as any);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        if (customerId) {
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUser(user.id, { plan: "free", stripeSubscriptionId: null } as any);
            console.log(`[stripe-webhook] User ${user.id} downgraded to free`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        if (customerId) {
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            console.warn(`[stripe-webhook] Payment failed for user ${user.id}`);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
  }

  res.json({ received: true });
}

import { verifyWebhook } from "@clerk/express/webhooks";
import { env } from "../config/env.js";
import { deactivateUserFromClerk, upsertUserFromClerk } from "../services/user.service.js";

export async function handleClerkWebhook(request, response, next) {
  if (!env.clerkWebhookSecret) {
    return response.status(503).json({ error: "Clerk webhook verification is not configured." });
  }

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret: env.clerkWebhookSecret });
  } catch {
    return response.status(400).json({ error: "Invalid Clerk webhook signature." });
  }

  try {
    if (event.type === "user.deleted") {
      if (event.data.id) {
        await deactivateUserFromClerk(event.data.id);
      }
      return response.status(200).json({ received: true });
    }

    if (event.type !== "user.created" && event.type !== "user.updated") {
      return response.status(200).json({ received: true });
    }

    const clerkUser = event.data;
    const primaryEmail = clerkUser.email_addresses?.find(
      (address) => address.id === clerkUser.primary_email_address_id,
    );
    if (!clerkUser.id || !primaryEmail?.email_address || primaryEmail.verification?.status !== "verified") {
      return response.status(200).json({ received: true, synchronized: false });
    }

    await upsertUserFromClerk({
      clerkUserId: clerkUser.id,
      fullName: [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") || "HTI User",
      email: primaryEmail.email_address,
      profileImageUrl: clerkUser.image_url,
      emailVerified: true,
    });
    return response.status(200).json({ received: true, synchronized: true });
  } catch (error) {
    return next(error);
  }
}

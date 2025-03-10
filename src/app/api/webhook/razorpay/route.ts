import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";
import crypto from "crypto";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming Webhook Request");

    // Read request body
    const body = await req.text(); // Use `text()` instead of `json()` for signature verification
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.log("❌ Missing Razorpay Signature.");
      return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("❌ Invalid Razorpay Signature.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Convert text body back to JSON
    const data = JSON.parse(body);
    console.log("🔹 Verified Webhook Data:", data);

    // Extract userId from the webhook payload
    const { userId } = data.payload.payment.entity.notes;

    if (!userId) {
      console.log("❌ No userId found in webhook payload.");
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log(`🔎 Searching for subscription of user: ${userId}`);

    // Check if user has a subscription
    const subscription = await client.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      console.log(`⚠️ No subscription found for user: ${userId}. Creating one...`);
      await client.subscription.create({
        data: {
          userId,
          plan: "PRO",
        },
      });
    } else {
      console.log(`✅ Subscription found. Updating to PRO for user: ${userId}`);
      await client.subscription.update({
        where: { userId },
        data: { plan: "PRO" },
      });
    }

    console.log(`✅ Subscription updated successfully for user: ${userId}`);
    return NextResponse.json({ message: "Subscription updated successfully" });
  } catch (error) {
    console.error("❌ Error updating subscription:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

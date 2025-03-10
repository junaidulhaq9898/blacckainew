import { NextResponse } from "next/server";
import { client } from "@/lib/prisma"; // Make sure this import matches your `prisma.ts`

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔹 Webhook Data Received:", body); // Debugging log

    const { razorpay_subscription_id, status, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch the existing subscription
    const subscription = await client.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      console.log("❌ Subscription not found for user:", userId);
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    console.log("✅ Before Update - Subscription:", subscription);

    // Determine new plan status
    const newPlan = status === "active" ? "PRO" : "FREE";

    // Update the subscription plan
    const updatedSubscription = await client.subscription.update({
      where: { userId },
      data: { plan: newPlan },
    });

    console.log("✅ After Update - Subscription:", updatedSubscription);

    return NextResponse.json({ message: "Subscription updated successfully", updatedSubscription });
  } catch (error) {
    console.error("❌ Error updating subscription:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming Webhook Request");

    const body = await req.json();
    console.log("🔹 Webhook Data Received:", body);

    const { userId } = body;

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

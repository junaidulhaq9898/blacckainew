import { NextResponse } from "next/server";
import { client } from "@/lib/prisma"; // Ensure correct import

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔹 Webhook Data Received:", body);

    const { userId } = body;

    if (!userId) {
      console.log("❌ No userId found in webhook payload.");
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user has a subscription
    const subscription = await client.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      console.log("⚠️ Subscription not found. Creating a new one...");
      await client.subscription.create({
        data: {
          userId,
          plan: "PRO", // Use string instead of Prisma enum
        },
      });
    } else {
      console.log("✅ Subscription Found. Updating plan to PRO...");
      await client.subscription.update({
        where: { userId },
        data: { plan: "PRO" }, // Use string instead of Prisma enum
      });
    }

    console.log("✅ Subscription updated successfully for user:", userId);
    return NextResponse.json({ message: "Subscription updated successfully" });
  } catch (error) {
    console.error("❌ Error updating subscription:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

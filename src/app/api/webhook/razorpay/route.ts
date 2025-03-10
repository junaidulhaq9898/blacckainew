import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Extract userId from webhook payload
    const userId = body.payload?.user_id; // Ensure this matches Razorpay's actual webhook data structure

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // ✅ Ensure userId is a string to prevent Prisma errors
    const userIdStr = String(userId);

    // ✅ Update the user's subscription plan from FREE → PRO
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: userIdStr },
      data: { plan: "PRO" }, // Ensure this matches your Prisma ENUM
    });

    return NextResponse.json({ success: true, updatedSubscription });
  } catch (error) {
    console.error("❌ Error updating subscription:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

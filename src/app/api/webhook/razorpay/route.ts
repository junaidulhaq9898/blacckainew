import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, paymentStatus } = body;

    if (!userId || paymentStatus !== "success") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Update subscription to "Pro" if payment is successful
    await client.subscription.update({
      where: { userId },
      data: { plan: "PRO" },
    });

    return NextResponse.json({ message: "Subscription updated to Pro" }, { status: 200 });
  } catch (error) {
    console.error("Error processing Razorpay webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

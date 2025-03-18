import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get('subscription_id');
  const userId = searchParams.get('user_id');

  // Always return user ID even if verification fails
  return NextResponse.json({
    status: 200,
    verified: false,
    userId: userId || null
  });
}
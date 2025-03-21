import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate the user via Clerk.
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve user from your database.
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // 4. Create a Razorpay subscription using the plan id.
    // This ensures the amount configured in your Razorpay plan is used.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles
      customer_notify: 1,
      notes: {
        userId: dbUser.id,       // NOTE: exact key as needed
        userEmail: dbUser.email,
      },
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert subscription in your database.
    // Here we immediately set the plan to "PRO" so that after payment,
    // the subscription in your database reflects the upgrade.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, plan: 'PRO', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'PRO',
      },
    });

    // 6. Fetch the plan details from Razorpay to retrieve the original amount and currency.
    const planDetails = await razorpay.plans.fetch(planId);
    // Assuming the fetched plan has structure: { item: { amount, currency, ... } }
    const amount = planDetails.item.amount;     // amount in paise
    const currency = planDetails.item.currency;   // e.g. 'INR'

    // 7. Create a payment link using the plan’s original amount/currency.
    // This payment link includes a callback URL that redirects the user to the dashboard after payment.
    const paymentLink = await razorpay.paymentLink.create({
      amount, // use the amount from the plan – do not hardcode
      currency,
      description: 'Upgrade to PRO Plan',
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'User',
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
      notes: {
        userId: dbUser.id,
        subscriptionId: subscription.id,
      },
    });
    console.log('Payment link created:', paymentLink.short_url);

    // 8. Return the payment link URL so the client redirects the user to the payment page.
    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}

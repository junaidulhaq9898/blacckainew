// app/api/webhook/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

// Helper for UUID validation
const isValidUUID = (id: string) => 
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

interface RazorpayNotes {
  userId: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (generatedSignature !== signature) {
      return NextResponse.json({ status: 401, message: 'Invalid signature' });
    }

    const payload = JSON.parse(body);
    
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
      }

      try {
        // Fetch subscription details
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        const notes = subscription.notes as RazorpayNotes;
        
        // Convert and validate user ID
        const userId = String(notes.userId).trim();
        
        if (!isValidUUID(userId)) {
          console.error('Invalid UUID format:', userId);
          return NextResponse.json({ status: 400, message: 'Invalid user ID format' });
        }

        // Update database
        await client.subscription.upsert({
          where: { userId },
          update: {
            plan: 'PRO',
            customerId: String(subscription.id),
            updatedAt: new Date(),
          },
          create: {
            userId,
            plan: 'PRO',
            customerId: String(subscription.id),
          },
        });

        return NextResponse.json({ status: 200, message: 'Subscription updated' });

      } catch (error) {
        console.error('Database update failed:', error);
        return NextResponse.json({ status: 500, message: 'Failed to update subscription' });
      }
    }

    return NextResponse.json({ status: 200, message: 'Unhandled event' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ status: 500, message: 'Internal server error' });
  }
}
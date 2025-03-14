declare module 'razorpay' {
    interface PaymentLinkCreateRequestBody {
      subscription_id?: string;
    }
  
    interface PaymentLink {
      short_url: string;
    }
  
    interface Subscriptions {
      notes?: {
        userId: string;
        [key: string]: unknown;
      };
    }
  }
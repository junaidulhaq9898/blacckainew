declare module 'razorpay' {
    interface RazorpayOptions {
      key_id: string;
      key_secret: string;
    }
  
    interface RazorpaySubscriptionNotes {
      user_id?: string;
    }
  
    interface RazorpaySubscription {
      id: string;
      notes: RazorpaySubscriptionNotes;
    }
  
    interface RazorpayInstance {
      subscriptions: {
        create: (options: any) => Promise<{ id: string }>;
        fetch: (subscriptionId: string) => Promise<RazorpaySubscription>;
      };
      paymentLink: {
        create: (options: any) => Promise<{ short_url: string }>;
      };
    }
  
    const Razorpay: {
      new (options: RazorpayOptions): RazorpayInstance;
    };
    
    export = Razorpay;
  }
declare module 'razorpay' {
    interface RazorpayOptions {
      key_id: string;
      key_secret: string;
    }
  
    interface RazorpayInstance {
      subscriptions: {
        create: (options: any) => Promise<any>;
        fetch: (subscriptionId: string) => Promise<any>;
      };
      paymentLink: {
        create: (options: any) => Promise<any>;
      };
    }
  
    const Razorpay: {
      new (options: RazorpayOptions): RazorpayInstance;
    };
    
    export = Razorpay;
  }
declare module 'razorpay' {
    // Options for initializing Razorpay
    interface RazorpayOptions {
      key_id: string;
      key_secret: string;
    }
  
    // Main Razorpay instance interface
    interface RazorpayInstance {
      subscriptions: {
        // Create a subscription
        create: (options: any) => Promise<any>;
        // Fetch a subscription by ID
        fetch: (subscriptionId: string) => Promise<any>;
        // Add support for subscription links
        links: {
          create: (options: any) => Promise<any>;
        };
      };
      paymentLink: {
        // Create a payment link
        create: (options: any) => Promise<any>;
      };
      // Add other resources here if needed (e.g., orders, customers)
    }
  
    // Razorpay constructor
    const Razorpay: {
      new (options: RazorpayOptions): RazorpayInstance;
    };
  
    export = Razorpay;
  }
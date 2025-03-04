import { onSubscribe } from '@/actions/user';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: {
    order_id?: string;
    payment_id?: string;
    signature?: string;
    cancel?: boolean;
  };
};

const PaymentPage = async ({ searchParams: { order_id, payment_id, signature, cancel } }: Props) => {
  if (order_id && payment_id && signature) {
    const customer = await onSubscribe(order_id, payment_id, signature);

    if (customer.status === 200) {
      return redirect('/dashboard');
    }

    return (
      <div className="flex flex-col justify-center items-center h-screen w-full">
        <h4 className="text-5xl font-bold">Error</h4>
        <p className="text-xl font-bold">Oops! Something went wrong.</p>
      </div>
    );
  }

  if (cancel) {
    return (
      <div className="flex flex-col justify-center items-center h-screen w-full">
        <h4 className="text-5xl font-bold">Payment Cancelled</h4>
        <p className="text-xl font-bold">You have cancelled the payment process.</p>
      </div>
    );
  }

  return null;
};

export default PaymentPage;

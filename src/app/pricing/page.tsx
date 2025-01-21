import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Ensure this path matches your project structure
import Image from 'next/image'; // Add this import at the top

const PricingPage: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-b from-slate-900 via-blue-900 to-bg">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative">
        {/* Header Section */}
        <div className="container px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo1.png"
                alt="Company Logo"
                width={140}  // Adjust these dimensions based on your logo size
                height={60}
                className="object-contain"
              />
            </div>

            <nav className="hidden space-x-6 text-sm text-blue-200 md:block">
              <Link href="/">Home</Link>
              <Link href="/features">Features</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/about">About</Link>
            </nav>

            <Button
              size="lg"
              variant="outline"
              className="border-blue-400 hover:bg-blue-900/50"
            >
              <Link href="/dashboard">Login</Link>
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Pricing Plans That Fit Your Needs
          </h1>
          <p className="mt-6 text-lg text-blue-200">
            Choose the perfect plan to elevate your growth and engagement. Whether you&apos;re just starting or scaling, we have the right tools for you.
          </p>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { title: 'Simple and Transparent Pricing', description: 'No hidden fees, no surprises.' },
            { title: 'Scalable Solutions', description: 'Plans designed to grow with your needs.' },
            { title: 'World-Class Support', description: 'Access our dedicated support team anytime.' },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-black/40 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 flex flex-col items-center justify-center text-center"
            >
              <h3 className="text-xl font-semibold mb-4 text-white">{item.title}</h3>
              <p className="text-gray-400 font-bold">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
          {[
            {
              planName: 'Free Plan',
              price: '$0',
              description: 'Ideal for beginners or individuals exploring engagement tools.',
              features: [
                'Targeted automated responses to follower comments',
                'Boost engagement with personalized replies',
                'Convert followers into loyal customers',
                '24/7 access to the basic feature set',
                'Perfect for getting started without any commitment',
              ],
              buttonLabel: 'Get Started Free',
              buttonClasses: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
            },
            {
              planName: 'Smart AI Plan',
              price: '$99',
              description: 'Ideal for businesses and professionals seeking advanced tools.',
              features: [
                'Includes all features from the Free Plan',
                'AI-powered, contextual response generation',
                'Advanced analytics and insights',
                'Priority customer support',
                'Custom branding options',
                'Unlock the full potential of AI-powered tools',
              ],
              buttonLabel: 'Upgrade Now',
              buttonClasses: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
            },
          ].map((plan, index) => (
            <div
              key={index}
              className="w-full max-w-md bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-8 border border-white-800 hover:border-blue-500 transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">{plan.planName}</h3>
                <span className={`px-3 py-1 text-sm text-blue-400 bg-blue-400/10 rounded-full`}>
                  {index === 1 ? 'Popular' : 'Get Started'}
                </span>
              </div>
              <div className="mb-8">
                <p className="text-4xl font-bold">
                  {plan.price}
                  <span className="text-lg text-gray-400">/month</span>
                </p>
                <p className="text-white-400 mt-2 font-bold">{plan.description}</p>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className="w-6 h-6 text-blue-500 mr-2 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard">
                <button
                  className={`w-full bg-gradient-to-r ${plan.buttonClasses} text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105`}
                >
                  {plan.buttonLabel}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="max-w-3xl mx-auto mt-20">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            {
              question: 'Can I switch plans later?',
              answer: 'Yes, you can upgrade or downgrade anytime based on your needs.',
            },
            {
              question: 'What payment methods do you accept?',
              answer: 'We accept all major credit cards and online payment systems.',
            },
            {
              question: 'Is there a free trial for the Smart AI Plan?',
              answer: "Currently, we don&apos;t offer a trial, but our Free Plan provides a great way to explore the basic features.",
            },
            {
              question: 'How secure is my payment and data?',
              answer: 'We use industry-standard encryption to ensure your data and payments are secure.',
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-white/5 p-6 rounded-xl border border-gray-800"
            >
              <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
              <p className="text-gray-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call-to-Action Section */}
      <div className="text-center mt-20 mb-20"> {/* Added mb-20 for spacing */}
        <h2 className="text-3xl font-bold mb-6">Ready to Elevate Your Growth?</h2>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Whether you&apos;re just starting or looking to scale, we have the perfect plan for you. Join thousands of happy customers today!
        </p>
        <Link href="/dashboard">
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105">
            Get Started Now
          </button>
        </Link>
      </div>
    </section>
  );
};

export default PricingPage;

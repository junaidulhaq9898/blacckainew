"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Head from 'next/head';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const PricingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      <Head>
        <title>Best Instagram Automation Tool: AI Replies with a Human Touch</title>
        <meta
          name="description"
          content="Instagram automation that feels personal. With custom AI replies, every message you send feels like a real conversation, and connection instantly."
        />
      </Head>
      <main className="bg-transparent">
        <div className="plans-container bg-transparent">
          <section className="relative !bg-gradient-to-b !from-slate-900 !via-blue-900 !to-bg z-0">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] z-[-1]" />
            <div className="relative bg-transparent">
              {/* Header Section */}
              <div className="container px-4 py-8 bg-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image 
                      src="/logo1.png"
                      alt="Instagram automation tools logo"
                      width={140}
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
                    className="border-blue-400 hover:bg-blue-900/50 text-white"
                  >
                    <Link href="/dashboard">Login</Link>
                  </Button>
                </div>
              </div>

              {/* Hero Section */}
              <div className="mx-auto mt-16 max-w-3xl text-center bg-transparent">
                <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                  Find the Best Instagram Automation Tool
                </h1>
                <p className="mt-6 text-lg text-blue-200">
                  Optimize your Instagram account with the best instagram automation tools for creators, brands, and businesses ready to grow. Our platform provides instagram comment automation and ai instagram marketing features to help you thrive.
                </p>
              </div>

              {/* Why Choose Us */}
              <div className="container mx-auto px-4 py-16 bg-transparent">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">
                  Why Use the Best Instagram Automation Tool?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  {[
                    {
                      title: 'Achieve Instagram Growth Without Hassle',
                      description: 'Instagram is hard to manage—it\'s all-consuming. Our instagram automation tools let you focus on creating while we handle instagram comment automation.'
                    },
                    {
                      title: 'Engagement Through AI',
                      description: 'Build a virtual assistant with ai instagram marketing that delivers contextual, human-like responses to boost brand trust day and night.'
                    },
                    {
                      title: 'Strategies Customized for Each Stage',
                      description: 'Whether you\'re an individual or a company, our instagram automation tools are designed to meet your needs at every stage.'
                    }
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

              {/* Primary Benefits */}
              <div className="container mx-auto px-4 py-16 bg-transparent">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">
                  Primary Benefits of Our Instagram Automation Services
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  {[
                    {
                      title: 'Automatically Replying to Comments',
                      description: 'Instantly reply to follower comments with instagram comment automation to improve engagement and maintain relationships.'
                    },
                    {
                      title: 'Automatically Messaging Via Instagram',
                      description: 'Send direct messages automatically based on triggers or keywords, supporting lead nurturing with instagram automation tools.'
                    },
                    {
                      title: 'Advanced Analytics',
                      description: 'Gather insights on engagement, followers, and campaign performance to make data-driven decisions.'
                    }
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                  {[
                    {
                      title: 'Custom Branding',
                      description: 'Brand automated responses with your unique trademarks to increase recognition using ai instagram marketing.'
                    },
                    {
                      title: 'World Class Support 24/7',
                      description: 'Focus on your business while our support team is always available to assist.'
                    }
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

              {/* Instagram SEO Importance */}
              <div className="container mx-auto px-4 py-16 bg-transparent">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">
                  Boost Your Instagram SEO
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  {[
                    {
                      title: 'Keyword Injection',
                      description: 'Integrate keywords like “instagram automation tools” into captions, bios, and alt texts for better searchability.'
                    },
                    {
                      title: 'Automation of Timely Replies',
                      description: 'Scheduled replies and DMs boost activity metrics, improving organic reach with instagram comment automation.'
                    },
                    {
                      title: 'Hashtag and Content Optimization',
                      description: 'Research trending hashtags and optimize posts for higher visibility using built-in tools.'
                    }
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

              {/* Client Testimonials */}
              <div className="container mx-auto px-4 py-16 bg-transparent">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">
                  What Our Users Say
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  {[
                    {
                      name: 'Jane D., Business Owner',
                      quote: 'Commenting back consumed so much time before I adopted these instagram automation tools. Now, I\'ve more content to work on, and my engagement is skyrocketing!'
                    },
                    {
                      name: 'John L., Influencer',
                      quote: 'The ai instagram marketing responses are so natural—my followers think I\'m always active!'
                    },
                    {
                      name: 'Sarah K., Entrepreneur',
                      quote: 'I capture all marketing opportunities without losing leads thanks to instagram comment automation and auto DMs.'
                    }
                  ].map((testimonial, index) => (
                    <div
                      key={index}
                      className="bg-black/40 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 flex flex-col items-center justify-center text-center"
                    >
                      <p className="text-gray-400 mb-4">{testimonial.quote}</p>
                      <h3 className="text-lg font-semibold text-white">{testimonial.name}</h3>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Plans */}
              <div className="container mx-auto px-4 bg-transparent">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">
                  Pricing Plans That Fit Your Needs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
                  {[
                    {
                      planName: 'Free Plan',
                      price: '$0',
                      description: 'Ideal for beginners exploring instagram automation tools with instagram comment automation.',
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
                      description: 'Ideal for businesses seeking advanced ai instagram marketing and instagram automation tools.',
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
                        <h3 className="text-2xl font-bold text-white">{plan.planName}</h3>
                        <span className={`px-3 py-1 text-sm text-blue-400 bg-blue-400/10 rounded-full`}>
                          {index === 1 ? 'Popular' : 'Get Started'}
                        </span>
                      </div>
                      <div className="mb-8">
                        <p className="text-4xl font-bold text-white">
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
              <section className="container mx-auto px-4 py-16 max-w-7xl bg-transparent">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-4 max-w-3xl mx-auto">
                  {[
                    {
                      question: 'Can I switch plans later?',
                      answer: 'Of course, you can modify your plan at any time and be free to make adjustments whenever your circumstances shift.'
                    },
                    {
                      question: 'Is there a free trial?',
                      answer: 'Our Free Plan allows you to explore selected features with no obligations, acting as a limited free trial.'
                    },
                    {
                      question: 'What about the security of that data?',
                      answer: 'All transactions related to users\' data and payments are guarded with industry-standard encryption.'
                    },
                    {
                      question: 'Does use of automation tools impact SEO?',
                      answer: 'Yes, consistent interaction, keyword-rich captions, and quick replies improve Instagram SEO and boost your account\'s visibility.'
                    }
                  ].map((faq, index) => (
                    <div
                      key={index}
                      className={`rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 border-2 ${openFaq === index ? 'bg-blue-900 border-blue-400' : 'bg-gray-900 border-blue-600'}`}
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        data-testid={`faq-button-${index}`}
                        className="flex w-full items-center justify-between p-6 text-left hover:bg-blue-800 rounded-t-xl transition-colors duration-200"
                      >
                        <h4 className="text-lg font-semibold text-white">{faq.question}</h4>
                        {openFaq === index ? (
                          <ChevronUp className="h-6 w-6 text-blue-400" />
                        ) : (
                          <ChevronDown className="h-6 w-6 text-blue-400" />
                        )}
                      </button>
                      {openFaq === index && (
                        <div
                          data-testid={`faq-answer-${index}`}
                          className="p-6 pt-0 bg-blue-900 rounded-b-xl"
                        >
                          <div className="animate-fadeIn">
                            <p className="text-white">{faq.answer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Call-to-Action Section */}
              <div className="text-center mt-10 mb-10 bg-transparent">
                <h2 className="text-3xl font-bold mb-6 text-white">
                  Prepared to Change Your Instagram?
                </h2>
                <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                  A plethora of entrepreneurs and content creators trust us as the best instagram automation tools provider. Start your anticipation-free growth journey today!
                </p>
                <Link href="/dashboard">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105">
                    Get Started Now
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default PricingPage;
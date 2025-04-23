"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Head from 'next/head';
import { CheckCircle, ChevronUp, ChevronDown, MoreVertical } from 'lucide-react';
import { useState } from 'react';

const Features = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <Head>
        <title>Smart Instagram Automation Tools | AI Instagram Marketing</title>
        <meta
          name="description"
          content="Imagine responding instantly to every comment & DM with AI Instagram marketing that feels personal. Let our Instagram automation tools handle the work for you."
        />
      </Head>
      <section className="relative bg-gradient-to-b from-slate-900 via-blue-900 to-bg">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="relative">
          <div className="container px-4 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image 
                  src="/logo1.png"
                  alt="BlaccKAI Company Logo"
                  width={140}
                  height={60}
                  className="object-contain"
                />
              </div>
              <div className="flex items-center gap-4">
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
                <button
                  className="md:hidden text-blue-200"
                  onClick={toggleMenu}
                  aria-label="Toggle menu"
                >
                  <MoreVertical className="h-6 w-6" />
                </button>
              </div>
            </div>
            {isMenuOpen && (
              <div className="md:hidden mt-4 bg-gray-900 rounded-lg shadow-lg p-4 animate-fadeIn">
                <nav className="flex flex-col space-y-4 text-blue-200">
                  <Link href="/" onClick={toggleMenu}>Home</Link>
                  <Link href="/features" onClick={toggleMenu}>Features</Link>
                  <Link href="/pricing" onClick={toggleMenu}>Pricing</Link>
                  <Link href="/about" onClick={toggleMenu}>About</Link>
                  <Link href="/dashboard" onClick={toggleMenu}>Login</Link>
                </nav>
              </div>
            )}
            <div className="mx-auto mt-16 max-w-3xl text-center">
              <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Automate Smartly with Instagram Automation Tools
              </h1>
              <p className="mt-6 mb-12 text-base sm:text-lg text-blue-200 leading-relaxed">
                Managing an Instagram account is a full-time job in itself — between creating content, replying to comments, and trying to grow your community. Imagine if you could spend all your time creating content, which is what you love, while Instagram automation tools take over the rest. Our platform makes Instagram simple for small business owners, influencers, and anyone just getting started. From automatic responses to AI Instagram marketing, we have every automation solution that frees you from monotonous tasks, enabling you to engage with your audience and grow your business.
              </p>
            </div>
          </div>
          <section className="container mx-auto px-4 py-16 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Choose Your Plan
              </h2>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                Select the perfect plan to boost your Instagram engagement and take your social media presence to the next level
              </p>
            </div>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
                <div className="plan-card w-full max-w-md flex flex-col bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-8 backdrop-blur-sm border border-gray-800 hover:border-blue-500 transition-all duration-300">
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">Free Plan</h3>
                      <span className="px-3 py-1 text-sm text-blue-400 bg-blue-400/10 rounded-full">
                        Get Started
                      </span>
                    </div>
                    <p className="text-4xl font-bold mb-2">$0<span className="text-lg font-normal text-gray-400">/month</span></p>
                    <p className="text-gray-400 mb-8">Perfect for Getting Started</p>
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Boost Engagement</strong>
                          <span className="text-gray-400">Automated comment replies to build connections</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Automate Replies</strong>
                          <span className="text-gray-400">Instant automated responses to followers</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Convert Followers</strong>
                          <span className="text-gray-400">Turn followers into loyal customers</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-auto">
                    <Link href="/dashboard">
                      <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
                        Get Started Free
                      </button>
                    </Link>
                  </div>
                </div>
                <div className="plan-card w-full max-w-md flex flex-col bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-8 backdrop-blur-sm border border-gray-800 hover:border-purple-500 transition-all duration-300">
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">Smart AI Plan</h3>
                      <span className="px-3 py-1 text-sm text-purple-400 bg-purple-400/10 rounded-full">
                        Popular
                      </span>
                    </div>
                    <p className="text-4xl font-bold mb-2">$4.99<span className="text-lg font-normal text-gray-400">/month</span></p>
                    <p className="text-gray-400 mb-8">Advanced Features for Power Users</p>
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">All Free Features</strong>
                          <span className="text-gray-400">Everything in Free plan, plus more</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">AI-Powered Responses</strong>
                          <span className="text-gray-400">Smart, contextual automated replies</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Advanced Analytics</strong>
                          <span className="text-gray-400">Deep insights into your metrics</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Priority Support</strong>
                          <span className="text-gray-400">24/7 priority customer service</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Custom Branding</strong>
                          <span className="text-gray-400">Personalized automated responses</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-auto">
                    <Link href="/dashboard">
                      <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
                        Upgrade Now
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
      <div className="plans-container"></div>
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-6">Why You Should Love Our Instagram Automation Tools</h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Everything You Need to Grow Your Instagram Account, Give Your Instagram a Shot in The Arm, All the Right Features, All the Right Platforms, Grab a Free Account Today!
          </p>
        </div>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center max-w-5xl mx-auto">
            <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
              <div className="flex items-center gap-4">
                <div className="bg-blue-800 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-white">Save time</h4>
              </div>
              <p className="mt-4 text-white">Spend less time sorting out messages and more time doing what you love—creating posts and building your business.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
              <div className="flex items-center gap-4">
                <div className="bg-blue-800 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-white">Be All-Time Active</h4>
              </div>
              <p className="mt-4 text-white">No matter if you are not available, you get to reply to your followers because of the automated comment replies powered by Instagram comment automation.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
              <div className="flex items-center gap-4">
                <div className="bg-blue-800 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-white">Work Smart</h4>
              </div>
              <p className="mt-4 text-white">Leverage AI ai instagram marketing to communicate with your audience in a way that never feels automated.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center max-w-4xl mx-auto">
            <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
              <div className="flex items-center gap-4">
                <div className="bg-blue-800 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-white">Stay Consistent</h4>
              </div>
              <p className="mt-4 text-white">Clearly, a reply is never meant to be a mess, show your followers that you care by keeping your response on-brand and professional with instagram comment automation and dm automation.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
              <div className="flex items-center gap-4">
                <div className="bg-blue-800 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-white">Analyze Your Progress</h4>
              </div>
              <p className="mt-4 text-white">Gain insight into what’s increased your engagement and growth using our analytics and make smarter choices.</p>
            </div>
          </div>
        </div>
      </section>
    
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4 max-w-3xl mx-auto">
          {[
            {
              question: 'What Free vs Smart AI Plans mean?',
              answer: 'The Free Plan provides the fundamentals—automated responses and comment monitoring. The Smart AI Plan — This plan features AI replies, in-depth analysis, custom branding, and priority support.',
            },
            {
              question: 'Can I upgrade later?',
              answer: 'Yes, absolutely! You can easily start with the Free Plan and upgrade whenever you find you need more core features.',
            },
            {
              question: 'What is the process of AI-based replies?',
              answer: 'Our AI analyzes the context of the comment and creates a response in a natural way that resonates with your brand voice. Which is basically like having an assistant to take care of your Instagram content creation.',
            },
            {
              question: 'What type of support will I receive?',
              answer: 'You can always connect with our priority support whenever you need with the Smart AI Plan.',
            },
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
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-6">Real Stories from Real Users</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="testimonial bg-blue-900/50 rounded-2xl p-6 backdrop-blur-sm">
            <p className="mb-4 text-gray-300">"Before these tools, I spent hours responding to comments. I started creating more content and still managed to keep my engagement high!"</p>
            <p className="font-semibold">— Jane D., Business Owner</p>
          </div>
          <div className="testimonial bg-blue-900/50 rounded-2xl p-6 backdrop-blur-sm">
            <p className="mb-4 text-gray-300">"The responses generated by the AI are on point. So my followers think I’m always available—even when I am away!"</p>
            <p className="font-semibold">— John L., Influencer</p>
          </div>
          <div className="testimonial bg-blue-900/50 rounded-2xl p-6 backdrop-blur-sm">
            <p className="mb-4 text-gray-300">"Automation of Instagram comments has changed the game entirely. I never miss a question, and my sales are going up!"</p>
            <p className="font-semibold">— Sarah K., Small Business Owner</p>
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Want to Take Charge of Your Instagram?</h2>
          <p className="max-w-2xl mx-auto mb-8 text-gray-300">
            Be one of thousands of creators and businesses taking advantage of time-saving and engagement-boosting Instagram automation tools today. Try us out free or upgrade to Smart AI for greater access. So, here are five tips to run your Instagram account smoothly — without sacrificing the personal touch.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-purple-700 text-white">Get Started</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-purple-700 text-white">Upgrade Now</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Features;

import React from 'react';
import './page.css';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const InstagramPlans = () => {
  return (
    <>
      <section className="relative bg-gradient-to-b from-slate-900 via-blue-900 to-bg">
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

            {/* Features Hero Section */}
            <div className="mx-auto mt-16 max-w-3xl text-center">
              <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Elevate Your Instagram Game
              </h1>
              <p className="mt-6 text-lg text-blue-200">
                Ready to take your Instagram engagement to new heights? Our innovative plans are designed to help you automate, engage, and grow your audience effortlessly. Whether you&apos;re an aspiring influencer, a small business owner, or a seasoned marketer, we have the perfect solution for you.
              </p>
            </div>
          </div>
          <section className="container mx-auto px-4 py-16 max-w-7xl">
            {/* Heading Section */}
            <div className="text-center mb-16">
              <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Choose Your Plan
              </h2>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                Select the perfect plan to boost your Instagram engagement and take your social media presence to the next level
              </p>
            </div>

            {/* Plans Container */}
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
                {/* Free Plan Card */}
                <div className="plan-card w-full max-w-md flex flex-col bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-8 backdrop-blur-sm border border-gray-800 hover:border-blue-500 transition-all duration-300">
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold">Free Plan</h3>
                      <span className="px-3 py-1 text-sm text-blue-400 bg-blue-400/10 rounded-full">
                        Get Started
                      </span>
                    </div>
                    <p className="text-4xl font-bold mb-2">$0<span className="text-lg font-normal text-gray-400">/month</span></p>
                    <p className="text-white-400 mb-8">Perfect for Getting Started</p>

                    <ul className="space-y-4 mb-8">
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Boost Engagement</strong>
                          <span className="text-white-400">Automated comment replies to build connections</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Automate Replies</strong>
                          <span className="text-white-400">Instant automated responses to followers</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Convert Followers</strong>
                          <span className="text-white-400">Turn followers into loyal customers</span>
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

                {/* Smart AI Plan Card */}
                <div className="plan-card w-full max-w-md flex flex-col bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-8 backdrop-blur-sm border border-gray-800 hover:border-purple-500 transition-all duration-300">
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold">Smart AI Plan</h3>
                      <span className="px-3 py-1 text-sm text-purple-400 bg-purple-400/10 rounded-full">
                        Popular
                      </span>
                    </div>
                    <p className="text-4xl font-bold mb-2">$99<span className="text-lg font-normal text-gray-400">/month</span></p>
                    <p className="text-white-400 mb-8">Advanced Features for Power Users</p>

                    <ul className="space-y-4 mb-8">
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">All Free Features</strong>
                          <span className="text-white-400">Everything in Free plan, plus more</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">AI-Powered Responses</strong>
                          <span className="text-white-400">Smart, contextual automated replies</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Advanced Analytics</strong>
                          <span className="text-white-400">Deep insights into your metrics</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Priority Support</strong>
                          <span className="text-white-400">24/7 priority customer service</span>
                        </span>
                      </li>
                      <li className="flex items-start group">
                        <svg className="w-6 h-6 text-purple-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>
                          <strong className="block text-white">Custom Branding</strong>
                          <span className="text-white-400">Personalized automated responses</span>
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

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-6">Why Our Plans Stand Out</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="feature-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">Seamless Engagement</h4>
            <p className="text-gray-300">Our plans are crafted to enhance your Instagram engagement effortlessly. Automate your responses and watch your follower interaction soar.</p>
          </div>

          <div className="feature-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">Time-Saving Magic</h4>
            <p className="text-gray-300">Save precious time with our automated solutions. Focus on what you do best while we handle the rest.</p>
          </div>

          <div className="feature-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">Insightful Analytics</h4>
            <p className="text-gray-300">Gain valuable insights into your performance with our advanced analytics. Stay ahead with data-driven insights.</p>
          </div>

          <div className="feature-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">Personalized Branding</h4>
            <p className="text-gray-300">Maintain a consistent brand voice with our custom branding options. Stand out with personalized responses.</p>
          </div>

          <div className="feature-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">Unmatched Support</h4>
            <p className="text-gray-300">Priority support with the Smart AI Plan ensures a smooth experience.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-8 md:p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Instagram Presence?</h3>
          <p className="max-w-2xl mx-auto mb-8 text-gray-300">
            Choose the plan that best fits your needs and watch your engagement skyrocket. Whether you&apos;re just starting out or looking to leverage advanced features, we have the perfect solution for you.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-purple-700 text-white">Get Started with the Free Plan</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-purple-700 text-white">Upgrade to the Smart AI Plan</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-6">FAQs</h3>
        </div>
        <div className="grid gap-6 max-w-4xl mx-auto">
          <div className="faq-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">What sets the Free Plan apart from the Smart AI Plan?</h4>
            <p className="text-gray-300">The Free Plan offers basic automation features, while the Smart AI Plan includes advanced tools like AI-powered responses, analytics, and custom branding.</p>
          </div>

          <div className="faq-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">Can I upgrade from the Free Plan to the Smart AI Plan?</h4>
            <p className="text-gray-300">Absolutely! You can upgrade at any time. Just follow the upgrade instructions.</p>
          </div>

          <div className="faq-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">What kind of support is available with the Smart AI Plan?</h4>
            <p className="text-gray-300">The Smart AI Plan includes priority customer support for quick and efficient assistance.</p>
          </div>

          <div className="faq-item bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold mb-3">How does the AI-powered response generation work?</h4>
            <p className="text-gray-300">Our AI algorithms generate relevant, intelligent responses based on the context of comments, making your replies meaningful and engaging.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-6">Hear from Our Happy Users</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="testimonial bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <p className="mb-4 text-gray-300">&quot;The Smart AI Plan has been a game-changer for my business. The advanced analytics and AI-powered responses have helped me engage with my audience like never before. Highly recommend!&quot;</p>
            <p className="font-semibold">- Jane D., Business Owner</p>
          </div>

          <div className="testimonial bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <p className="mb-4 text-gray-300">&quot;I started with the Free Plan and was blown away by the results. Upgrading to the Smart AI Plan was a no-brainer. The priority support and custom branding options have taken my Instagram game to the next level.&quot;</p>
            <p className="font-semibold">- John L., Influencer</p>
          </div>

          <div className="testimonial bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <p className="mb-4 text-gray-300">&quot;As a small business owner, I don&apos;t have much time to manage my Instagram. The automation features have been a lifesaver. I can focus on my business while the tool handles the engagement.&quot;</p>
            <p className="font-semibold">- Sarah K., Small Business Owner</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-8 md:p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Join the Revolution</h3>
          <p className="max-w-2xl mx-auto mb-8 text-gray-300">
            Elevate your Instagram game with our powerful automation tools. Choose the plan that suits you best and watch your engagement soar.
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

export default InstagramPlans;

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Head from 'next/head';
import { CheckCircle } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <>
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
            <div className="mx-auto mt-16 max-w-3xl text-center">
              <h1 className="text-3xl font-bold leading-tight tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Intelligent Automation: Enabling the Next Generation with Instagram Automation Software
              </h1>
            </div>
          </div>
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto mb-20 text-center">
              <h2 className="text-3xl font-bold text-white mb-6">Blacck AI: A Child of Klovv Intelligence</h2>
              <p className="text-base sm:text-lg text-blue-200 leading-relaxed mt-6 mb-12">
                Blacck AI is a child of Klovv Intelligence—an industry leader in Artificial Intelligence automation. Backed by vast experience in instagram automation software, we build custom solutions that help your business automate workflows, gain online traction, and do the most important part — grow.
              </p>
            </div>
            <div className="mb-20">
              <h2 className="text-3xl font-bold text-white text-center mb-12">What Makes Blacck AI’s Instagram Automation Software Different</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Automate Your Communication",
                    description: "Instagram Automation Software that's tailored to your needs: Automate Your communication with user with smart automation system."
                  },
                  {
                    title: "Intelligent Analytics",
                    description: "Monitor performance in real-time and adjust your approach based on real data."
                  },
                  {
                    title: "The Human Touch",
                    description: "Let AI take care of the tedious work so that your team can create genuine narratives."
                  }
                ].map((item, index) => (
                  <div key={index} className="bg-white/5 p-6 rounded-xl border border-gray-800 hover:border-purple-500 transition-all duration-300">
                    <h4 className="text-xl font-semibold text-white mb-4">{item.title}</h4>
                    <p className="text-blue-200">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
              <div className="bg-white/5 p-8 rounded-2xl border border-gray-800 hover:border-blue-500 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-4">A Short History of Our Instagram Growth Automation Tools</h3>
                <p className="text-blue-200 leading-relaxed">
                  Blacck AI was actually birthed out of Klovv Intelligence, an AI vision from OpenAI Day 0 engineer Stella Carter Mae. Klovv Intelligence, under Stella leadership, raised the bar in artificial intelligence. We continue that legacy today by redefining what automated instagram growth tools are capable of, allowing entrepreneurs and marketers to grow real, engaging audiences with the scale they deserve.
                </p>
              </div>
              <div className="bg-white/5 p-8 rounded-2xl border border-gray-800 hover:border-blue-500 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-4">Get Real Instagram DM Automation For Our Mission</h3>
                <p className="text-blue-200 leading-relaxed mb-4">
                  Connection happens in the DMs reallyTypeface: With our Instagram direct message automation Instagram features, you can:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start group">
                    <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-blue-200">Greet New Followers with custom greetings.</span>
                  </li>
                  <li className="flex items-start group">
                    <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-blue-200">We nurture Leads through automated drip campaigns.</span>
                  </li>
                  <li className="flex items-start group">
                    <svg className="w-6 h-6 text-blue-500 mr-2 mt-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-blue-200">Drive sales from Conversations with messages that are timely, contextual and contextual.</span>
                  </li>
                </ul>
                <p className="text-blue-200 leading-relaxed mt-4">
                  All AI-powered but 100% human touch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-black">
        <div className="container mx-auto px-4 py-16">
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Why Choose Blacck AI?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Klovv Intelligence Powered Innovation",
                  description: "Use advanced research and advanced technology tools to make your instagram automation software progressive."
                },
                {
                  title: "Customer-First Mindset",
                  description: "Whether strategy sessions or onboarding, our team works alongside you to provide tangible results from your automated instagram growth tools."
                },
                {
                  title: "Continuous Improvement",
                  description: "Based on your feedback and AI updates, we improve our direct message automation Instagram workflows and release new features."
                }
              ].map((item, index) => (
                <div key={index} className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-800 p-3 rounded-full">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-bold text-white">{item.title}</h4>
                  </div>
                  <p className="mt-4 text-white">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Join the Movement</h2>
            <p className="text-base sm:text-lg text-blue-200 leading-relaxed mb-4 max-w-prose mx-auto">
              Blacck AI is a partner, not a vendor. Looking to streamline your business or just want to get a little help from the industry-leading instagram automation tools out there? Look no further in that case.
            </p>
            <p className="text-base sm:text-lg text-blue-200 leading-relaxed mb-4 max-w-prose mx-auto">
              We guide you from the first consultation to ensure smooth implementation. Partnering with Klovv Intelligence, we are building the future one AI at a time!
            </p>
            <p className="text-base sm:text-lg text-blue-200 leading-relaxed mb-4 max-w-prose mx-auto">
              Start Doing More and understand how our instagram automation app, auto instagram growth tools and dm automation instagram solutions can take your brand to the next level!
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutPage;
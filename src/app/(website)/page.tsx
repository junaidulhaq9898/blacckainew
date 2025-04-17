"use client";

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const plans = [
    {
      name: 'Free Plan',
      description: 'Perfect for getting started',
      price: '$0',
      features: [
        'Boost engagement with target responses',
        'Automate comment replies to enhance audience interaction',
        'Turn followers into customers with targeted messaging',
      ],
      cta: (
        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'blue' }}>
          Get Started
        </Link>
      ),
    },
    {
      name: 'Smart AI Plan',
      description: 'Advanced features for power users',
      price: '$99',
      features: [
        'All features from Free Plan',
        'AI-powered response generation',
        'Advanced analytics and insights',
        'Priority customer support',
        'Custom branding options',
      ],
      cta: (
        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'blue' }}>
          Upgrade Now
        </Link>
      ),
    },
  ];

  const faqs = [
    {
      question: 'Is Instagram DM automation safe?',
      answer: 'Not every automation tool is safe for your account. With BlaccKAI, they use approved processes and keep within the borders of the platform ensuring the users are safe and compliant with instagram dm automation.',
    },
    {
      question: 'What is DM AI response?',
      answer: 'Instagram dm automation BlaccKAI employs ensures to track replied messages and respond back in question instantly. The system works through receiving grammatically correct relevant replies overflowing conversations maintaining them in the manner a normal person would, removing the need to type.',
    },
    {
      question: 'Will my followers know it’s automated?',
      answer: 'Although we can customize messages and therefore have control over brand voice, you decided how BlaccKAI responds with AI thus tailoring the responses ensuring they were without being awkward for dm automation instagram.',
    },
    {
      question: 'What would take place if Instagram alters its guidelines?',
      answer: 'While Instagram has rules and policies that may change from time to time, BlaccKAI has its ways of making sure rules do not affect its users. Routine compliance is done to ensure users remain trouble free as BlaccKAI adapts to rule changes the platform makes for instagram dm automation.',
    },
    {
      question: 'What happens in the case of customers needing the interaction of a human being?',
      answer: 'In the event of sophisticated conversations, advanced automation will alert BlaccKAI towards no longer using bots for the interaction, and easy transitions to a human interface will be present within your discussions with dm automation instagram.',
    },
    {
      question: 'What steps are necessary to protect users if Instagram displays “suspect automated behaviour on your account”?',
      answer: 'Users who go against the app’s terms of service may get flagged by Instagram. BlaccKAI adheres to its strict rules of API and usage guidelines which manage your level of risk for instagram we suspect automated behavior on your account.',
    },
    {
      question: 'Is BlaccKAI suitable for Business Diskussions?',
      answer: 'Certainly! On other platforms such as e-mail and Instagram, BlaccKAI greatly simplifies the control of business chat instagram. Customer care, selling and even engagement gets handled systematically by BlaccKAI.',
    },
    {
      question: 'How does Instagram DM Automation assist in the lead generation process?',
      answer: 'Using dm automation instagram, you can reach out to those who comment on your social posts, reply to messages about your products, and even send tailored offers. It helps convert engagements into leads without needing extra effort.',
    },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      <Head>
        <title>AI Instagram DM Automation & Automatic Comment Reply</title>
        <meta
          name="description"
          content="Instagram DM Automation with AI custom responses that sound human. Use comment to DM automation and automatic comment reply for genuine interactions."
        />
      </Head>
      <main>
        <section className="relative bg-gradient-to-b from-slate-900 via-blue-900 to-bg">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          <div className="relative">
            <div className="container px-4 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Image
                      src="/logo1.png"
                      alt="Company Logo"
                      width={140}
                      height={60}
                      className="object-contain"
                    />
                  </div>
                </div>
                <nav className="hidden space-x-6 text-sm text-white md:block">
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

              <div className="mx-auto mt-16 max-w-3xl text-center">
                <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                  BlaccKAI – Simplified Instagram DM Automation
                </h1>

                <p className="mt-6 text-lg text-white">
                  BlaccKAI is aimed at brands and creators that wish to enhance their Instagram interactions by automating responses without sacrificing quality, compliance, or control. With BlaccKAI, whether it's inquiries, sales, or support, everything is streamlined thanks to dm automation instagram.
                </p>

                <div className="mt-8 flex justify-center gap-4">
                  <Button
                    size="lg"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Link href="/dashboard">Get Started</Link>
                  </Button>
                  <Button
                    size="lg"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Link href="/privacy">Privacy Policy</Link>
                  </Button>
                </div>
              </div>
              <div className="relative h-40 md:h-80 w-full mt-10">
                <Image
                  src="/homea.png"
                  alt="Community member"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>
        <section className="container w-full py-12 md:py-24 lg:py-32 bg-black">
          <div className="container px-4 md:px-6">
            <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl text-center text-white">
              How BlaccKAI Works
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-t-4 border-blue-600">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">1</div>
                <h3 className="text-2xl font-bold mt-4 text-white">Link Your Instagram</h3>
                <p className="mt-4 text-white">
                  All you need to do is link your Instagram account and blaccKAI will set up everything within seconds.
                </p>
              </div>
              <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-t-4 border-blue-600">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">2</div>
                <h3 className="text-2xl font-bold mt-4 text-white">Set Your Rules</h3>
                <p className="mt-4 text-white">
                  Decide what will trigger automation, select custom responses, and set keywords for your dm automation instagram. Everything ranging from welcome messages to product verifications are handled as per your preferences.
                </p>
              </div>
              <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-t-4 border-blue-600">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">3</div>
                <h3 className="text-2xl font-bold mt-4 text-white">Step Up Access & Revenues</h3>
                <p className="mt-4 text-white">
                  Relax and allow BlaccKAI to control the discussions as you focus on boosting your business productivity.
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl text-center mt-16 text-white">
              What Makes BlaccKAI Better Than The Rest?
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-800 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Automation Focused on Technical Accuracy</h3>
                </div>
                <p className="mt-4 text-white">
                  Instead of providing a uniform solution to each message as most tools would, BlaccKAI applies high level intent discernment. Your audience will receive a tailored and contextually appropriate answer regardless of whether the question is a product inquiry, some form of support, or a thank you note.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-800 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Controlled Privacy Automation</h3>
                </div>
                <p className="mt-4 text-white">
                  BlaccKAI does not collect users’ messages and will not give their data to any outside company. All dm automation instagram done is under the users surveillance and all users have total dominion over every single action executed.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-800 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Smooth Transition to Human Chat Assistants</h3>
                </div>
                <p className="mt-4 text-white">
                  In situations where delicate matters such as conversations take place, BlaccKAI allows dm automation instagram to be effortlessly transitioned to a human worker, meaning no prior context is lost.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-800 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Accommodative System Development</h3>
                </div>
                <p className="mt-4 text-white">
                  No matter if a client is receiving or sending anywhere from 10 to 10,000 messages, BlaccKAI is designed to provide the best level of service without undermining performance, meaning they are fast and dependable.
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl text-center mt-16 text-white">
              Notable Options Provided
            </h2>
            <div className="mt-12 space-y-8">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 justify-center max-w-5xl mx-auto">
                <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
                  <h3 className="text-xl font-bold text-white">Instagram Direct Message Automation</h3>
                  <p className="mt-4 text-white">
                    Dm automation instagram is streamlined to the most effortless aspect of one’s daily life as responses to DMs can be sent instantly through custom flows, templates or AI replies.
                  </p>
                </div>
                <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
                  <h3 className="text-xl font-bold text-white">Comment to DM Automation</h3>
                  <p className="mt-4 text-white">
                    Public conversations or comments can strategically be moved to private DMs or comment sections without being publicly posted therefore flooding comment sections with comment to dm automation.
                  </p>
                </div>
                <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
                  <h3 className="text-xl font-bold text-white">Automatic Comment Reply on Instagram</h3>
                  <p className="mt-4 text-white">
                    Comments receive smart context aware replies that ensures no question or engagement opportunity is wasted with instagram automatic comment reply.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 justify-center max-w-4xl mx-auto">
                <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
                  <h3 className="text-xl font-bold text-white">Performance Tracking</h3>
                  <p className="mt-4 text-white">
                    Evaluating automations alongside engagements provides insights to gauging evolving performance analytics whereby examining automation feedback and response metrics.
                  </p>
                </div>
                <div className="relative bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2 border-l-4 border-blue-600">
                  <h3 className="text-xl font-bold text-white">Tailored Task Per Role Assigned Access</h3>
                  <p className="mt-4 text-white">
                    Support, Marketing, and Sales have their dedicated streamlined tasks tailored to their designated roles that can be assigned, improving customer journey optimization and creating an enhanced fluid workflow.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl text-center mt-16 text-white">
              Practical Applications
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <h3 className="text-xl font-bold text-white">Product Marketing</h3>
                <p className="mt-4 text-white">
                  Fully customize exclusive rewards for each follower that comments either “Interested” or “Price” on the launch message, automating DMs to those users with comment to dm automation.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <h3 className="text-xl font-bold text-white">Event Attendance</h3>
                <p className="mt-4 text-white">
                  Collect RSVPs and send reminders through DMs while handling common questions through dm automation instagram.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <h3 className="text-xl font-bold text-white">Customer Support</h3>
                <p className="mt-4 text-white">
                  Automatically send DMs after a purchase requesting feedback to collect valuable insights without needing additional systems via dm automation instagram.
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:-translate-y-2">
                <h3 className="text-xl font-bold text-white">Reputation Management</h3>
                <p className="mt-4 text-white">
                  Automatically identify negative comments, notify your staff and use instagram automatic comment reply bots to change the conversation into private messages for resolution.
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl text-center mt-16 text-white">
              FAQs
            </h2>
            <div className="mt-12 space-y-4 max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 border-2 ${
                    openFaq === index ? 'bg-blue-900 border-blue-400' : 'bg-gray-900 border-blue-600'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    data-testid={`faq-button-${index}`}
                    className="flex w-full items-center justify-between p-6 text-left hover:bg-blue-800 rounded-t-xl transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {faq.question}
                    </h3>
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

            <div className="flex flex-col items-center justify-center space-y-4 text-center mt-16">
              <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl text-white">
                Choose Your Plan
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2 md:gap-8">
              {plans.map((plan, index) => (
                <Card
                  key={index}
                  className="flex flex-col justify-between bg-gray-900 border-blue-600"
                >
                  <CardHeader>
                    <CardTitle className="text-white">{plan.name}</CardTitle>
                    <CardDescription className="text-white">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="text-4xl font-bold text-white">
                      {plan.price}
                      <span className="text-lg font-normal text-white">
                        /month
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-center"
                        >
                          <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                          <span className="text-sm text-white">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <Link href="/dashboard">
                    <Button className="w-full">{plan.cta}</Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}


// src/app/(website)/about/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image'; // Add this import at the top


const AboutPage: React.FC = () => {
  return (
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

          {/* Hero Section */}
          <div className="mx-auto mt-16 max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Empowering the Future with Intelligent Automation
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          {/* Welcome Section */}
          <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">Welcome to Blacck AI</h2>
            <p className="text-lg text-blue-200 leading-relaxed">
              Blacck AI is a proud child company of Klovv Intelligence, a trailblazer in the field of artificial intelligence automation. At Blacck AI, we focus on delivering cutting-edge AI solutions tailored to meet the dynamic needs of modern businesses. Our mission is to empower innovation through intelligent automation, helping organizations streamline processes, enhance efficiency, and unlock their true potential.
            </p>
          </div>

          {/* Legacy Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div className="bg-white/5 p-8 rounded-2xl border border-gray-800 hover:border-blue-500 transition-all duration-300">
              <h2 className="text-2xl font-bold text-white mb-4">Our Legacy: Rooted in Innovation</h2>
              <p className="text-blue-200 leading-relaxed">
                Blacck AI draws its inspiration and expertise from its parent company, Klovv Intelligence. Founded by Stella Carter, a visionary AI engineer and former OpenAI pioneer, Klovv Intelligence has become synonymous with excellence in artificial intelligence. Stella's leadership has not only shaped Klovv Intelligence but also laid the foundation for Blacck AI's commitment to innovation and quality.
              </p>
            </div>
            <div className="bg-white/5 p-8 rounded-2xl border border-gray-800 hover:border-blue-500 transition-all duration-300">
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-blue-200 leading-relaxed">
                At Blacck AI, our goal is to simplify complex challenges through AI-powered solutions. From automating workflows to building intelligent tools that revolutionize industries, we are dedicated to creating impactful solutions that drive success.
              </p>
            </div>
          </div>
          
          

          {/* Why Choose Us Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Why Choose Blacck AI?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Expertise Backed by Klovv Intelligence",
                  description: "With the legacy and support of Klovv Intelligence, we have access to cutting-edge research and technology to deliver top-notch AI solutions."
                },
                {
                  title: "Customer-Centric Approach",
                  description: "We tailor our services to meet the unique requirements of our clients, ensuring seamless integration and measurable results."
                },
                {
                  title: "Innovation at the Core",
                  description: "With a foundation rooted in Klovv Intelligence's ethos, we are constantly pushing boundaries to stay ahead of the curve."
                }
              ].map((item, index) => (
                <div key={index} className="bg-white/5 p-6 rounded-xl border border-gray-800 hover:border-purple-500 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
                  <p className="text-blue-200">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Join Us in Shaping the Future</h2>
            <p className="text-lg text-blue-200 mb-8">
              Blacck AI is more than just a company; it's a movement towards a smarter, more efficient future. Whether you're looking to optimize your business operations or explore the possibilities of AI, we're here to help you every step of the way.
            </p>
            <p className="text-lg text-blue-200 font-semibold">
              Together with Klovv Intelligence, we're shaping the future of AI—one innovation at a time.
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
      </div>
    </section>
  );
};

export default AboutPage;

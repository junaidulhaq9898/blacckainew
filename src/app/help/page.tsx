'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/global/sidebar';

const HelpPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      
      <div className="flex">
        <Sidebar slug={''} />
        
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          {/* Main Contact Container */}
          <div className="relative w-full max-w-lg p-10 bg-gray-900 rounded-2xl shadow-2xl border-2">
            {/* Logo Section */}
            <div className="flex items-center justify-center mb-8">
              <Image 
                src="/logo1.png"
                alt="Company Logo"
                width={140}
                height={60}
                className="object-contain"
              />
            </div>

            {/* Title Section */}
            <h1 className="text-4xl font-bold text-white text-center mb-4">Help & Support</h1>
            <p className="text-gray-300 text-center mb-8">
              Have any questions? Let us know below.
            </p>

            {/* Contact Form */}
            <form
              action="https://formspree.io/f/xgvazjro"
              method="POST"
              className="space-y-6"
            >
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-lg font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full p-3 border-2 border-[#2563eb] rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-lg font-medium text-gray-300 mb-2">
                  Your Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="_replyto"
                  required
                  className="w-full p-3 border-2 border-[#2563eb] rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label htmlFor="message" className="block text-lg font-medium text-gray-300 mb-2">
                  Your Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full p-3 border-2 border-[#2563eb] rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-[#2563eb] hover:bg-[#1e40af] text-white font-semibold rounded-lg transition-all duration-300 border-2 border-[#2563eb] hover:border-[#1e40af]"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
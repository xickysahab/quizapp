import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FAF8F6] border-t border-[#E8DFD5] pt-16 pb-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Brand & Description */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2D2A26] flex items-center justify-center text-[#F4ECE1]">
              <Sparkles className="w-4 h-4 text-[#8C6D46]" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-[#1C1917]">
              PULSE
            </span>
          </div>
          <p className="text-[#78716C] text-sm leading-relaxed max-w-sm">
            Crafting serene, captivating live interactions for classrooms, conferences, and virtual stages worldwide.
          </p>
        </div>

        {/* Column 1 - Product */}
        <div>
          <h4 className="font-medium text-[#1C1917] text-sm tracking-wide uppercase mb-4">
            Platform
          </h4>
          <ul className="space-y-2.5 text-sm text-[#78716C]">
            <li>
              <Link to="/" className="hover:text-[#1C1917] transition-colors">
                Live Join
              </Link>
            </li>
            <li>
              <a href="#features" className="hover:text-[#1C1917] transition-colors">
                Features & Design
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-[#1C1917] transition-colors">
                How It Works
              </a>
            </li>
          </ul>
        </div>

        {/* Column 2 - Hosts */}
        <div>
          <h4 className="font-medium text-[#1C1917] text-sm tracking-wide uppercase mb-4">
            Host Portal
          </h4>
          <ul className="space-y-2.5 text-sm text-[#78716C]">
            <li>
              <Link to="/login" className="hover:text-[#1C1917] transition-colors">
                Sign In
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[#1C1917] transition-colors">
                Create Account
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-[#1C1917] transition-colors">
                Host Dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-[#E8DFD5]/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#A8A29E]">
        <p>© {new Date().getFullYear()} Pulse Interactive. All rights reserved.</p>
        <p className="font-serif italic text-sm text-[#78716C]">Designed with elegance and purpose.</p>
      </div>
    </footer>
  );
};

export default Footer;

'use client';

import {
  Sparkles,
  Layers,
  Zap,
  Globe,
  MessageSquare,
  FileText,
  Mic,
  Image,
  Youtube
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    title: "Drag & Drop Simplicity",
    description: "Build powerful AI canvases in minutes, not months. No code. No chaos. Just clarity.",
    icon: Layers,
    color: "text-[#095D40]",
    bgColor: "bg-[#095D40]/10",
  },
  {
    title: "Smart AI Stack",
    description: "Connect GPT-4, Claude, and Gemini. Your entire AI arsenal, in one space.",
    icon: Sparkles,
    color: "text-[#D4AF7F]",
    bgColor: "bg-[#D4AF7F]/10",
  },
  {
    title: "Real-Time Creation",
    description: "See your canvas think, write, and build — live. Instant output. Infinite flow.",
    icon: Zap,
    color: "text-[#095D40]",
    bgColor: "bg-[#095D40]/10",
  },
];

const nodeTypes = [
  { icon: Youtube, label: "YouTube", color: "#095D40" },
  { icon: FileText, label: "PDFs", color: "#D4AF7F" },
  { icon: Mic, label: "Voice", color: "#095D40" },
  { icon: Image, label: "Images", color: "#D4AF7F" },
  { icon: Globe, label: "Web", color: "#095D40" },
  { icon: MessageSquare, label: "Chat", color: "#D4AF7F" },
];

export function Features() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-white" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-[#333333] mb-6 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
            Everything you need.
            <br />
            <span className="text-[#095D40]">Nothing you don't.</span>
          </h2>
          <p className={`text-xl text-[#6B7280] max-w-3xl mx-auto ${isVisible ? 'animate-fade-in-delay' : 'opacity-0'}`}>
            Stop fighting messy tools. Start creating with clarity.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group p-8 rounded-2xl border border-[#E8ECEF] hover:border-[#095D40]/30 hover:shadow-xl transition-all duration-150 ${
                isVisible ? `animate-slide-up-${index}` : 'opacity-0'
              }`}
            >
              <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-3">
                {feature.title}
              </h3>
              <p className="text-[#6B7280] text-lg leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Connect Everything Section */}
        <div className={`bg-gradient-to-br from-[#095D40]/5 to-[#D4AF7F]/5 rounded-3xl p-12 lg:p-16 ${isVisible ? 'animate-fade-in-slow' : 'opacity-0'}`}>
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold text-[#333333] mb-4">
              Connect Everything
            </h3>
            <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
              From PDFs to voice, from YouTube to chat. Every source, one system.
            </p>
          </div>

          {/* Animated Node Grid */}
          <div className="flex flex-wrap justify-center gap-4">
            {nodeTypes.map((node, index) => (
              <div
                key={node.label}
                className={`group cursor-pointer ${isVisible ? `animate-pop-${index}` : 'opacity-0'}`}
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-150 hover:-translate-y-2">
                  <node.icon
                    className="w-10 h-10 mb-3 mx-auto"
                    style={{ color: node.color }}
                  />
                  <p className="text-sm font-medium text-[#333333] text-center">
                    {node.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-slow {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pop {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-fade-in-slow {
          animation: fade-in-slow 1s ease-out 0.4s forwards;
          opacity: 0;
        }

        .animate-slide-up-0 {
          animation: slide-up 0.6s ease-out forwards;
        }

        .animate-slide-up-1 {
          animation: slide-up 0.6s ease-out 0.1s forwards;
          opacity: 0;
        }

        .animate-slide-up-2 {
          animation: slide-up 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-pop-0 { animation: pop 0.4s ease-out 0.6s forwards; opacity: 0; }
        .animate-pop-1 { animation: pop 0.4s ease-out 0.7s forwards; opacity: 0; }
        .animate-pop-2 { animation: pop 0.4s ease-out 0.8s forwards; opacity: 0; }
        .animate-pop-3 { animation: pop 0.4s ease-out 0.9s forwards; opacity: 0; }
        .animate-pop-4 { animation: pop 0.4s ease-out 1s forwards; opacity: 0; }
        .animate-pop-5 { animation: pop 0.4s ease-out 1.1s forwards; opacity: 0; }
      `}</style>
    </section>
  );
}
'use client';

import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Designer",
    company: "",
    content: "I went from idea to workflow in 15 minutes. This is what no-code should have always been.",
    rating: 5,
    image: "SC"
  },
  {
    name: "Marcus Rodriguez",
    role: "Marketing Director",
    company: "",
    content: "We automated our content pipeline. What took 3 days now takes 3 hours.",
    rating: 5,
    image: "MR"
  },
  {
    name: "Emily Watson",
    role: "CEO",
    company: "",
    content: "Finally, AI that my team actually uses. No engineers required.",
    rating: 5,
    image: "EW"
  }
];

export function Testimonials() {
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
    <section ref={sectionRef} className="py-24 lg:py-32 bg-gradient-to-b from-white to-[#FAFBFC]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-[#333333] mb-6 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
            Loved by innovators.
            <br />
            <span className="text-[#095D40]">Trusted by leaders.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={`bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-150 ${
                isVisible ? `animate-slide-up-${index}` : 'opacity-0'
              }`}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#D4AF7F] text-[#D4AF7F]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-lg text-[#333333] mb-8 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#095D40] to-[#D4AF7F] rounded-full flex items-center justify-center text-white font-semibold">
                  {testimonial.image}
                </div>
                <div>
                  <div className="font-semibold text-[#333333]">{testimonial.name}</div>
                  <div className="text-sm text-[#6B7280]">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className={`mt-24 bg-gradient-to-r from-[#095D40] to-[#074030] rounded-3xl p-12 lg:p-16 ${isVisible ? 'animate-fade-in-slow' : 'opacity-0'}`}>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">98%</div>
              <div className="text-white/80">User Satisfaction</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">3x</div>
              <div className="text-white/80">Faster Canvas Creation</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">500+</div>
              <div className="text-white/80">AI Templates</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">24/7</div>
              <div className="text-white/80">Support</div>
            </div>
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
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-fade-in-slow {
          animation: fade-in-slow 1s ease-out 0.6s forwards;
          opacity: 0;
        }

        .animate-slide-up-0 {
          animation: slide-up 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-slide-up-1 {
          animation: slide-up 0.6s ease-out 0.3s forwards;
          opacity: 0;
        }

        .animate-slide-up-2 {
          animation: slide-up 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
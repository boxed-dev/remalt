"use client";
import React, { useEffect, useRef } from "react";
import AboutUsSection from "@components/Sections/About/AboutUsSection";
import AdditionalInfoSection from "@components/Sections/AdditionalInfoSection/AdditionalInfoSection";
import BenefitsSection from "@components/Sections/BenefitsSection/BenefitsSection";
import DesktopFeaturesSection from "@components/Sections/DesktopFeaturesSection/DesktopFeaturesSection";
import FooterSection from "@components/Sections/FooterSection/FooterSection";
import HeroHeaderSection from "@components/Sections/HeroHeaderSection/HeroHeaderSection";
import IntegrationsSection from "@components/Sections/IntegrationsSection/IntegrationsSection";
import CTA from "@components/Sections/LayoutSection/LayoutSection";
import Lenis from "lenis";
import NavbarDemo from "@/components/Sections/Navbar/Navbar";

export default function ElementDefault() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Initialize Lenis
    lenisRef.current = new Lenis({
      duration: 1.5,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    const animate = (time: number) => {
      lenisRef.current?.raf(time);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      lenisRef.current?.destroy();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element && lenisRef.current) {
      lenisRef.current.scrollTo(element, {
        duration: 2.5,
        easing: (t) =>
          t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        offset: -80,
      });
    }
  };

  return (
    <div className="">
      <NavbarDemo scrollToSection={scrollToSection} />
      <HeroHeaderSection />
      <div id="about">
        <AboutUsSection />
      </div>
      <div id="Benifits">
        <BenefitsSection />
      </div>
      <div id="">
        <IntegrationsSection />
      </div>
      <DesktopFeaturesSection />
      <div id="contact">
        <CTA />
      </div>
      <FooterSection />
    </div>
  );
}

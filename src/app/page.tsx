import React from "react";
import AboutUsSection  from "@components/Sections/About/AboutUsSection";
import AdditionalInfoSection  from "@components/Sections/AdditionalInfoSection/AdditionalInfoSection";
import BenefitsSection  from "@components/Sections/BenefitsSection/BenefitsSection";
import  DesktopFeaturesSection  from "@components/Sections/DesktopFeaturesSection/DesktopFeaturesSection";
import FooterSection  from "@components/Sections/FooterSection/FooterSection";
import HeroHeaderSection  from "@components/Sections/HeroHeaderSection/HeroHeaderSection";
import IntegrationsSection  from "@components/Sections/IntegrationsSection/IntegrationsSection";
import CTA  from "@components/Sections/LayoutSection/LayoutSection";

import NavbarDemo from "@/components/Sections/Navbar/Navbar";

export  default function ElementDefault () {
  return (
    <div className="">
      <NavbarDemo />
      <HeroHeaderSection />
      <AboutUsSection />
      <BenefitsSection />
      <AdditionalInfoSection />
      <IntegrationsSection />
      <DesktopFeaturesSection />
      <CTA />
      <FooterSection />
    </div>
  );
};

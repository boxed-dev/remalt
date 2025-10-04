"use client";
import GetStartedButton from "@/components/ui/buttonAnimation";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";

interface NavbarDemoProps {
  scrollToSection?: (id: string) => void;
}

export default function NavbarDemo({ scrollToSection }: NavbarDemoProps) {
  const navItems = [
    {
      name: "About Us",
      link: "about",
    },
    {
      name: "Benifits",
      link: "Benifits",
    },
    {
      name: "Contact",
      link: "contact",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
    e.preventDefault();
    if (scrollToSection) {
      scrollToSection(link);
    } else {
      // Fallback to default behavior
      const element = document.getElementById(link);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <Navbar>
      {/* Desktop Navigation */}
      <NavBody>
        <NavbarLogo />
        <div className="flex-1 flex items-center justify-center">
          {navItems.map((item, idx) => (
            <a
              key={`nav-link-${idx}`}
              href={`#${item.link}`}
              onClick={(e) => handleNavClick(e, item.link)}
              className="relative px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              {item.name}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <GetStartedButton className="bg-[#12785a] hover:bg-[#0f6b4d] text-white text-xs sm:text-sm py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg border border-[#7c5ac5] flex items-center">
            <span className="hidden sm:inline mr-2">Join the Waitlist</span>
          </GetStartedButton>
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          {navItems.map((item, idx) => (
            <a
              key={`mobile-link-${idx}`}
              href={`#${item.link}`}
              onClick={(e) => handleNavClick(e, item.link)}
              className="relative text-neutral-600 dark:text-neutral-300"
            >
              <span className="block">{item.name}</span>
            </a>
          ))}
          <div className="flex w-full flex-col gap-4">
            <NavbarButton
              onClick={() => setIsMobileMenuOpen(false)}
              variant="primary"
              className="w-full bg-[#12785a] hover:bg-[#0f6b4d] text-white"
            >
              <span className="sm:hidden">Join Waitlist</span> 
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}



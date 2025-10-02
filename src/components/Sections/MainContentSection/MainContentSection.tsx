// import { ArrowRight as ArrowRightIcon } from "lucide-react";
// import React from "react";
// import { Button } from "@components/ui/button";
// import {
//   NavigationMenu,
//   NavigationMenuItem,
//   NavigationMenuLink,
//   NavigationMenuList,
// } from "@components/ui/navigation-menu";

// export const MainContentSection = (): JSX.Element => {
//   const navigationItems = [
//     { label: "Pricing", href: "#pricing" },
//     { label: "Features", href: "#features" },
//     { label: "Integrations", href: "#integrations" },
//     { label: "Blog", href: "#blog" },
//     { label: "Reviews", href: "#reviews" },
//     { label: "FAQs", href: "#faqs" },
//   ];

//   return (
//     <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm shadow-sm">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex items-center justify-between h-16">
//           <div className="flex items-center gap-8">
//             <div className="[font-family:'Bricolage_Grotesque',Helvetica] font-medium text-black text-xl sm:text-2xl whitespace-nowrap">
//               Remalt
//             </div>

//             <NavigationMenu className="hidden lg:flex">
//               <NavigationMenuList className="flex gap-6">
//                 {navigationItems.map((item, index) => (
//                   <NavigationMenuItem key={index}>
//                     <NavigationMenuLink
//                       href={item.href}
//                       className="[font-family:'Onest',Helvetica] font-medium text-black text-sm lg:text-base tracking-[-0.32px] hover:text-gray-600 transition-colors"
//                     >
//                       {item.label}
//                     </NavigationMenuLink>
//                   </NavigationMenuItem>
//                 ))}
//               </NavigationMenuList>
//             </NavigationMenu>
//           </div>

//           <Button className="bg-[#12785a] hover:bg-[#0f6b4d] text-white text-xs sm:text-sm px-4 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg border border-[#7c5ac5]">
//             <span className="hidden sm:inline">Join the Waitlist </span>
//             <span className="sm:hidden">Join Waitlist</span>
//             <ArrowRightIcon className="w-4 h-4 ml-2" />
//           </Button>
//         </div>
//       </div>
//     </nav>
//   );
// };

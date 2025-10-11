import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import Image from "next/image";

// Mobile Component
function MobileOrbitingCircles() {
  return (
    <div className="relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-lg md:hidden">
      <span className="pointer-events-none z-10 whitespace-pre-wrap bg-gradient-to-b from-black to-emerald-600 bg-clip-text text-center text-4xl font-semibold leading-none text-transparent dark:from-white dark:to-black">
        Remalt
      </span>

      {/* Innermost Circles - Mobile */}
      <OrbitingCircles
        className="size-[30px] border-none bg-transparent z-20"
        duration={15}
        delay={0}
        radius={35}
      >
        <Image
          src="/logos/gmail1.png"
          alt="Gmail"
          width={30}
          height={30}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[30px] border-none bg-transparent z-20"
        duration={15}
        delay={7.5}
        radius={35}
      >
        <Image
          src="/logos/safari1.png"
          alt="Safari"
          width={30}
          height={30}
          className="object-contain"
        />
      </OrbitingCircles>

      {/* Inner Circles - Mobile */}
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        duration={18}
        delay={0}
        radius={80}
        reverse
      >
        <Image
          src="/logos/fb.png"
          alt="Facebook"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        duration={18}
        delay={6}
        radius={80}
        reverse
      >
        <Image
          src="/logos/yt1.png"
          alt="YouTube"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        duration={18}
        delay={12}
        radius={80}
        reverse
      >
        <Image
          src="/logos/x1.png"
          alt="X"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>

      {/* Middle Circles - Mobile */}
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={125}
        duration={22}
        delay={0}
      >
        <Image
          src="/logos/linkedIn1.png"
          alt="LinkedIn"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={125}
        duration={22}
        delay={5.5}
      >
        <Image
          src="/logos/instal.png"
          alt="Instagram"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={125}
        duration={22}
        delay={11}
      >
        <Image
          src="/logos/chrome1.png"
          alt="Chrome"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={125}
        duration={22}
        delay={16.5}
      >
        <Image
          src="/logos/tt.png"
          alt="TikTok"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>

      {/* Outer Circles - Mobile */}
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={170}
        duration={25}
        delay={0}
        reverse
      >
        <Image
          src="/logos/claude1.png"
          alt="Claude"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={170}
        duration={25}
        delay={6.25}
        reverse
      >
        <Image
          src="/logos/doc1.png"
          alt="Google Docs"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={170}
        duration={25}
        delay={12.5}
        reverse
      >
        <Image
          src="/logos/gpt1.png"
          alt="ChatGPT"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[35px] border-none bg-transparent z-20"
        radius={170}
        duration={25}
        delay={18.75}
        reverse
      >
        <Image
          src="/logos/notion1.png"
          alt="Notion"
          width={35}
          height={35}
          className="object-contain"
        />
      </OrbitingCircles>
    </div>
  );
}

// Desktop Component
function DesktopOrbitingCircles() {
  return (
    <div className="relative hidden md:flex h-[500px] lg:h-[600px] w-full flex-col items-center justify-center overflow-hidden rounded-lg">
      <span className="pointer-events-none z-10 whitespace-pre-wrap bg-gradient-to-b from-black to-emerald-600 bg-clip-text text-center text-6xl lg:text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-black">
        Remalt
      </span>

      {/* Innermost Circles - Desktop */}
      <OrbitingCircles
        className="size-[40px] lg:size-[50px] border-none bg-transparent z-20"
        duration={15}
        delay={0}
        radius={50}
      >
        <Image
          src="/logos/gmail1.png"
          alt="Gmail"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[40px] lg:size-[50px] border-none bg-transparent z-20"
        duration={15}
        delay={7.5}
        radius={50}
      >
        <Image
          src="/logos/safari1.png"
          alt="Safari"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>

      {/* Inner Circles - Desktop */}
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        duration={18}
        delay={0}
        radius={130}
        reverse
      >
        <Image
          src="/logos/fb.png"
          alt="Facebook"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        duration={18}
        delay={6}
        radius={130}
        reverse
      >
        <Image
          src="/logos/yt1.png"
          alt="YouTube"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        duration={18}
        delay={12}
        radius={130}
        reverse
      >
        <Image
          src="/logos/x1.png"
          alt="X"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>

      {/* Middle Circles - Desktop */}
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={190}
        duration={22}
        delay={0}
      >
        <Image
          src="/logos/linkedIn1.png"
          alt="LinkedIn"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={190}
        duration={22}
        delay={5.5}
      >
        <Image
          src="/logos/instal.png"
          alt="Instagram"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={190}
        duration={22}
        delay={11}
      >
        <Image
          src="/logos/chrome1.png"
          alt="Chrome"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={190}
        duration={22}
        delay={16.5}
      >
        <Image
          src="/logos/tt.png"
          alt="TikTok"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>

      {/* Outer Circles - Desktop */}
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={250}
        duration={25}
        delay={0}
        reverse
      >
        <Image
          src="/logos/claude1.png"
          alt="Claude"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={250}
        duration={25}
        delay={6.25}
        reverse
      >
        <Image
          src="/logos/doc1.png"
          alt="Google Docs"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={250}
        duration={25}
        delay={12.5}
        reverse
      >
        <Image
          src="/logos/gpt1.png"
          alt="ChatGPT"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
      <OrbitingCircles
        className="size-[50px] border-none bg-transparent z-20"
        radius={250}
        duration={25}
        delay={18.75}
        reverse
      >
        <Image
          src="/logos/notion1.png"
          alt="Notion"
          width={50}
          height={50}
          className="object-contain"
        />
      </OrbitingCircles>
    </div>
  );
}

// Main Export Component
export function OrbitingCirclesDemo() {
  return (
    <>
      <MobileOrbitingCircles />
      <DesktopOrbitingCircles />
    </>
  );
}
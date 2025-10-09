import React, { useEffect } from "react";

export default function ViralScriptsSection() {
  useEffect(() => {
    // Load Instagram embed script
    const script = document.createElement("script");
    script.src = "//www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    // Process embeds if script already loaded
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    }

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Right Section - Heading */}
          <div className="flex flex-col items-center md:items-start justify-center md:order-2">
            <h2 className="md:text-5xl text-4xl font-bold flex flex-col md:leading-tight leading-tight">
              <span>Make</span>
              <span className="text-[#399152]">Viral Scripts</span>
              <span>in Minutes with </span>
              <span>Remalt</span>
            </h2>
          </div>

          {/* Left Section - Video */}
          <div className="flex justify-center md:justify-end md:order-1">
            <div className="relative w-full max-w-[280px] md:max-w-[320px]">
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl bg-black"
                style={{ aspectRatio: "9/16" }}
              >
                <video
                  className="absolute inset-0 w-full h-full cursor-pointer"
                  src="https://res.cloudinary.com/dghijk9rk/video/upload/v1759911978/Ackash_DM_Video_1_ekjkmt.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onClick={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.muted = !video.muted;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

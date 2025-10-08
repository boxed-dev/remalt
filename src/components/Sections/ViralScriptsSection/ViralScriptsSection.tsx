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
          {/* Left Section - Video */}
          <div className="flex justify-center md:justify-end">
            <div className="relative w-full max-w-[280px] md:max-w-[320px]">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black" style={{ aspectRatio: "9/16" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.tella.tv/video/cmghlktt2024w0bie0mog6pd7/embed?b=0&title=0&a=1&loop=1&t=0&muted=1&wt=0&autoplay=1"
                  allowFullScreen
                  allowTransparency
                  allow="autoplay"
                />
              </div>
            </div>
          </div>

          {/* Right Section - Heading */}
          <div className="flex flex-col items-start justify-center">
            <h2 className="md:text-5xl text-4xl font-bold flex flex-col md:leading-tight leading-tight">
              <span>Make</span>
              <span className="text-[#399152]">Viral Scripts</span>
              <span>in Minutes</span>
              <span>with</span>
              <span>AI Flow Chat</span>
            </h2>
            
            <div className="mt-8 flex flex-col gap-3">
              <span className="text-muted-foreground text-base font-medium">
                as seen on
              </span>
              <div className="flex items-center gap-3">
                {/* TikTok Icon */}
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 448 512"
                  className="w-10 h-10"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"></path>
                </svg>
                <span className="text-xl font-medium">and</span>
                {/* Instagram Icon */}
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 448 512"
                  className="w-10 h-10"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

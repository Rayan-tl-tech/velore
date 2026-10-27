import { useState, useEffect } from 'react';

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const scrollToSection = (id) => {
    const target = document.querySelector(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=1080&fit=crop"
          alt="Spring Summer 2026 collection"
          fetchPriority="high"
          className={`w-full h-full object-cover transform transition-[transform,opacity] duration-[1000ms] ease-out ${
            mounted ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-80'
          }`}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative h-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col justify-end pb-16 lg:pb-24">
        <div className="max-w-2xl">
          <p
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: '80ms',
            }}
            className={`text-white text-xs sm:text-sm tracking-[0.3em] uppercase mb-6 transform transition-[transform,opacity] duration-[550ms] ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Spring / Summer 2026
          </p>
          <h1
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: '160ms',
            }}
            className={`font-serif-display text-white text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.05] font-normal mb-10 transform transition-[transform,opacity] duration-[600ms] ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Quiet confidence,<br />
            made to be lived in.
          </h1>
          <button
            onClick={() => scrollToSection('#new-arrivals')}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: '240ms',
            }}
            className={`bg-white text-[#0A0A0A] px-8 py-4 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium hover:bg-white/90 hover:-translate-y-[1px] active:scale-[0.99] transition-all duration-150 inline-flex items-center gap-3 cursor-pointer transform ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Explore Collections
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: '320ms',
        }}
        className={`absolute bottom-8 right-8 lg:right-12 text-white text-xs tracking-[0.2em] transform transition-[transform,opacity] duration-[500ms] ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        V / 01
      </div>
    </section>
  );
}

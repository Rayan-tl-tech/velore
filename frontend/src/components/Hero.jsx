export default function Hero() {
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
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative h-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col justify-end pb-16 lg:pb-24">
        <div className="max-w-2xl">
          <p className="text-white text-xs sm:text-sm tracking-[0.3em] uppercase mb-6">
            Spring / Summer 2026
          </p>
          <h1 className="font-serif-display text-white text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.05] font-normal mb-10">
            Quiet confidence,<br />
            made to be lived in.
          </h1>
          <button
            onClick={() => scrollToSection('#new-arrivals')}
            className="bg-white text-[#0A0A0A] px-8 py-4 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-3 cursor-pointer"
          >
            Explore Collections
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 lg:right-12 text-white text-xs tracking-[0.2em]">
        V / 01
      </div>
    </section>
  );
}

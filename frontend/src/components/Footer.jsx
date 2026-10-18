export default function Footer() {
  const scrollToSection = (id) => {
    const target = document.querySelector(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0A0A0A] text-white pt-20 pb-8">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          <div>
            <h3 className="font-serif-display text-2xl tracking-[0.15em] mb-6">VÉLOR</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Contemporary clothing for women, men, and children. A fictional portfolio concept.
            </p>
          </div>

          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-6">Shop</h4>
            <ul className="space-y-4">
              {[
                { label: 'Women', href: '#women' },
                { label: 'Men', href: '#men' },
                { label: 'Kids', href: '#kids' },
                { label: 'New arrivals', href: '#new-arrivals' },
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-sm hover:text-white/70 transition-colors text-left cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-6">Information</h4>
            <ul className="space-y-4">
              {[
                { label: 'About VÉLOR', href: '#about' },
                { label: 'Contact', href: '#contact' },
                { label: 'Size guide', href: '#' },
                { label: 'Delivery & returns', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  {link.href === '#' ? (
                    <span className="text-sm text-white/60 cursor-default">{link.label}</span>
                  ) : (
                    <button
                      onClick={() => scrollToSection(link.href)}
                      className="text-sm hover:text-white/70 transition-colors text-left cursor-pointer"
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-6">Follow</h4>
            <ul className="space-y-4">
              <li><span className="text-sm text-white/60">@velor_fashion</span></li>
              <li><span className="text-sm text-white/60">Instagram</span></li>
              <li><span className="text-sm text-white/60">TikTok</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/50">
          <p>© 2026 VÉLOR — Fictional portfolio project</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Terms</span>
            <span>Algeria / DA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

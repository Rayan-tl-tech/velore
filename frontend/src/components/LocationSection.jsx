import { MapPin } from 'lucide-react';

export default function LocationSection() {
  return (
    <section className="relative py-24 lg:py-32 bg-[#F7F6F2] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0A0A0A" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0A0A0A] mb-8 shadow-md">
          <MapPin size={24} strokeWidth={1.5} className="text-white" />
        </div>
        <p className="text-xs tracking-[0.3em] uppercase mb-6 text-[#555]">VÉLOR / Store</p>
        <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal mb-6 text-[#0A0A0A]">
          Localisation à venir
        </h2>
        <p className="text-base text-[#666] max-w-xl mx-auto leading-relaxed">
          L'adresse de notre espace sera prochainement disponible ici.
        </p>
      </div>
    </section>
  );
}

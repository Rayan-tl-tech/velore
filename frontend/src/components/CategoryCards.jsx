const categories = [
  {
    name: 'Men',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop',
    href: '#men',
  },
  {
    name: 'Women',
    image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800&h=1000&fit=crop',
    href: '#women',
  },
  {
    name: 'Kids',
    image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=1000&fit=crop',
    href: '#kids',
  },
];

export default function CategoryCards() {
  const handleClick = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-[#F7F6F2] py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-12 lg:mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Shop by World</p>
          <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal">
            Made for every day.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {categories.map((cat) => (
            <a
              key={cat.name}
              href={cat.href}
              onClick={(e) => handleClick(e, cat.href)}
              className="group relative aspect-[3/4] overflow-hidden bg-[#E8E8E8] cursor-pointer"
            >
              <img
                src={cat.image}
                alt={`${cat.name} collection`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 p-6 lg:p-10 flex flex-col justify-end">
                <div className="flex items-end justify-between">
                  <h3 className="font-serif-display text-white text-4xl lg:text-5xl font-normal">
                    {cat.name}
                  </h3>
                  <span className="text-white text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2">
                    Shop Collection <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

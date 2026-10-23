import { useState, useEffect } from 'react';
import { getAllCategories } from '../services/api/categoryService';

const presetImages = {
  men: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop',
  women: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800&h=1000&fit=crop',
  kids: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=1000&fit=crop',
  shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop',
  shoose: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop',
  accessories: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&h=1000&fit=crop',
  bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1000&fit=crop',
  jewelry: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=1000&fit=crop',
};

const defaultFallback = 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=1000&fit=crop';

export default function CategoryCards({ categories: externalCategories, products = [] }) {
  const [categories, setCategories] = useState(
    Array.isArray(externalCategories) && externalCategories.length > 0
      ? externalCategories
      : [
          { name: 'Men', _id: 'men' },
          { name: 'Women', _id: 'women' },
          { name: 'Kids', _id: 'kids' },
        ]
  );

  useEffect(() => {
    if (Array.isArray(externalCategories) && externalCategories.length > 0) {
      setCategories(externalCategories);
    } else {
      getAllCategories()
        .then((live) => {
          if (Array.isArray(live) && live.length > 0) {
            setCategories(live);
          }
        })
        .catch(() => {});
    }
  }, [externalCategories]);

  const handleClick = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getCategoryImage = (catName, catId) => {
    const key = (catName || '').toLowerCase().trim();
    if (presetImages[key]) return presetImages[key];

    // Check if any product in this category has an image
    const matchingProduct = products.find((p) => {
      const pCatName = typeof p.category === 'object' ? p.category?.name : p.category;
      const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
      return (
        (pCatName && pCatName.toLowerCase() === key) ||
        (pCatId && String(pCatId) === String(catId))
      );
    });

    if (matchingProduct?.image && matchingProduct.image.startsWith('http')) {
      return matchingProduct.image;
    }

    return defaultFallback;
  };

  return (
    <section id="categories" className="bg-[#F7F6F2] py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-12 lg:mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Shop by World</p>
          <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal">
            Made for every day.
          </h2>
        </div>

        <div
          className={`grid gap-4 lg:gap-6 ${
            categories.length <= 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {categories.map((cat) => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            const catId = typeof cat === 'object' ? cat._id : cat;
            const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const image = getCategoryImage(catName, catId);
            const href = `#${slug}`;

            return (
              <a
                key={catId || catName}
                href={href}
                onClick={(e) => handleClick(e, href)}
                className="group relative aspect-[3/4] overflow-hidden bg-[#E8E8E8] cursor-pointer"
              >
                <img
                  src={image}
                  alt={`${catName} collection`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.target.src = defaultFallback;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 p-6 lg:p-10 flex flex-col justify-end">
                  <div className="flex items-end justify-between">
                    <h3 className="font-serif-display text-white text-3xl sm:text-4xl lg:text-5xl font-normal capitalize">
                      {catName}
                    </h3>
                    <span className="text-white text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2">
                      Shop Collection <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

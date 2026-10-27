import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import CategoryCards from '../components/CategoryCards';
import CollectionSection from '../components/CollectionSection';
import LocationSection from '../components/LocationSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ui/ScrollReveal';
import { products } from '../data/products';
import { getAllProducts } from '../services/api/productService';
import { getAllCategories } from '../services/api/categoryService';

/**
 * HomePage — Storefront landing page displaying the brand hero, category shortcuts,
 * dynamic product collections (Men, Women, Kids, New Arrivals), Maison VÉLOR story,
 * boutique location, contact information, and navigation footer.
 */
export default function HomePage({
  onProductClick,
  onOpenOrders,
  onOpenFavorites,
  onOpenProfile,
  onShowToast,
}) {
  const [catalog, setCatalog] = useState(products);
  const [categories, setCategories] = useState([
    { name: 'Men', _id: 'men' },
    { name: 'Women', _id: 'women' },
    { name: 'Kids', _id: 'kids' },
  ]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getAllProducts().catch(() => []),
      getAllCategories().catch(() => []),
    ]).then(([liveProducts, liveCategories]) => {
      if (!active) return;

      if (Array.isArray(liveCategories) && liveCategories.length > 0) {
        setCategories(liveCategories);
      }

      if (Array.isArray(liveProducts) && liveProducts.length > 0) {
        // Merge preset details with all live products from MongoDB
        const combined = liveProducts.map((liveItem) => {
          const preset = products.find(
            (p) => p.name?.toLowerCase().trim() === liveItem.name?.toLowerCase().trim()
          );
          return {
            ...preset,
            ...liveItem,
            _id: liveItem._id || preset?._id,
            price: liveItem.price ?? preset?.price,
            stock: liveItem.stock ?? preset?.stock,
            image: liveItem.image || preset?.image,
            category: liveItem.category || preset?.category,
          };
        });
        setCatalog(combined);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const newArrivals = catalog.filter((p) => p.collection === 'new-arrivals');

  return (
    <div className="min-h-screen bg-white">
      <Header
        onOpenOrders={onOpenOrders}
        onOpenFavorites={onOpenFavorites}
        onOpenProfile={onOpenProfile}
      />

      <main>
        <Hero />

        <ScrollReveal>
          <CategoryCards categories={categories} products={catalog} />
        </ScrollReveal>

        <section id="new-arrivals">
          <ScrollReveal>
            <CollectionSection
              label="Fresh Perspective"
              title="New arrivals"
              products={newArrivals}
              onProductClick={onProductClick}
              onShowToast={onShowToast}
            />
          </ScrollReveal>
        </section>

        {/* Dynamic Category Collections (Men, Women, Kids, and any new categories from MongoDB) */}
        {categories.map((cat, index) => {
          const catName = typeof cat === 'object' ? cat.name : cat;
          const catId = typeof cat === 'object' ? cat._id : cat;
          const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          const catProducts = catalog.filter((p) => {
            const pCatName = typeof p.category === 'object' ? p.category?.name : p.category;
            const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
            return (
              (pCatName && pCatName.toLowerCase() === catName.toLowerCase()) ||
              (pCatId && String(pCatId) === String(catId)) ||
              (p.collection && p.collection.toLowerCase() === catName.toLowerCase())
            );
          });

          const isEven = index % 2 === 0;

          return (
            <section
              key={catId || catName}
              id={slug}
              className={isEven ? 'bg-[#F7F6F2]' : 'bg-white'}
            >
              <ScrollReveal>
                <CollectionSection
                  label={`Collection / 0${index + 1}`}
                  title={`${catName.charAt(0).toUpperCase() + catName.slice(1)} collection`}
                  description={`Clean proportions, practical layers, and everyday pieces from our ${catName.toLowerCase()} collection.`}
                  products={catProducts}
                  onProductClick={onProductClick}
                  onShowToast={onShowToast}
                />
              </ScrollReveal>
            </section>
          );
        })}

        {/* Section: About VÉLOR */}
        <ScrollReveal as="section" id="about" className="py-24 lg:py-32 bg-white border-t border-[#E8E8E8]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Maison VÉLOR</p>
                <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal mb-8 leading-[1.1]">
                  Crafted for life,<br />defined by nuance.
                </h2>
                <p className="text-base text-[#555] leading-relaxed mb-6">
                  VÉLOR is a contemporary fashion house built around the philosophy of quiet luxury and architectural ease. Each garment is engineered from responsibly sourced fibers to deliver tactile refinement and longevity.
                </p>
                <p className="text-base text-[#555] leading-relaxed">
                  Conceived as a dedicated portfolio concept, our collections bridge Mediterranean warmth with modern international tailoring, celebrating intentional wardrobe curation for every generation.
                </p>
              </div>
              <div className="aspect-[4/3] bg-[#E8E8E8] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=900&fit=crop"
                  alt="VÉLOR Studio & Craft"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <LocationSection />
        </ScrollReveal>

        <ScrollReveal>
          <ContactSection />
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
}

import ProductCard from './ProductCard';

export default function CollectionSection({
  label,
  title,
  description,
  products,
  onProductClick,
  onShowToast,
}) {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-12 lg:mb-16 max-w-3xl">
          {label && (
            <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">{label}</p>
          )}
          <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal mb-6">
            {title}
          </h2>
          {description && (
            <p className="text-base lg:text-lg text-[#555] leading-relaxed">{description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-10 lg:gap-y-14">
          {(products || []).length > 0 ? (
            products.map((product, idx) => (
              <ProductCard
                key={product._id || product.id}
                product={product}
                index={idx}
                onProductClick={onProductClick}
                onShowToast={onShowToast}
              />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-[#777] italic bg-black/[0.02] border border-dashed border-[#DDD]">
              Pieces for this collection will be unveiled shortly.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { Search } from 'lucide-react';

/**
 * SearchFilter — Search bar + category pills + product count.
 * @param {string} searchQuery - Current search input value
 * @param {function} onSearchChange - Called on input change
 * @param {function} onSearchSubmit - Called on form submit / button click
 * @param {string} activeCategory - Currently selected category ID or 'all'
 * @param {function} onCategoryChange - Called with category id or 'all'
 * @param {Array} categories - Array of category objects {_id, name} from backend
 * @param {number} productCount - Number of visible products
 */
export default function SearchFilter({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  activeCategory,
  onCategoryChange,
  categories,
  productCount,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              id="product-search"
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-5 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>
          <button
            type="submit"
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* "All Products" pill */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
            }`}
          >
            All Products
          </button>

          {/* Dynamic categories from backend */}
          {(Array.isArray(categories) ? categories : []).map((cat) => (
            <button
              key={cat._id}
              onClick={() => onCategoryChange(cat._id)}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all capitalize ${
                activeCategory === cat._id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Result count */}
        <p className="text-gray-900 font-semibold text-lg">
          {productCount} {productCount === 1 ? 'product' : 'products'}
        </p>
      </div>
    </section>
  );
}

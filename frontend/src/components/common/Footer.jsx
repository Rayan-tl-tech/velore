import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Footer({ onGoHome, onGoShop, onOpenOrders, onOpenProfile, onOpenAuth }) {
  const { isAuthenticated } = useAuth();
  const { openBag } = useCart();

  const handleLinkClick = (item) => {
    switch (item) {
      case 'Shop':
        onGoShop?.();
        break;
      case 'Cart':
      case 'Bag':
        openBag?.();
        break;
      case 'Orders':
        if (isAuthenticated) {
          onOpenOrders?.();
        } else {
          onOpenAuth?.();
        }
        break;
      case 'Profile':
        if (isAuthenticated) {
          onOpenProfile?.();
        } else {
          onOpenAuth?.();
        }
        break;
      default:
        onGoShop?.();
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <button
            onClick={onGoHome}
            className="flex items-center space-x-3 text-left group focus:outline-none"
          >
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20">
              <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 block tracking-tight">Shopify</span>
              <span className="text-gray-400 text-xs">Your premium online shopping destination.</span>
            </div>
          </button>

          {/* Nav Links */}
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {['Shop', 'Cart', 'Orders', 'Profile'].map((link) => (
              <button
                key={link}
                onClick={() => handleLinkClick(link)}
                className="text-gray-500 hover:text-indigo-600 font-medium text-sm transition-colors cursor-pointer"
              >
                {link}
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} Shopify Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-600 cursor-pointer">Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

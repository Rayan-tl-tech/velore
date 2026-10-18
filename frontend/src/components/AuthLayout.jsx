import { Link } from 'react-router-dom';

export default function AuthLayout({ children, imageSrc, imageAlt }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F6F2]">
      <div className="relative lg:w-1/2 lg:h-screen hidden lg:block">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-12 left-12 text-white">
          <p className="text-xs tracking-[0.3em] uppercase mb-4">VÉLOR / Private Space</p>
          <h2 className="font-serif-display text-5xl xl:text-6xl leading-[1.05] font-normal">
            Your wardrobe,<br />considered.
          </h2>
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col">
        <div className="flex items-center justify-between px-8 lg:px-16 py-6">
          <Link
            to="/"
            className="text-sm text-[#666] hover:text-[#0A0A0A] transition-colors inline-flex items-center gap-2"
          >
            <span aria-hidden="true">←</span> Return to store
          </Link>
          <Link
            to="/"
            className="bg-[#0A0A0A] text-white px-8 py-3 text-sm tracking-[0.15em] font-serif-display hover:bg-[#333333] transition-colors"
          >
            VÉLOR
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

        <div className="px-8 lg:px-16 pb-8 text-center">
          <p className="text-xs text-[#999]">
            Fictional portfolio interface — secure authentication & delivery.
          </p>
        </div>
      </div>
    </div>
  );
}

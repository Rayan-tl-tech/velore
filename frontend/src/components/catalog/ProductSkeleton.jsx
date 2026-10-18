export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-square bg-gray-200" />
      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded-full w-1/3" />
        <div className="h-5 bg-gray-200 rounded-full w-3/4" />
        <div className="h-4 bg-gray-200 rounded-full w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-7 bg-gray-200 rounded-full w-1/4" />
          <div className="h-9 bg-gray-200 rounded-lg w-28" />
        </div>
      </div>
    </div>
  );
}

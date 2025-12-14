export default function ListingCardSkeleton() {
  return (
    <div className="block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] bg-gray-300" />

      {/* Content Skeleton */}
      <div className="p-4">
        {/* Price Skeleton */}
        <div className="mb-2">
          <div className="h-8 bg-gray-300 rounded w-3/4 mb-1" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>

        {/* Title Skeleton */}
        <div className="h-6 bg-gray-300 rounded mb-2" />
        <div className="h-6 bg-gray-300 rounded w-2/3 mb-3" />

        {/* Location Skeleton */}
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />

        {/* Features Skeleton */}
        <div className="flex items-center gap-4 border-t border-gray-200 pt-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

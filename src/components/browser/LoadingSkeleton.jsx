/**
 * Loading Skeleton Component
 * Animated placeholder for loading cards
 */

const LoadingSkeleton = () => {
  return (
    <div className="card-container flex-shrink-0">
      {/* Square Card Wrapper with Fixed Dimensions */}
      <div className="w-64 h-64 relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Animated skeleton content */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center w-full h-full flex flex-col items-center justify-center space-y-4">
            {/* Title skeleton */}
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            
            {/* Content skeleton lines */}
            <div className="w-full space-y-2">
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="w-5/6 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="w-4/6 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            {/* Bottom skeleton */}
            <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Tags skeleton (Bottom Corner) */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <div className="w-12 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        </div>

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/20 dark:to-gray-900/20 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;

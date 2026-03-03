/**
 * Pagination Component
 * Compact bottom bar for navigating paginated card results.
 */

const Pagination = ({ pagination, onPageChange, onPageSizeChange, isLoading = false }) => {
  const { currentPage, totalPages, totalCount, pageSize, hasNextPage, hasPreviousPage } = pagination;

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const pages = [];
    if (start > 1) { pages.push(1); if (start > 2) pages.push("…"); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push("…"); pages.push(totalPages); }
    return pages;
  };

  if (totalCount === 0) return null;

  return (
    <nav
      className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 shadow-lg"
      aria-label="Pagination"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Count */}
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {totalCount.toLocaleString()} cards
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Per page */}
          <select
            value={pageSize}
            onChange={(e) => !isLoading && onPageSizeChange(parseInt(e.target.value))}
            disabled={isLoading}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-1.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Cards per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />

          {/* Prev */}
          <button
            onClick={() => hasPreviousPage && !isLoading && onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage || isLoading}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            ‹
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5">
            {getPageNumbers().map((page, i) => (
              <button
                key={i}
                onClick={() => typeof page === "number" && !isLoading && onPageChange(page)}
                disabled={isLoading || page === "…"}
                className={`min-w-[28px] px-1.5 py-1 text-xs rounded-md transition-colors ${
                  page === currentPage
                    ? "bg-blue-600 text-white font-medium"
                    : page === "…"
                    ? "text-gray-400 cursor-default"
                    : "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                }`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => hasNextPage && !isLoading && onPageChange(currentPage + 1)}
            disabled={!hasNextPage || isLoading}
            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Pagination;

/**
 * Empty State Component
 * Reusable component for displaying "no data" states with optional action button
 * 
 * Eliminates ~120 lines of duplicated empty state code across the application
 */

const EmptyState = ({
  icon = 'document', // 'document', 'template', 'cards', 'custom'
  customIcon = null,
  title,
  message,
  actionButton = null, // { text, onClick, variant }
  className = ''
}) => {
  // Predefined icons
  const icons = {
    document: (
      <svg className="w-12 h-12 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    template: (
      <svg className="w-12 h-12 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
      </svg>
    ),
    cards: (
      <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  };

  const displayIcon = customIcon || icons[icon] || icons.document;

  // Button variant styles
  const buttonVariants = {
    primary: 'px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200',
    secondary: 'px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors duration-200'
  };

  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="inline-block bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
        {displayIcon}
      </div>
      
      {title && (
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          {title}
        </h3>
      )}
      
      {message && (
        <p className="text-gray-500 dark:text-gray-400 mb-6 mx-auto max-w-md">
          {message}
        </p>
      )}
      
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className={buttonVariants[actionButton.variant || 'primary']}
        >
          {actionButton.text}
        </button>
      )}
    </div>
  );
};

export default EmptyState;


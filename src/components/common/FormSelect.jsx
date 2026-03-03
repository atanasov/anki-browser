/**
 * Form Select Component
 * Reusable select dropdown with consistent styling and behavior
 * 
 * Supports single selection with labels and error states
 */

const FormSelect = ({
  id,
  label,
  value,
  onChange,
  options = [], // Array of { value, label } or array of strings
  placeholder = 'Select an option...',
  required = false,
  disabled = false,
  error = '',
  className = '',
  selectClassName = '',
  labelClassName = ''
}) => {
  const baseSelectClasses = `w-full border-2 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
    error 
      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500'
  }`;

  // Normalize options to { value, label } format
  const normalizedOptions = options.map(option => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return option;
  });

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`${baseSelectClasses} ${selectClassName}`}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormSelect;


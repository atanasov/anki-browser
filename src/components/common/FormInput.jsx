/**
 * Form Input Component
 * Reusable input field with consistent styling and behavior
 * 
 * Supports text, textarea, and number inputs with labels and error states
 */

const FormInput = ({
  id,
  label,
  type = 'text', // 'text', 'textarea', 'number', 'password'
  value,
  onChange,
  onBlur,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  rows = 4, // for textarea
  className = '',
  inputClassName = '',
  labelClassName = ''
}) => {
  const baseInputClasses = `w-full border-2 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
    error 
      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500'
  }`;

  const textareaClasses = `${baseInputClasses} font-mono text-sm`;

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
      
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${textareaClasses} ${inputClassName}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${baseInputClasses} ${inputClassName}`}
        />
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;


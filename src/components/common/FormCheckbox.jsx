/**
 * Form Checkbox Component
 * Reusable checkbox with consistent styling and behavior
 */

const FormCheckbox = ({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  labelClassName = ''
}) => {
  return (
    <label 
      htmlFor={id}
      className={`flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
      />
      <span className={`ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 ${labelClassName}`}>
        {label}
      </span>
    </label>
  );
};

export default FormCheckbox;


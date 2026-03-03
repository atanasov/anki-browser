/**
 * Flag Component
 * Displays a colored circle representing an Anki flag
 * Shows flag name as tooltip on hover
 */

const Flag = ({ color, name, size = 'md' }) => {
  // Size variants
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${color}`}
      title={name}
      aria-label={name}
    />
  );
};

export default Flag;


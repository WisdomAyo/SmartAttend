// frontends/src/components/ui/loading-spinner.tsx

import React from 'react';

// Define props interface if you need size, color variations
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// Component for a simple animated loading spinner using Tailwind CSS
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', className = '' }) => {
  // Determine size based on prop
  const spinnerSize = size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-8 w-8' : 'h-6 w-6';

  return (
    // Spinner animation using a border and tailwind's animate-spin utility
    <div
      className={`inline-block ${spinnerSize} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
      role="status" // ARIA role for accessibility
      aria-label="loading" // ARIA label for screen readers
    >
      <span className="sr-only">Loading...</span> {/* Screen reader text */}
    </div>
  );
};

export { LoadingSpinner };
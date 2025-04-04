import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Reusable back button component with consistent styling
 * @param {Object} props
 * @param {string} props.to - Optional specific route to navigate to
 * @param {string} props.defaultRoute - Default route to use if no history or 'to' prop
 * @param {string} props.label - Button label text
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactNode}
 */
const BackButton = ({ 
  to,
  defaultRoute = '/production/guides',
  label = 'Back',
  className = ''
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      // Try to go back in history, or default to the provided route
      try {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate(defaultRoute);
        }
      } catch (e) {
        // If any issue occurs, navigate to the default route
        navigate(defaultRoute);
      }
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors ${className}`}
      aria-label={label}
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
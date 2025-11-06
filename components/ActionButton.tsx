
import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

const ActionButton: React.FC<ActionButtonProps> = ({ children, variant = 'primary', ...props }) => {
  const baseClasses = 'w-full flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-gray disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-brand-green text-black hover:bg-opacity-90 focus:ring-brand-green',
    secondary: 'bg-brand-light-gray text-white hover:bg-opacity-80 focus:ring-brand-light-gray',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
      {children}
    </button>
  );
};

export default ActionButton;

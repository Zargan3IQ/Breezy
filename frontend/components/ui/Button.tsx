import React from 'react';

// 1. Define the custom props we want, AND inherit all standard HTML button props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '', // Allow adding extra custom classes if needed
  disabled,
  ...props // Catch any other standard props like onClick or type="submit"
}: ButtonProps) {
  
  // 2. Map out the styles for different variants
  const baseStyles = "inline-flex items-center justify-center font-bold rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-teal-600 hover:bg-teal-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    ghost: "bg-transparent hover:bg-teal-50 text-teal-600",
    danger: "bg-transparent hover:bg-red-50 text-red-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  // 3. Combine them all together
  const classes = `
    ${baseStyles} 
    ${variants[variant]} 
    ${sizes[size]} 
    ${fullWidth ? 'w-full' : ''} 
    ${className}
  `;

  return (
    <button className={classes.trim()} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
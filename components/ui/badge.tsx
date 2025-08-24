import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = 'default', size = 'md', ...props }, ref) => {
    let variantClasses = "";
    let sizeClasses = "";
    
    switch (variant) {
      case 'secondary':
        variantClasses = "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200";
        break;
      case 'destructive':
        variantClasses = "border-transparent bg-red-500 text-white hover:bg-red-600";
        break;
      case 'outline':
        variantClasses = "border-gray-300 text-gray-700";
        break;
      case 'success':
        variantClasses = "border-transparent bg-green-500 text-white hover:bg-green-600";
        break;
      default:
        variantClasses = "border-transparent bg-blue-500 text-white hover:bg-blue-600";
    }

    switch (size) {
      case 'sm':
        sizeClasses = "px-2 py-0.5 text-xs";
        break;
      case 'lg':
        sizeClasses = "px-3 py-1 text-sm";
        break;
      default:
        sizeClasses = "px-2.5 py-0.5 text-xs";
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
import { LucideIcon } from "lucide-react";
import { ReactNode, isValidElement } from "react";

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = "" 
}: EmptyStateProps) => {
  // Determine how to render the icon
  const renderIcon = () => {
    // If it's already a valid React element (JSX), render it directly
    if (isValidElement(Icon)) {
      return Icon;
    }
    
    // If it's a component function (like LucideIcon), render it as a component
    if (typeof Icon === 'function') {
      const IconComponent = Icon as LucideIcon;
      return <IconComponent className="w-10 h-10 text-muted-foreground" />;
    }
    
    // Fallback - shouldn't happen but prevents errors
    return null;
  };
  
  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
      role="status"
    >
      <div 
        className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        {renderIcon()}
      </div>
      <p className="text-muted-foreground text-center font-medium">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground text-center mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;

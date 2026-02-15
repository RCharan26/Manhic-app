import { ReactNode } from "react";

interface BottomPanelProps {
  children: ReactNode;
  className?: string;
  showDragIndicator?: boolean;
}

const BottomPanel = ({ 
  children, 
  className = "",
  showDragIndicator = true 
}: BottomPanelProps) => {
  return (
    <div 
      className={`bg-card rounded-t-3xl -mt-6 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] ${className}`}
      role="region"
    >
      {showDragIndicator && (
        <div 
          className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-4" 
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};

export default BottomPanel;

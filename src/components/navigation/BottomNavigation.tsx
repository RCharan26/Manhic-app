import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

interface BottomNavigationProps {
  items: NavItem[];
  className?: string;
}

const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(
  ({ items, className = "" }, ref) => {
    const location = useLocation();

    return (
      <nav 
        ref={ref}
        className={cn(
          "border-t border-border/50 px-3 py-1.5 safe-area-inset fixed bottom-0 left-0 right-0 z-[999] bg-card/95 backdrop-blur-sm shadow-lg",
          className
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex justify-around items-center gap-1 max-w-lg mx-auto">
          {items.map((item, index) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95"
                )}
                aria-current={isActive ? "page" : undefined}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "relative transition-transform duration-200",
                  isActive && "scale-110"
                )}>
                  <item.icon 
                    className={cn(
                      "w-5 h-5 transition-all",
                      isActive && "drop-shadow-sm"
                    )} 
                    aria-hidden="true" 
                  />
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-scale-in" />
                  )}
                </div>
                <span className={cn(
                  "text-[8px] mt-0.5 font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                {/* Active background highlight */}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/5 rounded-xl -z-10" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }
);

BottomNavigation.displayName = "BottomNavigation";

export default BottomNavigation;

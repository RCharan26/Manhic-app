import { forwardRef, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
}

const MobileLayout = forwardRef<HTMLDivElement, MobileLayoutProps>(
  (
    {
      children,
      showHeader = false,
      headerTitle,
      showBackButton = false,
      onBack,
      headerRight,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="min-h-screen bg-background flex flex-col safe-area-inset"
      >
        {showHeader && (
          <header className="sticky top-0 z-50 glass border-b border-border/50">
            <div className="flex items-center justify-between h-14 px-4">
              <div className="flex items-center">
                {showBackButton && (
                  <button
                    onClick={onBack}
                    className="mr-3 p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="w-6 h-6 text-foreground" />
                  </button>
                )}
                {headerTitle && (
                  <h1 className="text-lg font-semibold text-foreground">
                    {headerTitle}
                  </h1>
                )}
              </div>
              {headerRight && (
                <div className="flex items-center">{headerRight}</div>
              )}
            </div>
          </header>
        )}
        <main className="flex-1 flex flex-col animate-fade-in pb-20">{children}</main>
      </div>
    );
  }
);

MobileLayout.displayName = "MobileLayout";

export default MobileLayout;

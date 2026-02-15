import { Battery, CircleDot, Fuel, Key, Truck, Wrench, LucideIcon, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status/StatusBadge";
import { formatINR } from "@/lib/utils";

const serviceIcons: Record<string, LucideIcon> = {
  battery: Battery,
  tire: CircleDot,
  fuel: Fuel,
  lockout: Key,
  towing: Truck,
  other: Wrench,
};

interface ServiceCardProps {
  id: string;
  serviceType: string;
  status: string;
  date: string;
  cost: number | null;
  onClick?: () => void;
  showAction?: boolean;
  actionLabel?: string;
  onActionClick?: () => void;
}

const ServiceCard = ({
  id,
  serviceType,
  status,
  date,
  cost,
  onClick,
  showAction,
  actionLabel,
  onActionClick,
}: ServiceCardProps) => {
  const Icon = serviceIcons[serviceType] || Wrench;

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isClickable = !!onClick;

  return (
    <article
      className={`bg-card border border-border rounded-xl p-4 transition-colors ${
        isClickable ? "cursor-pointer hover:border-primary/50" : ""
      }`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
      aria-label={`${serviceType} service - ${status}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="font-semibold capitalize truncate">{serviceType} Service</p>
              <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
            <span className="font-semibold">
              {cost != null ? formatINR(cost) : "--"}
            </span>
            {showAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onActionClick?.();
                }}
                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                aria-label={actionLabel}
              >
                <span className="text-sm font-medium">{actionLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;

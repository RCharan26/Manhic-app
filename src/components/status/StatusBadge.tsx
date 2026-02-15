import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, Clock, Truck, MapPin, Wrench, X, Loader2 } from "lucide-react";

const statusBadgeVariants = cva(
  "text-xs px-3 py-1.5 rounded-full font-semibold capitalize inline-flex items-center gap-1.5 transition-all",
  {
    variants: {
      variant: {
        completed: "bg-success/10 text-success border border-success/20",
        cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
        pending: "bg-warning/10 text-warning border border-warning/20",
        accepted: "bg-info/10 text-info border border-info/20",
        en_route: "bg-info/10 text-info border border-info/20",
        arrived: "bg-primary/10 text-primary border border-primary/20",
        in_progress: "bg-primary/10 text-primary border border-primary/20",
        default: "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type StatusVariant = "completed" | "cancelled" | "pending" | "accepted" | "en_route" | "arrived" | "in_progress" | "default";

const statusIcons: Record<StatusVariant, React.ReactNode> = {
  completed: <Check className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
  accepted: <Check className="w-3 h-3" />,
  en_route: <Truck className="w-3 h-3" />,
  arrived: <MapPin className="w-3 h-3" />,
  in_progress: <Wrench className="w-3 h-3 animate-pulse" />,
  default: <Loader2 className="w-3 h-3" />,
};

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: string;
  className?: string;
  showIcon?: boolean;
}

const StatusBadge = ({ status, className, showIcon = true }: StatusBadgeProps) => {
  const variant = (["completed", "cancelled", "pending", "accepted", "en_route", "arrived", "in_progress"].includes(status) 
    ? status 
    : "default") as StatusVariant;

  return (
    <span 
      className={cn(statusBadgeVariants({ variant }), className)}
      role="status"
    >
      {showIcon && statusIcons[variant]}
      {status.replace(/_/g, " ")}
    </span>
  );
};

export { StatusBadge, statusBadgeVariants };

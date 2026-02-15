import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import BottomNavigation, { NavItem } from "@/components/navigation/BottomNavigation";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import EmptyState from "@/components/empty/EmptyState";
import ServiceCard from "@/components/cards/ServiceCard";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { Home, History, MessageSquare, User } from "lucide-react";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

interface ServiceHistoryItem {
  id: string;
  service_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
}

const filterOptions = ["All", "Completed", "Cancelled", "In Progress"];

const customerNavItems: NavItem[] = [
  { icon: Home, label: "Home", to: "/customer-dashboard" },
  { icon: History, label: "History", to: "/service-history" },
  { icon: MessageSquare, label: "Messages", to: "/messaging" },
  { icon: User, label: "Profile", to: "/settings" },
];

const ServiceHistory = () => {
  const navigate = useNavigate();
  const { userId, isLoaded } = useClerkAuthContext();
  const { getToken } = useAuth();
  const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    if (isLoaded && !userId) {
      navigate("/login");
    }
  }, [userId, isLoaded, navigate]);

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      try {
        const token = await getToken();
        
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-service-request`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const result = await response.json();
        let data = result.data || [];

        // Filter based on active filter
        if (activeFilter === "Completed") {
          data = data.filter((item: ServiceHistoryItem) => item.status === "completed");
        } else if (activeFilter === "Cancelled") {
          data = data.filter((item: ServiceHistoryItem) => item.status === "cancelled");
        } else if (activeFilter === "In Progress") {
          data = data.filter((item: ServiceHistoryItem) => 
            ["pending", "accepted", "en_route", "arrived", "in_progress"].includes(item.status)
          );
        }

        setHistory(data);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId, activeFilter, getToken]);

  const handleServiceClick = (service: ServiceHistoryItem) => {
    if (["pending", "accepted", "en_route", "arrived", "in_progress"].includes(service.status)) {
      navigate("/request-tracking", { state: { requestId: service.id } });
    }
  };

  const handleRateClick = (serviceId: string) => {
    navigate("/rating-review", { state: { requestId: serviceId } });
  };

  return (
    <>
      <MobileLayout showHeader headerTitle="Service History" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 flex flex-col">
        <div className="px-4 py-4 flex-1 overflow-y-auto">
          {/* Filter tabs */}
          <nav className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4" role="tablist" aria-label="Filter services">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                role="tab"
                aria-selected={activeFilter === filter}
                aria-controls="service-list"
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filter}
              </button>
            ))}
          </nav>

          {/* Service history list */}
          <div id="service-list" role="tabpanel">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : history.length > 0 ? (
              <ul className="space-y-3">
                {history.map((service) => (
                  <li key={service.id}>
                    <div className="relative">
                      <ServiceCard
                        id={service.id}
                        serviceType={service.service_type}
                        status={service.status}
                        date={service.created_at}
                        cost={service.final_cost || service.estimated_cost}
                        onClick={() => handleServiceClick(service)}
                        showAction={service.status === "completed" || ["pending", "accepted", "en_route", "arrived", "in_progress"].includes(service.status)}
                        actionLabel={service.status === "completed" ? "Rate" : "Track"}
                        onActionClick={() => 
                          service.status === "completed" 
                            ? handleRateClick(service.id) 
                            : handleServiceClick(service)
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={History}
                title="No service history found"
                action={
                  <Link to="/service-request" className="text-primary hover:underline">
                    Request your first service
                  </Link>
                }
              />
            )}
          </div>
        </div>
        </div>
      </MobileLayout>

      {/* Bottom navigation - rendered outside MobileLayout */}
      <BottomNavigation items={customerNavItems} />
    </>
  );
};

export default ServiceHistory;

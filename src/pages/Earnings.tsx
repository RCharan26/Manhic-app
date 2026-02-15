import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import BottomNavigation, { NavItem } from "@/components/navigation/BottomNavigation";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import EmptyState from "@/components/empty/EmptyState";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { formatDirectINR, convertToINR } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { 
  Home, DollarSign, MessageSquare, User, TrendingUp, 
  Calendar, ArrowUpRight, Clock, RefreshCw, AlertCircle
} from "lucide-react";

interface CompletedJob {
  id: string;
  service_type: string;
  final_cost: number | string | null;
  completed_at: string;
}

interface EarningsData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  pending: number;
  todayJobs: number;
  weekJobs: number;
  monthJobs: number;
}

const mechanicNavItems: NavItem[] = [
  { icon: Home, label: "Home", to: "/mechanic-dashboard" },
  { icon: DollarSign, label: "Earnings", to: "/earnings" },
  { icon: MessageSquare, label: "Messages", to: "/messaging" },
  { icon: User, label: "Profile", to: "/settings" },
];

const Earnings = () => {
  const navigate = useNavigate();
  const { userId, isLoaded } = useClerkAuthContext();
  type PeriodType = "today" | "week" | "month";
  const [activePeriod, setActivePeriod] = useState<PeriodType>("today");
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    todayJobs: 0,
    weekJobs: 0,
    monthJobs: 0,
  });
  const [recentJobs, setRecentJobs] = useState<CompletedJob[]>([]);
  const [allCompletedJobs, setAllCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    if (isLoaded && !userId) {
      navigate("/login");
    }
  }, [userId, isLoaded, navigate]);

  const { getToken } = useAuth();

  const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

  const fetchEarnings = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      
      if (!userId) {
        setError("User not authenticated");
        return;
      }

      const token = await getToken();
      if (!token) {
        setError("Failed to obtain authentication token");
        return;
      }

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Call secure Edge Function which validates Clerk token and queries DB with service role
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/secure-service-request?role=mechanic`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let completedJobs: any[] | null = null;
      if (resp.ok) {
        const json = await resp.json();
        completedJobs = Array.isArray(json?.data) ? json.data : [];
      } else {
        const text = await resp.text();
        console.error("secure-service-request error:", resp.status, text);
        setError(`Failed to fetch earnings: ${resp.status}`);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // fetched completedJobs available in `completedJobs` for processing

      if (completedJobs) {
        let todayTotal = 0, weekTotal = 0, monthTotal = 0;
        let todayJobs = 0, weekJobs = 0, monthJobs = 0;

        const isSameLocalDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

        completedJobs.forEach((job) => {
          const cost = Number(job.final_cost) || 0;
          const completedDate = job.completed_at ? new Date(job.completed_at) : null;

          if (completedDate instanceof Date && !isNaN(completedDate.getTime())) {
            // Count for Today only if the local date matches
            if (isSameLocalDay(completedDate, today)) {
              todayTotal += cost;
              todayJobs++;
            }

            // Week: any date on/after weekStart (local comparison)
            if (completedDate >= weekStart) {
              weekTotal += cost;
              weekJobs++;
            }

            // Month: any date on/after monthStart
            if (completedDate >= monthStart) {
              monthTotal += cost;
              monthJobs++;
            }
          }
        });

        setEarnings({
          today: todayTotal,
          thisWeek: weekTotal,
          thisMonth: monthTotal,
          pending: monthTotal * 0.2,
          todayJobs,
          weekJobs,
          monthJobs,
        });

        setRecentJobs(completedJobs.slice(0, 10) as CompletedJob[]);
        setAllCompletedJobs(completedJobs as CompletedJob[]);

        if (completedJobs.length === 0) {
          console.log("No completed jobs found for mechanic");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error in fetchEarnings:", errorMessage);
      setError(errorMessage);
      toast.error("An error occurred while loading earnings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    if (!userId) return;
    fetchEarnings();
  }, [userId, fetchEarnings]);

  const chartData = useMemo(() => {
    const days: { label: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      days.push({ label, amount: 0 });
    }

    allCompletedJobs.forEach((job) => {
      if (!job.completed_at) return;
      const cd = new Date(job.completed_at);
      if (isNaN(cd.getTime())) return;
      cd.setHours(0, 0, 0, 0);
      const cdLabel = cd.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const target = days.find((d) => d.label === cdLabel);
      if (target) {
        target.amount += Number(job.final_cost) || 0;
      }
    });

    return days;
  }, [allCompletedJobs]);

  const getPeriodData = () => {
    switch (activePeriod) {
      case "today":
        return { amount: earnings.today, jobs: earnings.todayJobs };
      case "week":
        return { amount: earnings.thisWeek, jobs: earnings.weekJobs };
      case "month":
        return { amount: earnings.thisMonth, jobs: earnings.monthJobs };
      default:
        return { amount: earnings.today, jobs: earnings.todayJobs };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  if (!isLoaded || loading) {
    return (
      <MobileLayout showHeader headerTitle="Earnings" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  const periodData = getPeriodData();

  return (
    <>
      <MobileLayout showHeader headerTitle="Earnings" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 flex flex-col">
        {/* debug panel removed */}
        <div className="px-4 py-4 flex-1 overflow-y-auto">
          {/* Error display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 mb-4 flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Period selector */}
          <nav className="flex gap-2 mb-4 items-center" role="tablist" aria-label="Earnings period">
            {[
              { key: "today", label: "Today" },
              { key: "week", label: "This Week" },
              { key: "month", label: "This Month" },
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => setActivePeriod(period.key as PeriodType)}
                role="tab"
                aria-selected={activePeriod === period.key}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activePeriod === period.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {period.label}
              </button>
            ))}
            <button
              onClick={() => fetchEarnings()}
              disabled={refreshing}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh earnings"
              aria-label="Refresh earnings data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </nav>

          {/* Earnings summary */}
          <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-6 mb-5" aria-labelledby="earnings-summary">
            <p id="earnings-summary" className="text-sm opacity-80">Total Earnings</p>
            <p className="text-4xl font-bold">{formatDirectINR(periodData.amount)}</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">{periodData.jobs} jobs completed</span>
            </div>
          </section>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="w-4 h-4 text-green-500" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">Avg per job</span>
              </div>
              <p className="text-2xl font-bold">
                {formatDirectINR(periodData.jobs > 0 ? periodData.amount / periodData.jobs : 0)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-accent" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">Pending payout</span>
              </div>
              <p className="text-2xl font-bold">{formatDirectINR(earnings.pending)}</p>
            </div>
          </div>

          {/* Chart placeholder */}
          <section className="bg-card border border-border rounded-xl p-4 mb-5" aria-labelledby="chart-heading">
            <h3 id="chart-heading" className="font-semibold mb-3">Earnings Trend</h3>
            <div className="h-48 bg-muted rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatDirectINR(Number(v))} />
                  <Tooltip formatter={(value: any) => formatDirectINR(Number(value))} />
                  <Line type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Recent transactions */}
          <section aria-labelledby="transactions-heading">
            <h3 id="transactions-heading" className="font-semibold mb-3">Recent Transactions</h3>
            {recentJobs.length > 0 ? (
              <ul className="space-y-2">
                {recentJobs.map((job) => (
                  <li key={job.id}>
                    <article className="flex justify-between items-center p-3 bg-card border border-border rounded-xl">
                      <div>
                        <p className="font-medium capitalize">{job.service_type} Service</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          <span>{formatDate(job.completed_at)}</span>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600">
                        +{formatDirectINR(job.final_cost)}
                      </span>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={DollarSign}
                title="No transactions yet"
                className="bg-muted rounded-xl"
              />
            )}
          </section>
        </div>
        </div>
      </MobileLayout>

      {/* Bottom navigation - rendered outside MobileLayout */}
      <BottomNavigation items={mechanicNavItems} />
    </>
  );
};

export default Earnings;

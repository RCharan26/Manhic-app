import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";

const MechanicProfile = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout showHeader headerTitle="Mechanic Profile" showBackButton onBack={() => navigate(-1)}>
      <div className="flex-1 p-6">
        {/* Mechanic header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
            <span className="text-4xl">👨‍🔧</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">John Smith</h2>
            <div className="flex items-center gap-2">
              <span className="text-accent">★ 4.8</span>
              <span className="text-muted-foreground">(127 reviews)</span>
            </div>
            <p className="text-sm text-muted-foreground">5 years experience</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">342</p>
            <p className="text-xs text-muted-foreground">Jobs Done</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">8 min</p>
            <p className="text-xs text-muted-foreground">Avg Response</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">98%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        </div>

        {/* Specializations */}
        <h3 className="font-semibold mb-3">Specializations</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {["Battery", "Tire Change", "Jump Start", "Fuel Delivery", "Lockout"].map((spec) => (
            <span key={spec} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
              {spec}
            </span>
          ))}
        </div>

        {/* Certifications */}
        <h3 className="font-semibold mb-3">Certifications</h3>
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓</span>
            <span>ASE Certified Technician</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓</span>
            <span>Background Verified</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓</span>
            <span>Insured</span>
          </div>
        </div>

        {/* Recent reviews */}
        <h3 className="font-semibold mb-3">Recent Reviews</h3>
        <div className="space-y-3">
          {[
            { name: "Alex M.", rating: 5, text: "Super fast and professional. Fixed my battery issue in minutes!" },
            { name: "Sarah K.", rating: 5, text: "Very friendly and explained everything clearly. Highly recommend." },
          ].map((review, i) => (
            <div key={i} className="bg-muted rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{review.name}</span>
                <span className="text-accent">★ {review.rating}</span>
              </div>
              <p className="text-sm text-muted-foreground">{review.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Request button */}
      <div className="p-6 bg-card border-t border-border">
        <Button className="w-full h-12" size="lg">
          Request This Mechanic
        </Button>
      </div>
    </MobileLayout>
  );
};

export default MechanicProfile;

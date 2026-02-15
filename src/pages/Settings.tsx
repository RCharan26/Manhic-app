import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate, Link } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/welcome");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: "👤", label: "Edit Profile", to: "/edit-profile", isActive: true },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: "💳", label: "Payment Methods", to: "/payment", isActive: true },
        { icon: "📞", label: "Emergency Contacts", to: "/support", isActive: true },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "❓", label: "Help & Support", to: "/support", isActive: true },
      ],
    },
  ];

  return (
    <MobileLayout showHeader headerTitle="Settings" showBackButton onBack={() => navigate(-1)}>
      <div className="flex-1 p-4">
        {/* Profile header */}
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl mb-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">{user?.fullName || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || ""}</p>
          </div>
          <Link to="/profile-setup" className="text-primary text-sm">
            Edit
          </Link>
        </div>

        {/* Settings groups */}
        {settingsGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="text-sm text-muted-foreground mb-2 px-1">{group.title}</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {group.items.map((item, i) => (
                <Link 
                  key={item.label}
                  to={item.to || "#"}
                  className={`flex items-center gap-3 p-4 hover:bg-muted transition-colors ${
                    i !== group.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <span className="text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Logout button */}
        <button 
          onClick={handleSignOut}
          className="w-full p-4 text-destructive bg-card border border-border rounded-xl hover:bg-destructive/10 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </MobileLayout>
  );
};

export default Settings;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { Search, Phone, MessageCircle, Mail, AlertTriangle, FileText, Shield, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const Support = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const faqItems = [
    { q: "How does Manhic work?", a: "Request assistance, get matched with a nearby mechanic, track their arrival in real-time. Our algorithm finds the nearest available mechanic based on your location and the type of service you need." },
    { q: "What payment methods are accepted?", a: "We accept all major credit/debit cards (Visa, Mastercard, American Express) and digital wallets including Apple Pay and Google Pay. Cash payments can be arranged directly with the mechanic." },
    { q: "How long does it take for help to arrive?", a: "Average response time is 15-20 minutes depending on your location and mechanic availability. You can track your mechanic's arrival in real-time on the tracking screen." },
    { q: "Can I choose my mechanic?", a: "Yes, you can view mechanic profiles and request specific mechanics based on their ratings, reviews, and specializations. You can also save favorite mechanics for future requests." },
    { q: "What if I need to cancel a request?", a: "You can cancel a pending request at no charge. If a mechanic has already been dispatched, a small cancellation fee may apply. Navigate to your active request and tap 'Cancel Request'." },
    { q: "How are service costs calculated?", a: "Costs are calculated based on the service type, parts needed (if any), and your location. You'll see an estimated cost before confirming your request, and the final cost will be confirmed after service completion." },
    { q: "Is my payment information secure?", a: "Yes, all payment information is encrypted and processed through secure payment gateways. We never store your full card details on our servers." },
    { q: "How do I become a mechanic on Manhic?", a: "Register as a mechanic through our app, submit your certifications and insurance documents, and complete our verification process. Once approved, you can start accepting service requests." },
  ];

  const filteredFaqs = faqItems.filter(
    item => 
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = () => {
    window.location.href = "tel:1-800-626-4421";
  };

  const handleEmail = () => {
    window.location.href = "mailto:support@manhic.com";
  };

  const handleLiveChat = () => {
    toast.info("Live chat feature coming soon!");
  };

  const handleReport = () => {
    toast.info("Report feature coming soon!");
  };

  return (
    <MobileLayout showHeader headerTitle="Help & Support" showBackButton onBack={() => navigate(-1)}>
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Emergency contact */}
        <div className="bg-primary text-primary-foreground rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-5 h-5" />
            <p className="font-semibold">Emergency? Call us now</p>
          </div>
          <p className="text-2xl font-bold mb-3">1-800-MANHIC</p>
          <Button variant="secondary" className="w-full" onClick={handleCall}>
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => navigate("/service-history")}
            className="p-4 bg-card border border-border rounded-xl flex flex-col items-center gap-2 hover:bg-muted transition-colors"
          >
            <FileText className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">My Services</span>
          </button>
          <button 
            onClick={() => navigate("/settings")}
            className="p-4 bg-card border border-border rounded-xl flex flex-col items-center gap-2 hover:bg-muted transition-colors"
          >
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Safety</span>
          </button>
        </div>

        {/* FAQ */}
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Frequently Asked Questions</h3>
        </div>
        <div className="space-y-3 mb-6">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item, i) => (
              <details key={i} className="bg-card border border-border rounded-xl group">
                <summary className="p-4 cursor-pointer font-medium list-none flex justify-between items-center">
                  {item.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No results found for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Contact options */}
        <h3 className="font-semibold mb-3">Contact Us</h3>
        <div className="space-y-3 pb-4">
          <button 
            onClick={handleLiveChat}
            className="w-full p-4 bg-card border border-border rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium">Live Chat</p>
              <p className="text-sm text-muted-foreground">Available 24/7</p>
            </div>
          </button>
          <button 
            onClick={handleEmail}
            className="w-full p-4 bg-card border border-border rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium">Email Support</p>
              <p className="text-sm text-muted-foreground">support@manhic.com</p>
            </div>
          </button>
          <button 
            onClick={handleReport}
            className="w-full p-4 bg-card border border-border rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium">Report an Issue</p>
              <p className="text-sm text-muted-foreground">Help us improve</p>
            </div>
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Support;

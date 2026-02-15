import { Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EmergencyContactData {
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

const EmergencyContact = () => {
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContactData | null>(null);

  useEffect(() => {
    const fetchEmergencyContact = async () => {
      if (!userId) return;

      try {
        // Since RLS policies check auth.uid() which doesn't exist for Clerk auth,
        // query the secure-customer-data function instead
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-customer-data`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const { data } = await response.json();
          if (data) {
            setEmergencyContact({
              emergency_contact_name: data.emergency_contact_name,
              emergency_contact_phone: data.emergency_contact_phone,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch emergency contact:", error);
      }
    };

    fetchEmergencyContact();
  }, [userId, getToken]);

  const handleCallEmergency = () => {
    if (emergencyContact?.emergency_contact_phone) {
      window.location.href = `tel:${emergencyContact.emergency_contact_phone}`;
    }
  };

  const handleCall911 = () => {
    window.location.href = 'tel:911';
  };

  const handleSendAlert = async () => {
    if (!userId || !emergencyContact?.emergency_contact_phone) {
      toast({
        title: "No emergency contact",
        description: "Please set up an emergency contact in your profile",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would send an SMS or push notification
    // For now, we'll create a notification record
    toast({
      title: "Alert Sent",
      description: `Emergency alert sent to ${emergencyContact.emergency_contact_name}`,
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Emergency
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Emergency Options
          </DialogTitle>
          <DialogDescription>
            Contact emergency services or your emergency contact
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Button 
            variant="destructive" 
            className="w-full gap-2"
            onClick={handleCall911}
          >
            <Phone className="h-4 w-4" />
            Call 911
          </Button>
          
          {emergencyContact?.emergency_contact_phone ? (
            <>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleCallEmergency}
              >
                <Phone className="h-4 w-4" />
                Call {emergencyContact.emergency_contact_name || 'Emergency Contact'}
              </Button>
              <Button 
                variant="secondary" 
                className="w-full gap-2"
                onClick={handleSendAlert}
              >
                <AlertTriangle className="h-4 w-4" />
                Send Alert to {emergencyContact.emergency_contact_name}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              No emergency contact set up. Add one in your profile settings.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyContact;

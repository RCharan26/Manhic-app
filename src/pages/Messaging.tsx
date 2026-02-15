import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ChatWindow from "@/components/ChatWindow";

const Messaging = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return (
      <MobileLayout showHeader headerTitle="Messages" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <p>No active conversation</p>
            <p className="text-sm mt-2">Accept a service request to start messaging</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader={false}>
      <ChatWindow requestId={requestId} />
    </MobileLayout>
  );
};

export default Messaging;

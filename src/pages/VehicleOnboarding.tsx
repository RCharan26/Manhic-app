import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import VehicleOnboardingWizard from '@/components/vehicle/VehicleOnboardingWizard';
import LoadingSpinner from '@/components/loading/LoadingSpinner';
import { useClerkAuthContext } from '@/contexts/ClerkAuthContext';
import { useCustomerVehicles } from '@/hooks/useCustomerVehicles';

export default function VehicleOnboarding() {
  const navigate = useNavigate();
  const { userId, isLoaded } = useClerkAuthContext();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (isLoaded && !userId) {
      navigate('/login');
    }
  }, [isLoaded, userId, navigate]);

  if (!isLoaded || !userId) {
    return (
      <MobileLayout>
        <div className="w-full h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="w-full flex items-center justify-center py-8 px-4">
        <VehicleOnboardingWizard
          onComplete={() => navigate('/customer-dashboard')}
          onSkip={() => navigate('/customer-dashboard')}
        />
      </div>
    </MobileLayout>
  );
}

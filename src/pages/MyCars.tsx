import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Car, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/components/layout/MobileLayout';
import LoadingSpinner from '@/components/loading/LoadingSpinner';
import EmptyState from '@/components/empty/EmptyState';
import VehicleCard from '@/components/vehicle/VehicleCard';
import VehicleOnboardingWizard from '@/components/vehicle/VehicleOnboardingWizard';
import VehicleEditDialog from '@/components/vehicle/VehicleEditDialog';
import VehicleDeleteDialog from '@/components/vehicle/VehicleDeleteDialog';
import { useCustomerVehicles } from '@/hooks/useCustomerVehicles';
import { useClerkAuthContext } from '@/contexts/ClerkAuthContext';
import type { CustomerVehicle } from '@/types/vehicle';

export default function MyCars() {
  const navigate = useNavigate();
  const { userId, isLoaded } = useClerkAuthContext();
  const { vehicles, loading, setPrimaryVehicle, hasVehicles } = useCustomerVehicles();
  
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CustomerVehicle | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);

  if (!isLoaded || loading) {
    return (
      <MobileLayout>
        <LoadingSpinner />
      </MobileLayout>
    );
  }

  if (!userId) {
    navigate('/login');
    return null;
  }

  if (showAddWizard) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col p-4">
          <Button
            variant="ghost"
            onClick={() => setShowAddWizard(false)}
            className="self-start mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <VehicleOnboardingWizard
            onComplete={() => setShowAddWizard(false)}
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">My Cars</h1>
              <p className="text-sm text-muted-foreground">
                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <Button onClick={() => setShowAddWizard(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Car
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {!hasVehicles ? (
            <EmptyState
              icon={<Car className="w-12 h-12 text-muted-foreground" />}
              title="No vehicles saved"
              description="Add your car details for faster roadside assistance"
              action={
                <Button onClick={() => setShowAddWizard(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Car
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onEdit={setEditingVehicle}
                  onDelete={setDeletingVehicleId}
                  onSetPrimary={setPrimaryVehicle}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <VehicleEditDialog
        vehicle={editingVehicle}
        open={!!editingVehicle}
        onOpenChange={(open) => !open && setEditingVehicle(null)}
      />

      {/* Delete Dialog */}
      <VehicleDeleteDialog
        vehicleId={deletingVehicleId}
        open={!!deletingVehicleId}
        onOpenChange={(open) => !open && setDeletingVehicleId(null)}
      />
    </MobileLayout>
  );
}

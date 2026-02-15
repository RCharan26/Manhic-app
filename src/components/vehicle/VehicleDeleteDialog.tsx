import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { useCustomerVehicles } from '@/hooks/useCustomerVehicles';
import { toast } from 'sonner';

interface VehicleDeleteDialogProps {
  vehicleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VehicleDeleteDialog({ vehicleId, open, onOpenChange }: VehicleDeleteDialogProps) {
  const { deleteVehicle } = useCustomerVehicles();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!vehicleId) return;

    setIsDeleting(true);
    try {
      await deleteVehicle(vehicleId);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete vehicle');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Vehicle</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this vehicle? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

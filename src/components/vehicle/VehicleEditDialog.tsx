import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { CAR_BRANDS, FUEL_TYPES, TRANSMISSION_TYPES, CAR_COLORS, MANUFACTURING_YEARS } from '@/types/vehicle';
import type { CustomerVehicle } from '@/types/vehicle';
import { useCustomerVehicles } from '@/hooks/useCustomerVehicles';
import { toast } from 'sonner';

interface VehicleEditDialogProps {
  vehicle: CustomerVehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VehicleEditDialog({ vehicle, open, onOpenChange }: VehicleEditDialogProps) {
  const { updateVehicle } = useCustomerVehicles();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    fuel_type: '' as 'petrol' | 'diesel' | 'electric' | 'hybrid',
    transmission_type: '' as 'manual' | 'automatic',
    license_plate: '',
    vehicle_color: ''
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vehicle_make: vehicle.vehicle_make,
        vehicle_model: vehicle.vehicle_model,
        vehicle_year: vehicle.vehicle_year,
        fuel_type: vehicle.fuel_type,
        transmission_type: vehicle.transmission_type,
        license_plate: vehicle.license_plate || '',
        vehicle_color: vehicle.vehicle_color || ''
      });
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    if (!formData.vehicle_make || !formData.vehicle_model || !formData.fuel_type || !formData.transmission_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateVehicle(vehicle.id, {
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model.trim(),
        vehicle_year: formData.vehicle_year,
        fuel_type: formData.fuel_type,
        transmission_type: formData.transmission_type,
        license_plate: formData.license_plate.trim().toUpperCase() || null,
        vehicle_color: formData.vehicle_color || null
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-brand">Car Brand *</Label>
            <Select
              value={formData.vehicle_make}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_make: value }))}
            >
              <SelectTrigger id="edit-brand">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {CAR_BRANDS.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-model">Car Model *</Label>
            <Input
              id="edit-model"
              value={formData.vehicle_model}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-year">Manufacturing Year *</Label>
            <Select
              value={formData.vehicle_year.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_year: parseInt(value) }))}
            >
              <SelectTrigger id="edit-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {MANUFACTURING_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fuel">Fuel Type *</Label>
              <Select
                value={formData.fuel_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, fuel_type: value }))}
              >
                <SelectTrigger id="edit-fuel">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((fuel) => (
                    <SelectItem key={fuel.value} value={fuel.value}>
                      {fuel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-transmission">Transmission *</Label>
              <Select
                value={formData.transmission_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, transmission_type: value }))}
              >
                <SelectTrigger id="edit-transmission">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSMISSION_TYPES.map((trans) => (
                    <SelectItem key={trans.value} value={trans.value}>
                      {trans.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-registration">Registration Number</Label>
            <Input
              id="edit-registration"
              value={formData.license_plate}
              onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
              maxLength={15}
              placeholder="e.g., MH 01 AB 1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-color">Color</Label>
            <Select
              value={formData.vehicle_color}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_color: value }))}
            >
              <SelectTrigger id="edit-color">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {CAR_COLORS.map((color) => (
                  <SelectItem key={color} value={color}>
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { Car, Star, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CustomerVehicle } from '@/types/vehicle';

interface VehicleCardProps {
  vehicle: CustomerVehicle;
  onEdit: (vehicle: CustomerVehicle) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

export default function VehicleCard({ vehicle, onEdit, onDelete, onSetPrimary }: VehicleCardProps) {
  return (
    <Card className={`relative ${vehicle.is_primary ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Car className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">
                {vehicle.vehicle_make} {vehicle.vehicle_model}
              </h3>
              {vehicle.is_primary && (
                <Badge variant="secondary" className="flex-shrink-0">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Primary
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">{vehicle.vehicle_year}</p>
            
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <Badge variant="outline" className="capitalize">
                {vehicle.fuel_type}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {vehicle.transmission_type}
              </Badge>
              {vehicle.vehicle_color && (
                <Badge variant="outline">{vehicle.vehicle_color}</Badge>
              )}
            </div>
            
            {vehicle.license_plate && (
              <p className="text-sm font-mono mt-2 text-muted-foreground">
                {vehicle.license_plate}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t">
          {!vehicle.is_primary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetPrimary(vehicle.id)}
              className="flex-1"
            >
              <Star className="w-4 h-4 mr-2" />
              Set Primary
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(vehicle)}
            className="flex-1"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(vehicle.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

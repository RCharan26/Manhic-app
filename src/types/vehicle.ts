export interface CustomerVehicle {
  id: string;
  user_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string | null;
  license_plate: string | null;
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  transmission_type: 'manual' | 'automatic';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const CAR_BRANDS = [
  'Hyundai',
  'Toyota',
  'Tata',
  'Maruti Suzuki',
  'Honda',
  'Mahindra',
  'Kia',
  'Volkswagen',
  'Skoda',
  'Ford',
  'Renault',
  'Nissan',
  'MG',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Jeep',
  'Other'
] as const;

export const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' }
] as const;

export const TRANSMISSION_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' }
] as const;

export const CAR_COLORS = [
  'White',
  'Black',
  'Silver',
  'Grey',
  'Red',
  'Blue',
  'Brown',
  'Green',
  'Yellow',
  'Orange',
  'Other'
] as const;

// Generate years from current year to 30 years ago
export const MANUFACTURING_YEARS = Array.from(
  { length: 31 },
  (_, i) => new Date().getFullYear() - i
);

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Car, Check, Loader2 } from 'lucide-react';
import { CAR_BRANDS, FUEL_TYPES, TRANSMISSION_TYPES, CAR_COLORS, MANUFACTURING_YEARS } from '@/types/vehicle';
import { useCustomerVehicles } from '@/hooks/useCustomerVehicles';
import { toast } from 'sonner';

interface VehicleOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type Step = 'brand' | 'model' | 'year' | 'fuel' | 'transmission' | 'registration' | 'color' | 'review';

const STEPS: Step[] = ['brand', 'model', 'year', 'fuel', 'transmission', 'registration', 'color', 'review'];

const STEP_TITLES: Record<Step, string> = {
  brand: 'Select Car Brand',
  model: 'Enter Car Model',
  year: 'Manufacturing Year',
  fuel: 'Fuel Type',
  transmission: 'Transmission Type',
  registration: 'Registration Number',
  color: 'Car Color',
  review: 'Review Your Car'
};

export default function VehicleOnboardingWizard({ onComplete, onSkip }: VehicleOnboardingWizardProps) {
  const { addVehicle } = useCustomerVehicles();
  const [currentStep, setCurrentStep] = useState<Step>('brand');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    fuel_type: '' as 'petrol' | 'diesel' | 'electric' | 'hybrid' | '',
    transmission_type: '' as 'manual' | 'automatic' | '',
    license_plate: '',
    vehicle_color: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'brand':
        if (!formData.vehicle_make) newErrors.vehicle_make = 'Please select a car brand';
        break;
      case 'model':
        if (!formData.vehicle_model.trim()) newErrors.vehicle_model = 'Please enter your car model';
        if (formData.vehicle_model.length > 50) newErrors.vehicle_model = 'Model name is too long';
        break;
      case 'year':
        if (!formData.vehicle_year) newErrors.vehicle_year = 'Please select manufacturing year';
        break;
      case 'fuel':
        if (!formData.fuel_type) newErrors.fuel_type = 'Please select fuel type';
        break;
      case 'transmission':
        if (!formData.transmission_type) newErrors.transmission_type = 'Please select transmission type';
        break;
      case 'registration':
        if (formData.license_plate && !/^[A-Z0-9\s-]{4,15}$/i.test(formData.license_plate.trim())) {
          newErrors.license_plate = 'Please enter a valid registration number';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.fuel_type || !formData.transmission_type) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addVehicle({
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model.trim(),
        vehicle_year: formData.vehicle_year,
        fuel_type: formData.fuel_type,
        transmission_type: formData.transmission_type,
        license_plate: formData.license_plate.trim().toUpperCase() || null,
        vehicle_color: formData.vehicle_color || null,
        is_primary: true
      });
      onComplete();
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      toast.error(error.message || 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'brand':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {CAR_BRANDS.map((brand) => (
                <Button
                  key={brand}
                  type="button"
                  variant={formData.vehicle_make === brand ? 'default' : 'outline'}
                  className="h-12 justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, vehicle_make: brand }))}
                >
                  {brand}
                </Button>
              ))}
            </div>
            {errors.vehicle_make && (
              <p className="text-sm text-destructive">{errors.vehicle_make}</p>
            )}
          </div>
        );

      case 'model':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model">Car Model</Label>
              <Input
                id="model"
                placeholder="e.g., Creta, Fortuner, Nexon"
                value={formData.vehicle_model}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                maxLength={50}
              />
              {errors.vehicle_model && (
                <p className="text-sm text-destructive">{errors.vehicle_model}</p>
              )}
            </div>
          </div>
        );

      case 'year':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Manufacturing Year</Label>
              <Select
                value={formData.vehicle_year.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_year: parseInt(value) }))}
              >
                <SelectTrigger>
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
              {errors.vehicle_year && (
                <p className="text-sm text-destructive">{errors.vehicle_year}</p>
              )}
            </div>
          </div>
        );

      case 'fuel':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {FUEL_TYPES.map((fuel) => (
                <Button
                  key={fuel.value}
                  type="button"
                  variant={formData.fuel_type === fuel.value ? 'default' : 'outline'}
                  className="h-14"
                  onClick={() => setFormData(prev => ({ ...prev, fuel_type: fuel.value as any }))}
                >
                  {fuel.label}
                </Button>
              ))}
            </div>
            {errors.fuel_type && (
              <p className="text-sm text-destructive">{errors.fuel_type}</p>
            )}
          </div>
        );

      case 'transmission':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TRANSMISSION_TYPES.map((trans) => (
                <Button
                  key={trans.value}
                  type="button"
                  variant={formData.transmission_type === trans.value ? 'default' : 'outline'}
                  className="h-14"
                  onClick={() => setFormData(prev => ({ ...prev, transmission_type: trans.value as any }))}
                >
                  {trans.label}
                </Button>
              ))}
            </div>
            {errors.transmission_type && (
              <p className="text-sm text-destructive">{errors.transmission_type}</p>
            )}
          </div>
        );

      case 'registration':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number (Optional)</Label>
              <Input
                id="registration"
                placeholder="e.g., MH 01 AB 1234"
                value={formData.license_plate}
                onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                This helps identify your vehicle during roadside assistance
              </p>
              {errors.license_plate && (
                <p className="text-sm text-destructive">{errors.license_plate}</p>
              )}
            </div>
          </div>
        );

      case 'color':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {CAR_COLORS.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant={formData.vehicle_color === color ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setFormData(prev => ({ ...prev, vehicle_color: color }))}
                >
                  {color}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {formData.vehicle_make} {formData.vehicle_model}
                  </h3>
                  <p className="text-sm text-muted-foreground">{formData.vehicle_year}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Fuel Type:</span>
                  <p className="font-medium capitalize">{formData.fuel_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transmission:</span>
                  <p className="font-medium capitalize">{formData.transmission_type}</p>
                </div>
                {formData.license_plate && (
                  <div>
                    <span className="text-muted-foreground">Registration:</span>
                    <p className="font-medium">{formData.license_plate}</p>
                  </div>
                )}
                {formData.vehicle_color && (
                  <div>
                    <span className="text-muted-foreground">Color:</span>
                    <p className="font-medium">{formData.vehicle_color}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Car className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-xl">{STEP_TITLES[currentStep]}</CardTitle>
        <CardDescription>
          Step {currentStepIndex + 1} of {STEPS.length}
        </CardDescription>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        {renderStepContent()}

        <div className="flex gap-3">
          {currentStepIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save My Car
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {onSkip && currentStepIndex === 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

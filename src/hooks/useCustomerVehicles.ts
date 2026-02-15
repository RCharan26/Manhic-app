import { useState, useEffect, useCallback } from 'react';
import { useClerkAuthContext } from '@/contexts/ClerkAuthContext';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import type { CustomerVehicle } from '@/types/vehicle';

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

export function useCustomerVehicles() {
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!userId) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let token: string | null = null;
      let retries = 3;
      
      while (!token && retries > 0) {
        try {
          token = await getToken();
          if (token) break;
        } catch (e) {
          console.warn(`Token fetch attempt failed, retries left: ${retries - 1}`, e);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
          }
        }
      }

      if (!token) {
        throw new Error('Unable to obtain authentication token after multiple attempts');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-vehicle-data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const { data } = await response.json();
      setVehicles((data as CustomerVehicle[]) || []);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Failed to fetch vehicles');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const addVehicle = async (vehicle: Omit<CustomerVehicle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) throw new Error('User not authenticated');

    let token: string | null = null;
    let retries = 3;
    
    while (!token && retries > 0) {
      try {
        token = await getToken();
        if (token) break;
      } catch (e) {
        console.warn(`Token fetch attempt failed, retries left: ${retries - 1}`, e);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!token) throw new Error('Failed to obtain authentication token');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-vehicle-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(vehicle),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    await fetchVehicles();
    toast.success('Vehicle added successfully');
    return data as CustomerVehicle;
  };

  const updateVehicle = async (id: string, updates: Partial<CustomerVehicle>) => {
    if (!userId) throw new Error('User not authenticated');

    const token = await getToken();
    if (!token) throw new Error('No token available');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-vehicle-data?id=${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { data } = await response.json();
    await fetchVehicles();
    toast.success('Vehicle updated successfully');
    return data as CustomerVehicle;
  };

  const deleteVehicle = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');

    const token = await getToken();
    if (!token) throw new Error('No token available');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-vehicle-data?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    await fetchVehicles();
    toast.success('Vehicle removed successfully');
  };

  const setPrimaryVehicle = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');

    const token = await getToken();
    if (!token) throw new Error('No token available');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-vehicle-data?id=${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ is_primary: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    await fetchVehicles();
    toast.success('Primary vehicle updated');
  };

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setPrimaryVehicle,
    refetch: fetchVehicles,
    hasVehicles: vehicles.length > 0
  };
}

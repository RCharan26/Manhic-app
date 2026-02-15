import { supabase } from "@/integrations/supabase/client";

/**
 * Secure API client that routes sensitive operations through Edge Functions
 * that validate Clerk JWTs before performing database operations.
 * 
 * This provides server-side authorization since Clerk auth doesn't integrate
 * with Supabase RLS (auth.uid() returns NULL with Clerk).
 */

type ProfileData = {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: "customer" | "mechanic";
};

type CustomerDetailsData = {
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  license_plate?: string;
};

type VehicleData = {
  id?: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color?: string;
  license_plate?: string;
  fuel_type: string;
  transmission_type: string;
  is_primary?: boolean;
};

// Get Clerk session token for API calls
async function getClerkToken(): Promise<string | null> {
  // Import dynamically to avoid circular dependencies
  const { useAuth } = await import("@clerk/clerk-react");
  // Note: This won't work directly - we need to pass the token from components
  return null;
}

export const secureProfileApi = {
  /**
   * Fetch the current user's profile
   */
  async get(clerkToken: string) {
    const { data, error } = await supabase.functions.invoke("secure-profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Create a new profile for the current user
   */
  async create(clerkToken: string, profileData: ProfileData) {
    const { data, error } = await supabase.functions.invoke("secure-profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: profileData,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update the current user's profile
   */
  async update(clerkToken: string, profileData: Partial<ProfileData>) {
    const { data, error } = await supabase.functions.invoke("secure-profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: profileData,
    });

    if (error) throw error;
    return data;
  },
};

export const secureCustomerDetailsApi = {
  /**
   * Fetch the current user's customer details
   */
  async get(clerkToken: string) {
    const { data, error } = await supabase.functions.invoke("secure-customer-data", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: { resource: "details" },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Create or update customer details
   */
  async upsert(clerkToken: string, detailsData: CustomerDetailsData) {
    const { data, error } = await supabase.functions.invoke("secure-customer-data", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: { ...detailsData, resource: "details" },
    });

    if (error) throw error;
    return data;
  },
};

export const secureVehiclesApi = {
  /**
   * Fetch all vehicles for the current user
   */
  async list(clerkToken: string) {
    const { data, error } = await supabase.functions.invoke("secure-customer-data", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: { resource: "vehicles" },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Create a new vehicle
   */
  async create(clerkToken: string, vehicleData: VehicleData) {
    const { data, error } = await supabase.functions.invoke("secure-customer-data", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: { ...vehicleData, resource: "vehicles" },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing vehicle
   */
  async update(clerkToken: string, vehicleId: string, vehicleData: Partial<VehicleData>) {
    const { data, error } = await supabase.functions.invoke("secure-customer-data", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: { ...vehicleData, resource: "vehicles", vehicleId },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Delete a vehicle
   */
  async delete(clerkToken: string, vehicleId: string) {
    const { data, error } = await supabase.functions.invoke("secure-customer-data", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: { resource: "vehicles", vehicleId },
    });

    if (error) throw error;
    return data;
  },
};

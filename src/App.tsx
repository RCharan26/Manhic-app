import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkAuthProvider } from "@/contexts/ClerkAuthContext";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Welcome from "./pages/Welcome";
import RoleGate from "./pages/RoleGate";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ProfileSetup from "./pages/ProfileSetup";
import EditProfile from "./pages/EditProfile";
import CustomerDashboard from "./pages/CustomerDashboard";
import MechanicDashboard from "./pages/MechanicDashboard";
import ServiceRequest from "./pages/ServiceRequest";
import RequestTracking from "./pages/RequestTracking";
import JobManagement from "./pages/JobManagement";
import Messaging from "./pages/Messaging";
import Payment from "./pages/Payment";
import RatingReview from "./pages/RatingReview";
import ServiceHistory from "./pages/ServiceHistory";
import MechanicProfile from "./pages/MechanicProfile";
import Earnings from "./pages/Earnings";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import MyCars from "./pages/MyCars";
import VehicleOnboarding from "./pages/VehicleOnboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ClerkAuthProvider>
          <Routes>
            {/* Authentication Flow */}
            <Route path="/" element={<ProtectedRoute><RoleGate /></ProtectedRoute>} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/*" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/vehicle-onboarding" element={<ProtectedRoute><VehicleOnboarding /></ProtectedRoute>} />
            
            {/* Customer Flow */}
            <Route path="/customer-dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/my-cars" element={<ProtectedRoute><MyCars /></ProtectedRoute>} />
            <Route path="/service-request" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
            <Route path="/request-tracking" element={<ProtectedRoute><RequestTracking /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/rating-review" element={<ProtectedRoute><RatingReview /></ProtectedRoute>} />
            <Route path="/service-history" element={<ProtectedRoute><ServiceHistory /></ProtectedRoute>} />
            
            {/* Mechanic Flow */}
            <Route path="/mechanic-dashboard" element={<ProtectedRoute><MechanicDashboard /></ProtectedRoute>} />
            <Route path="/mechanic-profile" element={<ProtectedRoute><MechanicProfile /></ProtectedRoute>} />
            <Route path="/job-management" element={<ProtectedRoute><JobManagement /></ProtectedRoute>} />
            <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
            
            {/* Shared Features */}
            <Route path="/messaging" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ClerkAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

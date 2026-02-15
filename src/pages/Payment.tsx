import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate, useLocation } from "react-router-dom";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDirectINR, convertToINR } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, AlertTriangle, CreditCard, DollarSign, Smartphone } from "lucide-react";

type PaymentMethod = "card" | "upi" | "cash";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useClerkAuthContext();
  
  const requestId = location.state?.requestId;
  const mechanicId = location.state?.mechanicId;
  const estimatedCost = location.state?.estimatedCost || 500;
  const finalCost = location.state?.finalCost || location.state?.estimatedCost || 500;
  
  const [amount, setAmount] = useState(finalCost.toString());
  const [tip, setTip] = useState(0);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<"success" | "failed" | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const generateMockTransactionId = () => {
    return `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  };

  const handleMockPayment = async (result: "success" | "failed") => {
    if (!userId) {
      toast.error("Please sign in to make a payment");
      return;
    }

    // Simple client-side validation
    const parsedAmount = parseFloat(amount || "0");
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Please enter a valid amount greater than 0");
      return;
    }

    setAmountError(null);
    setIsProcessing(true);
    const mockTxnId = generateMockTransactionId();
    const now = new Date().toISOString();

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      if (result === "success" && requestId && mechanicId) {
        // Store payment record in database
        const totalAmount = parseFloat(amount) + tip;
        const platformFee = totalAmount * 0.1; // 10% platform fee
        const mechanicPayout = totalAmount - platformFee;

        const { error } = await supabase
          .from("payments")
          .insert({
            request_id: requestId,
            customer_id: userId,
            mechanic_id: mechanicId,
            amount: totalAmount,
            platform_fee: platformFee,
            mechanic_payout: mechanicPayout,
            payment_status: "completed",
            payment_method: paymentMethod,
            stripe_payment_id: mockTxnId,
            paid_at: now,
          });

        if (error) {
          console.error("Payment record error:", error);
          // Continue anyway for demo purposes
        }

        // Update service request status to mark as paid
        await supabase
          .from("service_requests")
          .update({ payment_status: "paid" })
          .eq("id", requestId);
      }

      setTransactionId(mockTxnId);
      setTimestamp(now);
      setPaymentResult(result);

      if (result === "success") {
        toast.success("Payment successful!");
      } else {
        toast.error("Payment failed (simulated)");
      }
    } catch (error) {
      console.error("Mock payment error:", error);
      setPaymentResult("failed");
      toast.error("Payment simulation error");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = parseFloat(amount || "0") + tip;

  // Payment method selection screen
  if (!paymentResult) {
    return (
      <MobileLayout showHeader headerTitle="Payment" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 flex flex-col p-6">
          
          {/* Amount summary */}
          <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-6 mb-6">
            <p className="text-sm opacity-90">Service Cost</p>
            <p className="text-4xl font-bold mt-1">{formatDirectINR(parseFloat(amount))}</p>
            
            {tip > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between text-sm mb-2">
                  <span>Service:</span>
                  <span>{formatDirectINR(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tip:</span>
                  <span>₹{tip.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatDirectINR(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Final cost adjustment (if available) */}
          <div className="mb-6">
            <Label htmlFor="finalCost" className="mb-2 block">Final Amount</Label>
            <Input
              id="finalCost"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                const v = parseFloat(e.target.value || "0");
                if (isNaN(v) || v <= 0) setAmountError("Enter a valid amount");
                else setAmountError(null);
              }}
              placeholder="Enter final amount"
              className="text-lg"
            />
            {amountError && <p className="text-sm text-destructive mt-2">{amountError}</p>}
            <p className="text-xs text-muted-foreground mt-1">Edit if mechanic provided different final cost</p>
          </div>

          {/* Tip input */}
          <div className="mb-6">
            <Label htmlFor="tip" className="mb-2 block">Add Tip (Optional)</Label>
            <div className="flex gap-2 mb-2">
              {[0, 50, 100, 200].map((t) => (
                <Button
                  key={t}
                  variant={tip === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTip(t)}
                  className="flex-1"
                >
                  ₹{t}
                </Button>
              ))}
            </div>
            <Input
              id="tip"
              type="number"
              step="0.01"
              value={tip || ""}
              onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
              placeholder="Custom tip amount"
            />
          </div>

          {/* Payment method selection */}
          <div className="mb-6">
            <Label className="mb-3 block">Payment Method</Label>
            <div className="space-y-3">
              <div
                onClick={() => setPaymentMethod("card")}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "card" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Credit/Debit Card</p>
                    <p className="text-xs text-muted-foreground">VISA, Mastercard, etc.</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod("upi")}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "upi" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">UPI Payment</p>
                    <p className="text-xs text-muted-foreground">Google Pay, Paytm, PhonePe</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod("cash")}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "cash" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Cash Payment</p>
                    <p className="text-xs text-muted-foreground">Pay in cash to mechanic</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-lg"
              onClick={() => handleMockPayment("success")}
              disabled={isProcessing || !!amountError || parseFloat(amount || "0") <= 0}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Pay {formatDirectINR(totalAmount)}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => navigate(-1)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Payment result screen
  return (
    <MobileLayout showHeader headerTitle="Payment Result" showBackButton={false}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Demo badge */}
        <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium mb-6 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Mock Payment – Demo Only
        </div>

        {paymentResult === "success" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">Your payment has been processed</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
            <p className="text-muted-foreground mb-6">This is a simulated failure for demo purposes</p>
          </>
        )}

        {/* Transaction details */}
        <div className="w-full bg-muted rounded-xl p-4 mb-6 text-left">
          <h3 className="font-semibold mb-3 text-sm">Transaction Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="capitalize">{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timestamp</span>
              <span className="text-xs">{timestamp ? new Date(timestamp).toLocaleString() : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={paymentResult === "success" ? "text-green-600" : "text-red-600"}>
                {paymentResult === "success" ? "COMPLETED" : "FAILED"}
              </span>
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-12" 
          onClick={() => navigate(paymentResult === "success" ? "/rating-review" : "/customer-dashboard", {
            state: requestId ? { requestId, mechanicId } : undefined
          })}
        >
          {paymentResult === "success" ? "Rate Your Experience" : "Back to Dashboard"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Payment;

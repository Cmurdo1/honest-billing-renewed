import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, DollarSign } from "lucide-react";

interface InvoicePaymentDialogProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePaymentDialog = ({ invoice, isOpen, onClose }: InvoicePaymentDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [amount, setAmount] = useState(invoice?.total?.toString() || "");
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = useMutation({
    mutationFn: async ({ invoiceId, amount, method }: { invoiceId: string; amount: number; method: string }) => {
      // In a real application, this would integrate with Stripe or another payment processor
      // For demo purposes, we'll simulate a payment and update the invoice status
      
      setIsProcessing(true);
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update invoice status to paid
      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("id", invoiceId);

      if (error) throw error;

      return { invoiceId, amount, method };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
      toast.success(`Payment of $${data.amount} processed successfully!`);
      onClose();
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error("Payment failed. Please try again.");
      console.error("Payment error:", error);
      setIsProcessing(false);
    },
  });

  const handlePayment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > invoice.total) {
      toast.error("Payment amount cannot exceed invoice total");
      return;
    }

    processPayment.mutate({
      invoiceId: invoice.id,
      amount: parseFloat(amount),
      method: paymentMethod
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Invoice: {invoice?.number}
          </DialogTitle>
          <DialogDescription>
            Complete your payment securely. Your payment will be processed immediately.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Invoice Number:</span>
                <span>{invoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Issue Date:</span>
                <span>{new Date(invoice.issue_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Due Date:</span>
                <span>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-primary">${invoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Payment Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "credit_card" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      className="font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        type="password"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>Note:</strong> This is a demo payment system. In production, this would integrate with a real payment processor like Stripe.
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={processPayment.isPending || isProcessing || !amount}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              `Pay $${amount || '0.00'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
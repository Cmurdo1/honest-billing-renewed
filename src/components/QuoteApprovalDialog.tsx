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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface QuoteApprovalDialogProps {
  quote: any;
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteApprovalDialog = ({ quote, isOpen, onClose }: QuoteApprovalDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const updateQuote = useMutation({
    mutationFn: async ({ quoteId, status, comments }: { quoteId: string; status: string; comments?: string }) => {
      const updateData: any = { status };
      if (comments) {
        updateData.notes = (quote.notes || '') + `\n\nCustomer ${status}: ${comments}`;
      }

      const { error } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", quoteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-quotes"] });
      toast.success(`Quote ${action}d successfully`);
      onClose();
      setComments("");
      setAction(null);
    },
    onError: (error) => {
      toast.error(`Failed to ${action} quote`);
      console.error("Error updating quote:", error);
    },
  });

  const handleApprove = () => {
    setAction("approve");
    updateQuote.mutate({ quoteId: quote.id, status: "approved", comments });
  };

  const handleReject = () => {
    setAction("reject");
    updateQuote.mutate({ quoteId: quote.id, status: "rejected", comments });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Quote Review: {quote?.quote_number}</DialogTitle>
          <DialogDescription>
            Please review the quote details and provide your decision.
          </DialogDescription>
        </DialogHeader>

        {quote && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Quote Number:</strong> {quote.quote_number}
              </div>
              <div>
                <strong>Total Amount:</strong> ${quote.total?.toFixed(2)}
              </div>
              <div>
                <strong>Issue Date:</strong> {new Date(quote.issue_date).toLocaleDateString()}
              </div>
              <div>
                <strong>Expiry Date:</strong> {quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString() : 'No expiry'}
              </div>
            </div>

            {quote.notes && (
              <div>
                <Label>Quote Notes</Label>
                <div className="p-3 bg-gray-50 rounded-md text-sm">
                  {quote.notes}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments or feedback..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject}
            disabled={updateQuote.isPending}
          >
            Reject Quote
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={updateQuote.isPending}
          >
            Approve Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
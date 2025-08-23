import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useEmailSending } from "@/hooks/useEmailSending";

interface SendInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  clientEmail?: string;
  clientName: string;
  children?: React.ReactNode;
}

const SendInvoiceDialog = ({ 
  invoiceId, 
  invoiceNumber, 
  clientEmail, 
  clientName,
  children 
}: SendInvoiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(clientEmail || "");
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber}`);
  const [message, setMessage] = useState(
    `Dear ${clientName},\n\nPlease find attached invoice ${invoiceNumber} for your review.\n\nThank you for your business!\n\nBest regards`
  );

  const { sendEmail, isSending } = useEmailSending();

  const handleSend = () => {
    if (!recipientEmail.trim()) {
      return;
    }

    sendEmail({
      invoiceId,
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim() || undefined,
      message: message.trim() || undefined,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="default" className="flex items-center gap-1">
            <Send className="h-3 w-3" />
            Send
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Invoice {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">Recipient Email *</Label>
            <Input
              id="recipient"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Invoice subject"
            />
          </div>
          
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message"
              rows={6}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={!recipientEmail.trim() || isSending}
            >
              {isSending ? "Sending..." : "Send Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendInvoiceDialog;

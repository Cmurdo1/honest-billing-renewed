import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to HonestInvoice</h1>
        <p className="text-xl text-muted-foreground">Manage clients, create invoices, and get paid.</p>
        {user ? (
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        ) : (
          <Button onClick={() => navigate("/auth")}>Sign in</Button>
        )}
      </div>
    </div>
  );
};

export default Index;



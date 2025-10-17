import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            HI
          </span>
          <span className="font-semibold">HonestInvoice</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <button
            onClick={() =>
              document.getElementById("features")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="hover:text-foreground"
          >
            Features
          </button>
          <button
            onClick={() =>
              document.getElementById("pricing")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="hover:text-foreground"
          >
            Pricing
          </button>
        </nav>
        <div className="flex items-center gap-2 md:ml-auto">
          {user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
              <Button variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
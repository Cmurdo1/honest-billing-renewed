import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { signInSchema, signUpSchema } from "@/lib/validations";

const updateSeo = (title: string, description: string) => {
  document.title = title;

  const ensureTag = (selector: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(selector) as HTMLElement | null;
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    return el;
  };

  const desc = ensureTag('meta[name="description"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('name', 'description');
    return m;
  }) as HTMLMetaElement;
  desc.setAttribute('content', description);

  const canonical = ensureTag('link[rel="canonical"]', () => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    return l;
  }) as HTMLLinkElement;
  canonical.setAttribute('href', window.location.href);
};

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const pageTitle = useMemo(
    () => (mode === "signin" ? "Sign in to HonestInvoice" : "Create your HonestInvoice account"),
    [mode]
  );

  useEffect(() => {
    updateSeo(
      `${pageTitle} | HonestInvoice`,
      "Sign in or create your HonestInvoice account to manage clients, invoices, and subscriptions."
    );
  }, [pageTitle]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromVerification = params.get("verified") === "1";

    // If the user arrives from email verification, keep them on /auth
    if (fromVerification) return;

    if (user && !loading) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate form data
      const formData = { email, password };
      const schema = mode === "signin" ? signInSchema : signUpSchema;
      const validation = schema.safeParse(formData);

      if (!validation.success) {
        toast({
          title: "Validation error",
          description: validation.error.errors[0].message,
        });
        return;
      }

      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to complete sign up.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Authentication error",
        description: err?.message || "Something went wrong.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 py-6">
        <h1 className="sr-only">HonestInvoice Account</h1>
      </header>
      <main className="container mx-auto max-w-md px-4">
        <section aria-labelledby="auth-title" className="mt-10">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-6 text-center">
              <h2 id="auth-title" className="text-2xl font-semibold">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "signin" ? "Welcome back!" : "Join HonestInvoice in seconds."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === "signin" ? (
                <button
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  New here? Create an account
                </button>
              ) : (
                <button
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Auth;

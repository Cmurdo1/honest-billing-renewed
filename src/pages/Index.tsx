import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeProducts } from "@/stripe-config";

// Small helper to handle SEO for the landing page
function updateSeo(title: string, description: string, canonicalHref?: string) {
  if (typeof document === "undefined") return;
  document.title = title;

  const ensureMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", name);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  };

  ensureMeta("description", description);

  // Canonical
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", canonicalHref || window.location.origin + "/");

  // Basic JSON-LD for a software product
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HonestInvoice",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    }
  };

  let script = document.getElementById("ld-json-landing") as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script") as HTMLScriptElement;
    script.id = "ld-json-landing";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(ld);
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    updateSeo(
      "HonestInvoice – Simple invoicing for freelancers",
      "Create invoices, manage clients, and get paid faster with HonestInvoice.",
      window.location.origin + "/"
    );
  }, []);

  const plans = useMemo(
    () => [
      {
        name: "Free",
        price: "$0",
        period: "/forever",
        highlight: false,
        features: [
          "Up to 5 clients",
          "Unlimited invoices",
          "Basic branding",
          "Email support",
        ],
        cta: user ? () => navigate("/dashboard") : () => navigate("/auth"),
        ctaLabel: user ? "Use Free plan" : "Get started free",
      },
      ...stripeProducts.map((product, index) => ({
        name: product.name,
        price: `$${product.price}`,
        period: "/month",
        highlight: index === 0, // Make first product (Pro) highlighted
        features: getFeaturesByPlan(product.name),
        cta: user ? () => navigate("/dashboard?tab=billing") : () => navigate("/auth"),
        ctaLabel: user ? `Upgrade to ${product.name}` : "Sign in to upgrade",
      })),
    ],
    [navigate, user]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">HI</span>
            <span className="font-semibold">HonestInvoice</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground">Features</button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground">Pricing</button>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                <Button variant="secondary" onClick={signOut}>Sign out</Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Invoicing that’s honest, fast, and effortless
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage clients, create professional invoices, and get paid quickly.
            Everything you need, nothing you don’t.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {user ? (
              <Button size="lg" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate("/auth")}>Get started</Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>Sign in</Button>
              </>
            )}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Client management</CardTitle>
                <CardDescription>All your client details in one place.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[
                    "Add and edit clients",
                    "Quick search and filtering",
                    "Contact info at a glance",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Invoice creation</CardTitle>
                <CardDescription>Create beautiful invoices in seconds.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[
                    "Customizable line items",
                    "Auto totals and taxes",
                    "PDF export and sharing",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stay organized</CardTitle>
                <CardDescription>Track status and keep everything tidy.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[
                    "Paid / Unpaid status",
                    "Due dates and reminders",
                    "Exportable reports",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto py-16 md:py-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, honest pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free and upgrade anytime.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.highlight ? "border-primary shadow-md" : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-baseline justify-between">
                    <span>{plan.name}</span>
                    {plan.highlight && (
                      <span className="text-xs font-medium rounded-md px-2 py-1 bg-primary text-primary-foreground">Most Popular</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                    <span className="ml-1 text-muted-foreground">{plan.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={plan.highlight ? "default" : "secondary"} onClick={plan.cta}>
                    {plan.ctaLabel}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto py-8 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HonestInvoice. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground">Pricing</button>
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground">Features</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

const getFeaturesByPlan = (planName: string): string[] => {
  const features = {
    Pro: [
      "Unlimited clients",
      "Custom branding & logo", 
      "Saved items & taxes",
      "Priority support",
    ],
    Business: [
      "Team access (3 seats)",
      "Advanced reporting",
      "Multiple currencies", 
      "Export to CSV/PDF",
    ]
  };

  return features[planName as keyof typeof features] || [];
};

export default Index;



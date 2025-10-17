import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeProducts } from "@/stripe-config";
import Header from "@/components/Header";

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
        cta: () => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank"),
        ctaLabel: `Get ${product.name}`,
      })),
    ],
    [navigate, user]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Header />

      <main>
        {/* Hero */}
        <section className="container mx-auto py-16 px-4 sm:py-20 md:py-28 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 blur-3xl -z-10"></div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Invoicing that's honest, fast, and effortless
            </h1>
          </div>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage clients, create professional invoices, and get paid quickly.
            Everything you need, nothing you don't.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Button size="lg" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">Go to Dashboard</Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto">Get started</Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="w-full sm:w-auto">Sign in</Button>
              </>
            )}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto py-12 md:py-16 px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-4">Everything you need to invoice professionally</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">Simple tools that work together to help you manage your business and get paid faster.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="text-primary">Client management</CardTitle>
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
                      <Check className="text-primary h-5 w-5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="text-primary">Invoice creation</CardTitle>
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
                      <Check className="text-primary h-5 w-5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary/20 hover:border-primary/40 transition-colors md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-primary">Stay organized</CardTitle>
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
                      <Check className="text-primary h-5 w-5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto py-16 md:py-24 px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Simple, honest pricing</h2>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base">Start free and upgrade anytime.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={`${plan.highlight ? "border-primary shadow-md" : ""} ${plans.length === 2 && "md:col-span-1"}`}>
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
                        <Check className="text-primary h-5 w-5" />
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
      "Advanced reporting",
      "Priority support",
      "Export to PDF",
    ]
  };

  return features[planName as keyof typeof features] || [];
};

export default Index;
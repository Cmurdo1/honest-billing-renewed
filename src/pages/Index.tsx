import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Briefcase, Clock, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { stripeProducts } from "@/stripe-config";

// SEO helper function remains the same
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
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", canonicalHref || window.location.origin + "/");
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HonestInvoice",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" }
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
      "HonestInvoice – Simple Invoicing for Freelancers",
      "Create professional invoices, manage clients, and get paid faster with HonestInvoice.",
      window.location.origin + "/"
    );
  }, []);

  const plans = useMemo(
    () => [
      {
        name: "Free",
        price: "$0",
        period: "Forever",
        highlight: false,
        features: ["Up to 5 clients", "Unlimited invoices", "Basic branding", "Email support"],
        cta: user ? () => navigate("/dashboard") : () => navigate("/auth"),
        ctaLabel: user ? "Go to Dashboard" : "Get Started for Free",
      },
      ...stripeProducts.map((product, index) => ({
        name: product.name,
        price: `$${product.price}`,
        period: "Per month",
        highlight: index === 0,
        features: getFeaturesByPlan(product.name),
        cta: () => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank"),
        ctaLabel: `Get ${product.name}`,
      })),
    ],
    [navigate, user]
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">HonestInvoice</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Pricing</button>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                <Button variant="outline" onClick={signOut}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
                <Button onClick={() => navigate("/auth")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero */}
        <section className="container mx-auto py-20 px-4 sm:py-28 md:py-36 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter max-w-4xl mx-auto">
            Clean, Simple Invoicing for Modern Professionals
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Focus on your work, not your paperwork. Create and send professional invoices in seconds, and get paid faster.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-lg px-8 py-6">
              Start Your Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="w-full sm:w-auto text-lg px-8 py-6">
              Learn More
            </Button>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 bg-muted/50">
          <div className="container mx-auto text-center px-4">
            <h3 className="text-sm uppercase text-muted-foreground tracking-widest">
              Trusted by Freelancers and Agencies Worldwide
            </h3>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-y-8 gap-x-12 items-center text-muted-foreground/80">
              <div className="grayscale opacity-80 hover:opacity-100 transition-opacity">Logo A</div>
              <div className="grayscale opacity-80 hover:opacity-100 transition-opacity">Logo B</div>
              <div className="grayscale opacity-80 hover:opacity-100 transition-opacity">Logo C</div>
              <div className="grayscale opacity-80 hover:opacity-100 transition-opacity">Logo D</div>
              <div className="grayscale opacity-80 hover:opacity-100 transition-opacity">Logo E</div>
              <div className="grayscale opacity-80 hover:opacity-100 transition-opacity">Logo F</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto py-20 md:py-28 px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">The Modern Toolkit for Your Business</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              We provide the tools to make your invoicing process seamless, professional, and efficient.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: "Effortless Invoicing", desc: "Create and customize professional invoices in just a few clicks. No complications." },
              { icon: Briefcase, title: "Simple Client Management", desc: "Keep all your client information organized and accessible from one dashboard." },
              { icon: Clock, title: "Save Time & Get Paid Faster", desc: "Track invoice status, send reminders, and accept online payments to speed up your cash flow." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-2">
                <Icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-muted/50 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Pricing That Scales With You</h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Start for free and upgrade when you're ready. No hidden fees, no surprises.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              {plans.map((plan) => (
                <Card key={plan.name} className={`flex flex-col ${plan.highlight ? "border-primary ring-2 ring-primary" : "border"}`}>
                  <CardHeader>
                    <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
                    <CardDescription className="flex items-baseline pt-2">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="ml-2 text-muted-foreground">/ {plan.period}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-center gap-3">
                          <Check className="text-primary h-5 w-5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full text-lg py-6" variant={plan.highlight ? "default" : "outline"} onClick={plan.cta}>
                      {plan.ctaLabel}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
          <p>© {new Date().getFullYear()} HonestInvoice. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Pricing</button>
          </nav>
        </div>
      </footer>
    </div>
  );
};

const getFeaturesByPlan = (planName: string): string[] => {
  const features: { [key: string]: string[] } = {
    Pro: [
      "Everything in Free, plus:",
      "Unlimited clients",
      "Custom branding & logo",
      "Advanced reporting",
      "Priority email & chat support",
    ]
  };
  return features[planName] || [];
};

export default Index;

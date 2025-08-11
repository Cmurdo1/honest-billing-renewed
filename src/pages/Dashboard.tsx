import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const updateSeo = (title: string, description: string) => {
  document.title = title;
  const ensure = (sel: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(sel) as HTMLElement | null;
    if (!el) { el = create(); document.head.appendChild(el); }
    return el;
  };
  (ensure('meta[name="description"]', () => { const m = document.createElement('meta'); m.setAttribute('name','description'); return m; }) as HTMLMetaElement)
    .setAttribute('content', description);
  (ensure('link[rel="canonical"]', () => { const l = document.createElement('link'); l.setAttribute('rel','canonical'); return l; }) as HTMLLinkElement)
    .setAttribute('href', window.location.href);
};

const Dashboard = () => {
  const { user, signOut } = useAuth();

  useEffect(() => {
    updateSeo(
      "Dashboard | HonestInvoice",
      "HonestInvoice dashboard: manage clients, invoices, and subscriptions."
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </header>
      <main className="container mx-auto px-4 py-8">
        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium">Welcome{user?.email ? `, ${user.email}` : ""}</h2>
          <p className="text-muted-foreground mt-1">
            You’re signed in. This is where your client and invoice data will live.
          </p>
          <div className="mt-6">
            <Button variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

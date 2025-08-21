import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import Overview from "./dashboard/Overview";
import Clients from "./dashboard/Clients";
import Invoices from "./dashboard/Invoices";
import RecurringInvoices from "./dashboard/RecurringInvoices";
import Settings from "./dashboard/Settings";
import Analytics from "./dashboard/Analytics";
import CustomBranding from "./dashboard/CustomBranding";

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
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    updateSeo(
      "Dashboard | HonestInvoice",
      "HonestInvoice dashboard: manage clients, invoices, and subscriptions."
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b border-primary/20 flex items-center justify-between bg-gradient-to-r from-background to-primary/5">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity" aria-label="Go to Dashboard">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">HI</span>
            <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
          </Link>
          <SubscriptionStatus />
        </div>
        <div>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main>
        <Tabs defaultValue={defaultTab} className="container mx-auto px-4 py-8">
          <TabsList className="mb-4 grid grid-cols-7 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview />
          </TabsContent>
          <TabsContent value="clients">
            <Clients />
          </TabsContent>
          <TabsContent value="invoices">
            <Invoices />
          </TabsContent>
          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>
          <TabsContent value="branding">
            <CustomBranding />
          </TabsContent>
          <TabsContent value="recurring">
            <RecurringInvoices />
          </TabsContent>
          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Overview from "./dashboard/Overview";
import Clients from "./dashboard/Clients";
import Invoices from "./dashboard/Invoices";
import Settings from "./dashboard/Settings";

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
      <header className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main>
        <Tabs defaultValue="overview" className="container mx-auto px-4 py-8">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
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
          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

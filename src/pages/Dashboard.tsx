import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import Overview from "./dashboard/Overview";
import Clients from "./dashboard/Clients";
import Quotes from "./dashboard/Quotes";
import Invoices from "./dashboard/Invoices";
import TimeTracking from "./dashboard/TimeTracking";
import Expenses from "./dashboard/Expenses";
import Reports from "./dashboard/Reports";
import PaymentReminders from "./dashboard/PaymentReminders";
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
      "HonestInvoice dashboard: manage clients, quotes, invoices, time tracking, expenses and more."
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 sm:px-6 py-4 border-b border-primary/20 bg-gradient-to-r from-background to-primary/5">
        {/* Mobile layout - stacked */}
        <div className="flex flex-col gap-3 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">HI</span>
              <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
            </div>
            <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
          </div>
          <div className="flex justify-center">
            <SubscriptionStatus />
          </div>
        </div>
        
        {/* Desktop layout - single row */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">HI</span>
              <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
            </div>
            <SubscriptionStatus />
          </div>
          <div>
            <Button variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main>
        <Tabs defaultValue={defaultTab} className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:flex lg:w-auto lg:justify-center gap-1 h-auto p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Overview</TabsTrigger>
              <TabsTrigger value="clients" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Clients</TabsTrigger>
              <TabsTrigger value="quotes" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Quotes</TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Invoices</TabsTrigger>
              <TabsTrigger value="time" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Time</TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Expenses</TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Reminders</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Reports</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-3 py-2 flex-shrink-0">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview"><Overview /></TabsContent>
          <TabsContent value="clients"><Clients /></TabsContent>
          <TabsContent value="quotes"><Quotes /></TabsContent>
          <TabsContent value="invoices"><Invoices /></TabsContent>
          <TabsContent value="time"><TimeTracking /></TabsContent>
          <TabsContent value="expenses"><Expenses /></TabsContent>
          <TabsContent value="reminders"><PaymentReminders /></TabsContent>
          <TabsContent value="reports"><Reports /></TabsContent>
          <TabsContent value="analytics"><Analytics /></TabsContent>
          <TabsContent value="branding"><CustomBranding /></TabsContent>
          <TabsContent value="recurring"><RecurringInvoices /></TabsContent>
          <TabsContent value="settings"><Settings /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
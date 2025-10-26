import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { Briefcase } from "lucide-react";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    updateSeo(
      "Dashboard | HonestInvoice",
      "Manage clients, invoices, and business finances with the HonestInvoice dashboard."
    );
  }, []);

  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg hidden sm:inline">HonestInvoice</span>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionStatus />
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue={defaultTab} onValueChange={onTabChange} className="flex flex-col md:flex-row md:gap-8">
          <TabsList className="flex flex-col h-auto p-0 bg-transparent items-start mb-6 md:mb-0 md:border-r md:pr-6">
            <TabsTrigger value="overview" className="w-full justify-start px-4 py-2 text-md">Overview</TabsTrigger>
            <TabsTrigger value="clients" className="w-full justify-start px-4 py-2 text-md">Clients</TabsTrigger>
            <TabsTrigger value="quotes" className="w-full justify-start px-4 py-2 text-md">Quotes</TabsTrigger>
            <TabsTrigger value="invoices" className="w-full justify-start px-4 py-2 text-md">Invoices</TabsTrigger>
            <TabsTrigger value="time" className="w-full justify-start px-4 py-2 text-md">Time Tracking</TabsTrigger>
            <TabsTrigger value="expenses" className="w-full justify-start px-4 py-2 text-md">Expenses</TabsTrigger>
            <TabsTrigger value="reports" className="w-full justify-start px-4 py-2 text-md">Reports</TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-2 text-md">Settings</TabsTrigger>
          </TabsList>

          <div className="flex-grow">
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
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

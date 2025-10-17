import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireProAccess } from '@/hooks/useProAccess';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle, Zap, BarChart, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ProAccess = () => {
  const { hasAccess, isLoading, needsUpgrade } = useRequireProAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !hasAccess && needsUpgrade) {
      // User doesn't have pro access, they can stay on this page to see upgrade info
    }
  }, [hasAccess, isLoading, needsUpgrade]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
        <Header />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="default" className="mb-4">
              <Crown className="h-4 w-4 mr-2" />
              Pro Member
            </Badge>
            <h1 className="text-4xl font-bold mb-4">Welcome to Pro Access</h1>
            <p className="text-xl text-muted-foreground">
              You have full access to all premium features
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-primary/20">
              <CardHeader>
                <BarChart className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Detailed insights into your business performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/dashboard?tab=analytics')} 
                  className="w-full"
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Recurring Invoices</CardTitle>
                <CardDescription>
                  Automate your billing with recurring templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/dashboard?tab=recurring')} 
                  className="w-full"
                >
                  Manage Recurring
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <Palette className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Custom Branding</CardTitle>
                <CardDescription>
                  Customize your invoices with your brand
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/dashboard?tab=branding')} 
                  className="w-full"
                >
                  Customize Branding
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <Header />
      <Card className="max-w-2xl w-full border-primary/20">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
            <Crown className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-2">Upgrade to Pro</CardTitle>
          <CardDescription className="text-lg">
            Unlock powerful features to grow your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Advanced Analytics & Reporting</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Automated Recurring Invoices</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Custom Branding & Templates</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Priority Support</span>
            </div>
          </div>
          
          <div className="text-center pt-6">
            <Button 
              size="lg" 
              className="w-full text-lg py-6"
              onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Pro - $4.99/month
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="w-full mt-4"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProAccess;
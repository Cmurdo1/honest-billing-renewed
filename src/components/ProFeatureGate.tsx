import { ReactNode } from 'react';
import { useRequireProAccess } from '@/hooks/useProAccess';
import { useCreateCheckout } from '@/hooks/useStripe';
import { stripeProducts } from '@/stripe-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProFeatureGateProps {
  children: ReactNode;
  featureName: string;
  description?: string;
  fallback?: ReactNode;
}

const ProFeatureGate = ({ children, featureName, description, fallback }: ProFeatureGateProps) => {
  const { hasAccess, isLoading: isAccessLoading } = useRequireProAccess();
  const { mutate: createCheckout, isPending: isCheckoutPending } = useCreateCheckout();

  const handleUpgrade = () => {
    const proProduct = stripeProducts.find(p => p.id === 'pro_tier');
    if (proProduct) {
      createCheckout({ priceId: proProduct.priceId });
    }
  };

  const isLoading = isAccessLoading || isCheckoutPending;

  if (isAccessLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-primary" />
          <Badge variant="secondary" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Pro Feature
          </Badge>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          {featureName}
        </CardTitle>
        {description && (
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to Pro to unlock this feature and get access to advanced tools.
        </p>
        <Button 
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          Upgrade to Pro - $4.99/month
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProFeatureGate;
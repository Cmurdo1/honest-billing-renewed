import { ReactNode } from 'react';
import { useRequireProAccess } from '@/hooks/useProAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProFeatureGateProps {
  children: ReactNode;
  featureName: string;
  description?: string;
  fallback?: ReactNode;
}

const ProFeatureGate = ({ children, featureName, description, fallback }: ProFeatureGateProps) => {
  const { hasAccess, isLoading, needsUpgrade } = useRequireProAccess();

  if (isLoading) {
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
          onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
          className="w-full"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro - $4.99/month
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProFeatureGate;
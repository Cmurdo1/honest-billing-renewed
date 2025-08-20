import { useSubscription } from '@/hooks/useStripe';
import { useRefreshSubscription } from '@/hooks/useRefreshSubscription';
import { getProductByPriceId } from '@/stripe-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, RefreshCw } from 'lucide-react';

const SubscriptionStatus = () => {
  const { data: subscription, isLoading } = useSubscription();
  const refreshSubscription = useRefreshSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!subscription || !subscription.price_id) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        Free Plan
      </Badge>
    );
  }

  const product = getProductByPriceId(subscription.price_id);
  const isActive = subscription.status === 'active';

  if (!product) {
    return (
      <Badge variant="secondary">
        Unknown Plan
      </Badge>
    );
  }

  const getIcon = () => {
    if (product.name === 'Business') return <Crown className="h-3 w-3" />;
    if (product.name === 'Pro') return <Zap className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isActive ? 'default' : 'secondary'} 
        className="flex items-center gap-1"
      >
        {getIcon()}
        {product.name}
        {!isActive && ` (${subscription.status})`}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => refreshSubscription.mutate()}
        disabled={refreshSubscription.isPending}
        className="h-6 w-6 p-0"
      >
        <RefreshCw className={`h-3 w-3 ${refreshSubscription.isPending ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};

export default SubscriptionStatus;
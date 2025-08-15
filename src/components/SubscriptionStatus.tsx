import { useSubscription } from '@/hooks/useStripe';
import { getProductByPriceId } from '@/stripe-config';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap } from 'lucide-react';

const SubscriptionStatus = () => {
  const { data: subscription, isLoading } = useSubscription();

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
  const isActive = subscription.subscription_status === 'active';

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
    <Badge 
      variant={isActive ? 'default' : 'secondary'} 
      className="flex items-center gap-1"
    >
      {getIcon()}
      {product.name}
      {!isActive && ` (${subscription.subscription_status})`}
    </Badge>
  );
};

export default SubscriptionStatus;
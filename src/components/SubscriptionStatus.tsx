import { useProAccess } from '@/hooks/useProAccess';
import { getProductByPriceId } from '@/stripe-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw, Crown, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const getStatusInfo = (status: string | null, currentPeriodEnd: string | null) => {
  const now = new Date();
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const isExpired = periodEnd && periodEnd < now;
  
  switch (status?.toLowerCase()) {
    case 'active':
      return {
        label: 'Active',
        color: 'bg-green-500',
        icon: CheckCircle,
        variant: 'default' as const,
        description: isExpired ? 'Subscription expired' : 'Your subscription is active'
      };
    case 'trialing':
      return {
        label: 'Trial',
        color: 'bg-blue-500',
        icon: Clock,
        variant: 'secondary' as const,
        description: 'You are in a trial period'
      };
    case 'past_due':
      return {
        label: 'Past Due',
        color: 'bg-yellow-500',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        description: 'Payment is past due but still in grace period'
      };
    case 'canceled':
    case 'cancelled':
      return {
        label: 'Canceled',
        color: 'bg-red-500',
        icon: XCircle,
        variant: 'destructive' as const,
        description: 'Subscription has been canceled'
      };
    case 'incomplete':
      return {
        label: 'Incomplete',
        color: 'bg-orange-500',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        description: 'Payment setup is incomplete'
      };
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-blue-400',
        icon: Clock,
        variant: 'secondary' as const,
        description: 'Subscription is being processed'
      };
    default:
      return {
        label: 'Free',
        color: 'bg-gray-500',
        icon: XCircle,
        variant: 'secondary' as const,
        description: 'No active subscription'
      };
  }
};

export const SubscriptionStatus = () => {
  const { 
    subscription, 
    isPro, 
    isLoading, 
    isOptimistic, 
    refreshSubscription, 
    canRefresh 
  } = useProAccess();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const statusInfo = getStatusInfo(subscription?.status, subscription?.current_period_end);
  const Icon = statusInfo.icon;
  const product = subscription?.price_id ? getProductByPriceId(subscription.price_id) : null;

  const handleRefresh = () => {
    if (canRefresh) {
      refreshSubscription();
    } else {
      toast.info('Please wait, already refreshing...');
    }
  };

  const getProductIcon = () => {
    if (product?.name === 'Business') return <Crown className="h-3 w-3" />;
    if (product?.name === 'Pro') return <Zap className="h-3 w-3" />;
    return null;
  };

  return (
    <div className={`flex items-center gap-2 ${isOptimistic ? 'opacity-75' : ''}`}>
      <Badge 
        variant={statusInfo.variant} 
        className="flex items-center gap-1"
      >
        <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
        {getProductIcon()}
        {product ? product.name : statusInfo.label}
        {!isPro && subscription?.status && ` (${subscription.status})`}
      </Badge>
      
      {isOptimistic && (
        <Badge variant="outline" className="text-xs animate-pulse">
          Updating...
        </Badge>
      )}
      
      <Button
        onClick={handleRefresh}
        disabled={!canRefresh}
        size="sm"
        variant="ghost"
        className="h-auto p-1"
        title="Refresh subscription status"
      >
        <RefreshCw className={`h-3 w-3 ${!canRefresh ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};

// Detailed subscription status card for settings/billing pages
export const DetailedSubscriptionStatus = () => {
  const { 
    subscription, 
    isPro, 
    isLoading, 
    isOptimistic, 
    refreshSubscription, 
    canRefresh 
  } = useProAccess();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading Subscription Status
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(subscription?.status, subscription?.current_period_end);
  const Icon = statusInfo.icon;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const product = subscription?.price_id ? getProductByPriceId(subscription.price_id) : null;

  const handleRefresh = () => {
    if (canRefresh) {
      refreshSubscription();
    } else {
      toast.info('Please wait, already refreshing...');
    }
  };

  return (
    <Card className={isOptimistic ? 'border-blue-300 bg-blue-50/50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 text-white`} />
            Subscription Status
            {isOptimistic && (
              <Badge variant="outline" className="text-xs">
                Updating...
              </Badge>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={!canRefresh}
            size="sm"
            variant="ghost"
            className="h-auto p-1"
          >
            <RefreshCw className={`h-3 w-3 ${!canRefresh ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>{statusInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
            {statusInfo.label}
          </Badge>
          <Badge variant={isPro ? 'default' : 'secondary'}>
            {isPro ? 'Pro Features Enabled' : 'Free Plan'}
          </Badge>
          {product && (
            <Badge variant="outline" className="flex items-center gap-1">
              {product.name === 'Business' && <Crown className="h-3 w-3" />}
              {product.name === 'Pro' && <Zap className="h-3 w-3" />}
              {product.name}
            </Badge>
          )}
        </div>
        
        {subscription && (
          <div className="space-y-2 text-sm">
            {subscription.price_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{product?.name || subscription.price_id}</span>
              </div>
            )}
            
            {periodEnd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period End:</span>
                <span className="font-medium">
                  {format(periodEnd, 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            
            {subscription.updated_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium text-xs">
                  {format(new Date(subscription.updated_at), 'MMM dd, HH:mm')}
                </span>
              </div>
            )}
          </div>
        )}
        
        {isOptimistic && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            ⚡ Status is being updated in real-time
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
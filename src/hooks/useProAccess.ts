import { useOptimisticSubscription, useRefreshSubscription } from './useStripe';
import { toast } from 'sonner';

// Centralized rule for Pro access, including grace periods and trials
function computeProAccess(subscription: { status?: string | null; current_period_end?: string | null } | null) {
  if (!subscription) return false;

  const status = (subscription.status || '').toLowerCase();
  const now = Date.now();
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : undefined;

  // Grant access when active or trialing regardless of price_id source
  if (status === 'active' || status === 'trialing') return true;

  // Allow grace if past_due but still within current billing period
  if (status === 'past_due' && periodEnd && periodEnd > now) return true;

  return false;
}

export const useProAccess = () => {
  const { data: subscription, isLoading, isOptimistic } = useOptimisticSubscription();
  const refreshSubscription = useRefreshSubscription();

  const isPro = computeProAccess(subscription as any);

  // Auto-refresh if we expect pro access but don't have it
  const handleRefreshIfNeeded = () => {
    if (!isPro && !isLoading && subscription) {
      console.info('Pro access expected but not detected, refreshing subscription');
      refreshSubscription.mutate();
    }
  };

  return {
    isPro,
    isLoading: isLoading || refreshSubscription.isPending,
    subscription,
    isOptimistic,
    refreshSubscription: handleRefreshIfNeeded,
    canRefresh: !refreshSubscription.isPending
  };
};

export const useRequireProAccess = () => {
  const { isPro, isLoading, refreshSubscription, canRefresh } = useProAccess();

  const handleUpgradeOrRefresh = () => {
    if (canRefresh) {
      refreshSubscription();
    } else {
      toast.info('Please wait while we check your subscription status...');
    }
  };

  return {
    hasAccess: isPro,
    isLoading,
    needsUpgrade: !isPro && !isLoading,
    onUpgradeOrRefresh: handleUpgradeOrRefresh,
    canRefresh
  };
};
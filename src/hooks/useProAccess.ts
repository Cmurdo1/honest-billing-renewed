import { useSubscription } from './useStripe';

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
  const { data: subscription, isLoading } = useSubscription();

  const isPro = computeProAccess(subscription as any);

  return {
    isPro,
    isLoading,
    subscription
  };
};

export const useRequireProAccess = () => {
  const { isPro, isLoading } = useProAccess();

  return {
    hasAccess: isPro,
    isLoading,
    needsUpgrade: !isPro && !isLoading
  };
};
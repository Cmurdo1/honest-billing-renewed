import { useSubscription } from './useStripe';

export const useProAccess = () => {
  const { data: subscription, isLoading } = useSubscription();
  
  const isPro = subscription?.status === 'active' && subscription?.price_id === 'pro_tier';
  
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
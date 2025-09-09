import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useProAccess = () => {
  const { user } = useAuth();
  
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - keep data fresh for 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes - keep in cache for 60 minutes
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't refetch when reconnecting
  });
  
  const isPro = subscription?.status === 'active';
  
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
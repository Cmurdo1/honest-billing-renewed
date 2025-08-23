import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export interface SubscriptionData {
  id?: string;
  user_id?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: string | null;
  price_id: string | null;
  current_period_start?: string | null;
  current_period_end: string | null;
  created_at?: string;
  updated_at?: string;
  // allow the view field name for compatibility
  subscription_status?: string | null;
}

// Normalize various sources (table vs view) into a consistent shape
function normalizeSubscription(raw: any | null): SubscriptionData | null {
  if (!raw) return null;
  
  const status = (raw.status ?? raw.subscription_status ?? null) as string | null;
  
  // Enhanced period end handling with better logging
  let cpe: string | null = null;
  const rawEnd = raw.current_period_end ?? null;
  
  if (rawEnd === null || rawEnd === undefined) {
    cpe = null;
  } else if (typeof rawEnd === 'number') {
    cpe = new Date(rawEnd * 1000).toISOString();
  } else if (/^\d+$/.test(String(rawEnd))) {
    cpe = new Date(Number(rawEnd) * 1000).toISOString();
  } else {
    cpe = String(rawEnd);
  }
  
  const normalized = {
    status,
    price_id: raw.price_id ?? null,
    current_period_end: cpe,
    id: raw.id,
    user_id: raw.user_id,
    stripe_customer_id: raw.stripe_customer_id ?? raw.customer_id ?? null,
    stripe_subscription_id: raw.stripe_subscription_id ?? raw.subscription_id ?? null,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    subscription_status: raw.subscription_status ?? null,
  };
  
  console.debug('Normalized subscription data:', {
    status: normalized.status,
    price_id: normalized.price_id,
    current_period_end: normalized.current_period_end,
    updated_at: normalized.updated_at
  });
  
  return normalized;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  // Handle checkout success detection and cache invalidation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    
    if (checkoutStatus === 'success') {
      console.info('Checkout success detected, invalidating subscription cache');
      
      // Invalidate immediately
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      
      // Schedule additional invalidations to catch delayed webhook processing
      const scheduleInvalidation = (delay: number) => {
        setTimeout(() => {
          console.info(`Scheduled invalidation after ${delay}ms`);
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
        }, delay);
      };
      
      scheduleInvalidation(2000);  // 2 seconds
      scheduleInvalidation(5000);  // 5 seconds
      scheduleInvalidation(10000); // 10 seconds
      
      // Clean up URL parameter to prevent repeated invalidation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [queryClient]);

  return useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3 && error?.code !== 'PGRST116') {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async (): Promise<SubscriptionData | null> => {
      console.info(`Fetching subscription data (attempt ${retryCount + 1})`);
      
      // Try user-scoped table first (if your project uses it)
      const tableRes = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!tableRes.error && tableRes.data) {
        console.info('Subscription data fetched from user table');
        return normalizeSubscription(tableRes.data);
      }

      // Fall back to secure view (filtered by auth.uid())
      const viewRes = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (viewRes.error) {
        console.error('Error fetching subscription:', viewRes.error);
        throw viewRes.error;
      }

      if (viewRes.data) {
        console.info('Subscription data fetched from view');
      } else {
        console.info('No subscription data found');
      }

      return normalizeSubscription(viewRes.data);
    },
  });
};

// Hook for optimistic subscription updates
export const useOptimisticSubscription = () => {
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const subscription = useSubscription();
  const queryClient = useQueryClient();

  const updateOptimisticStatus = (status: string) => {
    console.info(`Setting optimistic subscription status: ${status}`);
    setOptimisticStatus(status);
    
    // Clear optimistic status after 30 seconds
    setTimeout(() => {
      setOptimisticStatus(null);
      // Force a fresh fetch
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }, 30000);
  };

  const data = optimisticStatus && subscription.data 
    ? { ...subscription.data, status: optimisticStatus }
    : subscription.data;

  return {
    ...subscription,
    data,
    updateOptimisticStatus,
    isOptimistic: !!optimisticStatus
  };
};

// Hook for manual subscription refresh
export const useRefreshSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      console.info('Manually refreshing subscription data');
      
      // Clear existing cache
      await queryClient.cancelQueries({ queryKey: ['subscription'] });
      queryClient.removeQueries({ queryKey: ['subscription'] });
      
      // Fetch fresh data
      return queryClient.fetchQuery({
        queryKey: ['subscription', user?.id],
        queryFn: async (): Promise<SubscriptionData | null> => {
          const viewRes = await supabase
            .from('stripe_user_subscriptions')
            .select('*')
            .maybeSingle();

          if (viewRes.error) {
            throw viewRes.error;
          }

          return normalizeSubscription(viewRes.data);
        },
      });
    },
    onSuccess: () => {
      toast.success('Subscription status refreshed');
    },
    onError: (error: Error) => {
      console.error('Error refreshing subscription:', error);
      toast.error('Failed to refresh subscription status');
    },
  });
};

export const useCreateCheckout = () => {
  const queryClient = useQueryClient();
  const { updateOptimisticStatus } = useOptimisticSubscription();

  return useMutation({
    mutationFn: async ({
      priceId,
      mode = 'subscription',
    }: {
      priceId: string;
      mode?: 'payment' | 'subscription';
    }) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const baseUrl = window.location.origin;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            price_id: priceId,
            success_url: `${baseUrl}/dashboard?checkout=success`,
            cancel_url: `${baseUrl}/dashboard?checkout=canceled`,
            mode,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      return url;
    },
    onMutate: () => {
      // Set optimistic status when initiating checkout
      updateOptimisticStatus('pending');
    },
    onSuccess: (url: string) => {
      // Set optimistic status to active when redirecting to checkout
      updateOptimisticStatus('active');
      window.location.href = url;
    },
    onError: (error: Error) => {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout');
    },
    onSettled: () => {
      // Schedule invalidation for when user returns
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      }, 1000);
    },
  });
};
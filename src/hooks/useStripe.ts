import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  // current_period_end can be bigint epoch (from stripe_subscriptions via view) or ISO string
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
  return {
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
}

export const useSubscription = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SubscriptionData | null> => {
      // Try user-scoped table first (if your project uses it)
      const tableRes = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!tableRes.error && tableRes.data) {
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

      return normalizeSubscription(viewRes.data);
    },
  });
};

export const useCreateCheckout = () => {
  const queryClient = useQueryClient();

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
    onSuccess: (url: string) => {
      window.location.href = url;
    },
    onError: (error: Error) => {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
};
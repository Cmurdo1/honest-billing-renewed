import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SubscriptionData {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SubscriptionData | null> => {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        throw error;
      }

      return data;
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
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubscription, useCreateCheckout } from '@/hooks/useStripe';
import { stripeProducts, getProductByPriceId } from '@/stripe-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

const Billing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const createCheckout = useCreateCheckout();

  // Handle checkout success/cancel messages
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Payment successful! Your subscription is now active.');
      setSearchParams(new URLSearchParams()); // Clear the URL parameter
    } else if (checkout === 'canceled') {
      toast.error('Checkout was canceled. You can try again anytime.');
      setSearchParams(new URLSearchParams()); // Clear the URL parameter
    }
  }, [searchParams, setSearchParams]);

  const currentProduct = subscription?.price_id 
    ? getProductByPriceId(subscription.price_id)
    : null;

  const isActiveSubscription = subscription?.status === 'active';

  const handleUpgrade = () => {
    window.open(config.stripe.checkoutUrl, "_blank");
  };

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">
                    {currentProduct?.name || 'Unknown Plan'}
                  </span>
                  <Badge variant={isActiveSubscription ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentProduct?.description || 'Subscription plan'}
                </p>
                {subscription.current_period_end && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Renews on{' '}
                      {new Date(subscription.current_period_end!).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              {currentProduct && (
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ${currentProduct.price}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">
          {subscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
        </h2>
          <div className="grid gap-6 md:grid-cols-1 max-w-md">
          {stripeProducts.map((product) => {
            const isCurrentPlan = currentProduct?.id === product.id;
            const isDowngrade = currentProduct && currentProduct.price > product.price;

            return (
              <Card 
                key={product.id} 
                className={`relative ${isCurrentPlan ? 'border-primary' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge>Current Plan</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{product.name}</span>
                    {product.name === 'Pro' && (
                      <Badge variant="secondary">Popular</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                  <div className="text-3xl font-bold">
                    ${product.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3 mb-6">
                    {getFeaturesByPlan(product.name).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'secondary' : 'default'}
                    disabled={isCurrentPlan || createCheckout.isPending || isDowngrade}
                    onClick={handleUpgrade}
                  >
                    {createCheckout.isPending ? (
                      'Processing...'
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : isDowngrade ? (
                      'Contact Support'
                    ) : subscription ? (
                      'Upgrade'
                    ) : (
                      'Get Started'
                    )}
                  </Button>

                  {isDowngrade && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Contact support to downgrade your plan
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const getFeaturesByPlan = (planName: string): string[] => {
  const features = {
    Pro: [
      'Unlimited clients',
      'Custom branding & logo',
      'Advanced reporting',
      'Priority support',
      'Export to PDF',
      'Saved items & taxes'
    ]
  };

  return features[planName as keyof typeof features] || [];
};

export default Billing;
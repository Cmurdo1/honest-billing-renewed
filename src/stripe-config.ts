export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
}

const proPriceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;

if (!proPriceId) {
  throw new Error("VITE_STRIPE_PRO_PRICE_ID must be set in the environment.");
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'pro_tier',
    priceId: proPriceId,
    name: 'Pro',
    description: 'Pro membership with advanced features',
    mode: 'subscription',
    price: 4.99,
    currency: 'USD'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};
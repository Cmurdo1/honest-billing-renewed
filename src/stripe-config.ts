export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_STuTlUrwzbpkJ9',
    priceId: 'price_1RYweXEUGnEA4Zn8W34OgVye',
    name: 'Pro',
    description: 'pro membership',
    mode: 'subscription',
    price: 9.00,
    currency: 'USD'
  },
  {
    id: 'prod_STuUBI2us0kbQX',
    priceId: 'price_1RYwfcEUGnEA4Zn8B0Duhxs6',
    name: 'Business',
    description: 'business membership',
    mode: 'subscription',
    price: 19.00,
    currency: 'USD'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};
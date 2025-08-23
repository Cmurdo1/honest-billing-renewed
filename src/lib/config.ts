// Application configuration
export const config = {
  // Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  
  // Stripe
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    proPriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    checkoutUrl: import.meta.env.VITE_STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03',
  },
  
  // Application
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    name: import.meta.env.VITE_APP_NAME || 'HonestInvoice',
  },
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Business Logic
  limits: {
    freeClientLimit: 5,
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

export const validateConfig = () => {
  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

// Call validation on module load in development
if (config.isDevelopment) {
  validateConfig();
}

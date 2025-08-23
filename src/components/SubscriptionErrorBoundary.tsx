import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRefreshSubscription } from '@/hooks/useStripe';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SubscriptionErrorBoundary: React.FC<SubscriptionErrorBoundaryProps> = ({ 
  children, 
  fallback 
}) => {
  const refreshSubscription = useRefreshSubscription();
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('subscription') || 
          event.error?.message?.includes('stripe')) {
        setHasError(true);
        setError(event.error);
        console.error('Subscription error caught:', event.error);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleRefresh = () => {
    setHasError(false);
    setError(null);
    refreshSubscription.mutate(undefined, {
      onSuccess: () => {
        toast.success('Subscription status refreshed successfully');
      },
      onError: (error) => {
        toast.error('Failed to refresh subscription status');
        setHasError(true);
        setError(error as Error);
      }
    });
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant=\"destructive\" className=\"mb-4\">
        <AlertTriangle className=\"h-4 w-4\" />
        <AlertDescription className=\"flex flex-col gap-3\">
          <div>
            <p className=\"font-medium\">Subscription Status Error</p>
            <p className=\"text-sm text-muted-foreground mt-1\">
              We're having trouble loading your subscription status. This might be temporary.
            </p>
            {error && (
              <details className=\"mt-2\">
                <summary className=\"text-xs cursor-pointer\">Error details</summary>
                <pre className=\"text-xs mt-1 p-2 bg-muted rounded\">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
          <div className=\"flex gap-2\">
            <Button 
              onClick={handleRefresh} 
              size=\"sm\" 
              disabled={refreshSubscription.isPending}
              variant=\"outline\"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${refreshSubscription.isPending ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            <Button 
              onClick={handleReload} 
              size=\"sm\" 
              variant=\"secondary\"
            >
              Reload Page
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

// Hook for manually triggering subscription error boundary
export const useSubscriptionErrorHandler = () => {
  return {
    reportSubscriptionError: (error: Error) => {
      console.error('Subscription error reported:', error);
      // Dispatch a custom error event that the boundary can catch
      window.dispatchEvent(new ErrorEvent('error', { error }));
    }
  };
};

export default SubscriptionErrorBoundary;
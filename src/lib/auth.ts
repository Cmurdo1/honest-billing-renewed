export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');

    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error("Error cleaning up sessionStorage:", e);
      }
    }
  } catch (e) {
    console.error("Error cleaning up auth state:", e);
  }
};

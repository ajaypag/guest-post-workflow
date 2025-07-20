import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface ActiveOperations {
  agentRunning: boolean;
  autoSaveInProgress: boolean;
  hasUnsavedChanges: boolean;
  lastSaveTimestamp: number | null;
  lastSaveHash: string | null;
}

interface NavigationGuardOptions {
  activeOperations: ActiveOperations;
  onSaveRequest: () => Promise<boolean>;
  workflowId?: string;
}

export function useNavigationGuard({
  activeOperations,
  onSaveRequest,
  workflowId
}: NavigationGuardOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = useRef(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''));
  const navigationPending = useRef(false);

  // Generate a simple hash of content for comparison
  const generateHash = useCallback((content: any): string => {
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }, []);

  // Monitor pathname changes for app router
  useEffect(() => {
    const newPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Check if path actually changed
    if (newPath !== currentPath.current && !navigationPending.current) {
      // Navigation is happening, but we're too late to prevent it
      // Log for debugging
      console.log('Navigation detected after the fact:', currentPath.current, '->', newPath);
      currentPath.current = newPath;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Browser-level navigation protection (refresh, close, etc)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeOperations.agentRunning || activeOperations.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Override router.push to add our guard
    const originalPush = router.push;
    const originalReplace = router.replace;
    const originalBack = router.back;
    const originalForward = router.forward;

    const guardedNavigation = async (
      navigationFn: Function, 
      url?: string,
      options?: any
    ) => {
      // Skip if no active operations
      if (!activeOperations.agentRunning && !activeOperations.hasUnsavedChanges) {
        return navigationFn.call(router, url, options);
      }

      navigationPending.current = true;

      // Check if agent is running
      if (activeOperations.agentRunning) {
        const message = 'An AI agent is currently generating content. Leaving will stop the generation and may lose progress. Are you sure you want to leave?';
        
        if (!window.confirm(message)) {
          navigationPending.current = false;
          return; // Cancel navigation
        } else {
          toast.warning('AI generation stopped due to navigation');
          return navigationFn.call(router, url, options);
        }
      }

      // Check for unsaved changes
      if (activeOperations.hasUnsavedChanges) {
        const shouldSave = window.confirm('You have unsaved changes. Would you like to save before leaving?');
        
        if (shouldSave) {
          // Attempt to save
          const toastId = toast.loading('Saving your changes...');
          
          try {
            const success = await onSaveRequest();
            toast.dismiss(toastId);
            
            if (success) {
              toast.success('Changes saved successfully');
              return navigationFn.call(router, url, options);
            } else {
              toast.error('Failed to save changes. Please try again.');
              navigationPending.current = false;
              return; // Cancel navigation
            }
          } catch (error: any) {
            toast.dismiss(toastId);
            toast.error('Error saving changes: ' + error.message);
            navigationPending.current = false;
            return; // Cancel navigation
          }
        } else {
          // User chose not to save
          const confirmLeave = window.confirm('Are you sure you want to leave without saving?');
          if (confirmLeave) {
            return navigationFn.call(router, url, options);
          } else {
            navigationPending.current = false;
            return; // Cancel navigation
          }
        }
      }
    };

    // Override navigation methods
    router.push = (url: string, options?: any) => guardedNavigation(originalPush, url, options);
    router.replace = (url: string, options?: any) => guardedNavigation(originalReplace, url, options);
    router.back = () => guardedNavigation(originalBack);
    router.forward = () => guardedNavigation(originalForward);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Restore original methods
      router.push = originalPush;
      router.replace = originalReplace;
      router.back = originalBack;
      router.forward = originalForward;
    };
  }, [activeOperations, onSaveRequest, router]);

  // Return helper functions
  return {
    generateHash
  };
}
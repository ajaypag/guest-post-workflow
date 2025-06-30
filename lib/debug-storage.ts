// Debug utility for localStorage issues
export const debugStorage = {
  // Check localStorage health
  checkLocalStorage: () => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      const result = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      console.log('localStorage is working:', result === 'test');
      return result === 'test';
    } catch (e) {
      console.error('localStorage is not available:', e);
      return false;
    }
  },

  // Get raw localStorage data
  getRawData: () => {
    const key = 'guest-post-workflows';
    const data = localStorage.getItem(key);
    console.log('Raw localStorage data:', data);
    return data;
  },

  // Validate stored data
  validateStoredData: () => {
    try {
      const key = 'guest-post-workflows';
      const data = localStorage.getItem(key);
      if (!data) {
        console.log('No data in localStorage');
        return true;
      }

      const parsed = JSON.parse(data);
      console.log('Parsed data:', parsed);
      
      if (!Array.isArray(parsed)) {
        console.error('Data is not an array');
        return false;
      }

      // Check each workflow
      parsed.forEach((workflow: any, index: number) => {
        console.log(`Workflow ${index}:`, {
          id: workflow.id,
          hasSteps: !!workflow.steps,
          stepsCount: workflow.steps?.length,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        });

        // Check steps
        workflow.steps?.forEach((step: any, stepIndex: number) => {
          console.log(`  Step ${stepIndex}:`, {
            id: step.id,
            hasInputs: !!step.inputs,
            hasOutputs: !!step.outputs,
            inputKeys: Object.keys(step.inputs || {}),
            outputKeys: Object.keys(step.outputs || {})
          });
        });
      });

      return true;
    } catch (e) {
      console.error('Error validating stored data:', e);
      return false;
    }
  },

  // Clear all data (use with caution!)
  clearAll: () => {
    if (confirm('Are you sure you want to clear all workflow data?')) {
      localStorage.removeItem('guest-post-workflows');
      console.log('All workflow data cleared');
    }
  },

  // Fix corrupted data
  fixCorruptedData: () => {
    try {
      const key = 'guest-post-workflows';
      const data = localStorage.getItem(key);
      if (!data) return;

      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        console.error('Data is not an array, resetting to empty array');
        localStorage.setItem(key, '[]');
        return;
      }

      // Fix each workflow
      const fixed = parsed.map((workflow: any) => ({
        ...workflow,
        createdAt: workflow.createdAt || new Date().toISOString(),
        updatedAt: workflow.updatedAt || new Date().toISOString(),
        steps: (workflow.steps || []).map((step: any) => ({
          ...step,
          inputs: step.inputs || {},
          outputs: step.outputs || {},
          status: step.status || 'pending'
        })),
        metadata: workflow.metadata || {}
      }));

      localStorage.setItem(key, JSON.stringify(fixed));
      console.log('Fixed corrupted data');
    } catch (e) {
      console.error('Error fixing data:', e);
    }
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugStorage = debugStorage;
}
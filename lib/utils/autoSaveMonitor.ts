/**
 * Auto-save monitoring utility to help diagnose save issues
 */

export class AutoSaveMonitor {
  private static instance: AutoSaveMonitor;
  private events: any[] = [];
  
  static getInstance(): AutoSaveMonitor {
    if (!AutoSaveMonitor.instance) {
      AutoSaveMonitor.instance = new AutoSaveMonitor();
    }
    return AutoSaveMonitor.instance;
  }
  
  logEvent(type: string, details: any) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      stackTrace: new Error().stack
    };
    
    this.events.push(event);
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
    
    // Dispatch to diagnostic page
    window.dispatchEvent(new CustomEvent(`autosave-${type}`, {
      detail: details
    }));
    
    // Console log for debugging
    console.log(`[AutoSave] ${type}:`, details);
  }
  
  getEvents() {
    return this.events;
  }
  
  clearEvents() {
    this.events = [];
  }
}

// Export singleton instance
export const autoSaveMonitor = AutoSaveMonitor.getInstance();
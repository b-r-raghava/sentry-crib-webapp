import { SafetyContextResult } from '../types/detection';

export type NotificationPermissionState = 'NOT_REQUESTED' | 'GRANTED' | 'DENIED' | 'UNSUPPORTED';

export interface DangerNotificationOptions {
  tag?: string;
  icon?: string;
  timestamp?: number;
}

// SentryCrib Shield Icon SVG Data URI for notification branding
const SENTRYCRIB_NOTIFICATION_ICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2303535e'><path d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z'/></svg>";

export class BrowserNotificationService {
  private isIncidentNotified: boolean = false;
  private activeIncidentId: string | null = null;
  private isEnabledByUser: boolean = true;

  // Check if browser supports the native Notification API
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Get current permission state according to exact specification
  public getPermissionState(): NotificationPermissionState {
    if (!this.isSupported()) {
      return 'UNSUPPORTED';
    }

    const perm = Notification.permission;
    if (perm === 'granted') {
      return 'GRANTED';
    } else if (perm === 'denied') {
      return 'DENIED';
    } else {
      return 'NOT_REQUESTED';
    }
  }

  // Explicit user-controlled permission request
  public async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'UNSUPPORTED';
    }

    if (Notification.permission === 'denied') {
      return 'DENIED';
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        return 'GRANTED';
      } else if (result === 'denied') {
        return 'DENIED';
      } else {
        return 'NOT_REQUESTED';
      }
    } catch (err) {
      console.warn('Notification permission request failed:', err);
      return this.getPermissionState();
    }
  }

  // Enable / disable notification delivery
  public setEnabled(enabled: boolean): void {
    this.isEnabledByUser = enabled;
  }

  public isEnabled(): boolean {
    return this.isEnabledByUser;
  }

  // Dispatch a single native browser notification
  public notifyDanger(
    title: string,
    body: string,
    options?: DangerNotificationOptions
  ): boolean {
    if (!this.isSupported() || !this.isEnabledByUser) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: options?.icon || SENTRYCRIB_NOTIFICATION_ICON,
        tag: options?.tag || 'sentrycrib-danger-alert',
        requireInteraction: true // Stays on screen until user interacts on supported platforms
      });

      // Attempt to focus the monitoring tab when user clicks notification
      notification.onclick = (event) => {
        event.preventDefault();
        try {
          if (typeof window !== 'undefined') {
            window.focus();
          }
        } catch {
          // Graceful fallback if window.focus() is blocked
        }
        try {
          notification.close();
        } catch {
          // Ignore close errors
        }
      };

      return true;
    } catch (err) {
      console.warn('Failed to construct browser notification:', err);
      return false;
    }
  }

  // Consume confirmed safety engine state with strict 5-second persistence confirmation
  public handleSafetyContext(
    safetyResult: SafetyContextResult,
    isMonitoring: boolean
  ): void {
    // Rule 1: Notifications only fire when monitoring is actively running
    if (!isMonitoring) {
      this.resetIncident();
      return;
    }

    // Rule 2: Trigger ONLY when the safety engine marks the danger CONFIRMED after 5 seconds
    if (safetyResult.overallState === 'DANGER' && safetyResult.isDangerConfirmed) {
      // Rule 3: Continuous Incident Deduplication
      // If notification for this continuous danger incident was already sent, DO NOT send additional notifications
      if (!this.isIncidentNotified) {
        this.isIncidentNotified = true;
        this.activeIncidentId = `confirmed-danger-${Date.now()}`;

        // Construct body with actual reason supplied by safety engine
        let dangerReason = safetyResult.statusDescription;

        if (safetyResult.activeRuleCase === 'SHARP_HAZARD_DANGER') {
          dangerReason = 'Person holding a sharp object for more than 5 seconds.';
        } else if (safetyResult.activeRuleCase === 'CASE_A_STRANGER_DANGER') {
          dangerReason = 'An unrecognised person is near the toddler with no authorised caregiver present.';
        } else if (safetyResult.proximityEvents.length > 0) {
          const firstDanger = safetyResult.proximityEvents.find(e => e.isDanger);
          if (firstDanger) {
            dangerReason = firstDanger.description;
          }
        }

        this.notifyDanger(
          'SentryCrib — DANGER',
          dangerReason || 'Immediate nursery intervention advised.',
          {
            tag: this.activeIncidentId,
            timestamp: Date.now()
          }
        );
      }
    } else {
      // Rule 4: Incident Resolution
      // When danger condition resolves (overallState !== 'DANGER'), reset incident notification state
      // so a new danger incident occurring later will trigger a fresh 5s confirmation and notification.
      if (safetyResult.overallState !== 'DANGER') {
        this.resetIncident();
      }
    }
  }

  // Reset active incident state (called on danger resolution or monitoring stop)
  public resetIncident(): void {
    this.isIncidentNotified = false;
    this.activeIncidentId = null;
  }

  // Development-Only Notification Service Test Mechanism
  public sendTestNotification(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    return this.notifyDanger(
      'SentryCrib — System Notification Test',
      'Browser notifications are configured and active for SentryCrib safety monitoring.',
      { tag: `test-notification-${Date.now()}` }
    );
  }
}

export const browserNotificationService = new BrowserNotificationService();

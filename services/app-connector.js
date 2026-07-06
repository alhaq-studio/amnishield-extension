/**
 * AmnShield Extension Connector
 * Communicates with AmnShield Desktop Guardian app
 * 
 * Al-Haq Studio
 * https://alhaq-initiative.org
 */

class AppConnector {
  static API_URL = 'http://localhost:47147';
  static lastCheckTime = 0;
  static isConnected = false;
  static checkInterval = null;

  /**
   * Check if desktop app is running
   */
  static async checkConnection() {
    try {
      const response = await fetch(`${this.API_URL}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        this.lastCheckTime = Date.now();
        return {
          connected: true,
          ...data
        };
      } else {
        this.isConnected = false;
        return { connected: false };
      }
    } catch (error) {
      this.isConnected = false;
      return { connected: false, error: error.message };
    }
  }

  /**
   * Ping the app to maintain connection
   */
  static async ping() {
    try {
      const response = await fetch(`${this.API_URL}/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get auth token from app
   */
  static async getAuthToken() {
    try {
      const response = await fetch(`${this.API_URL}/auth`);
      if (response.ok) {
        const data = await response.json();
        return data.auth_token;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return null;
  }

  /**
   * Sync settings with desktop app
   */
  static async syncSettings(settings) {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.warn('No auth token available');
        return false;
      }

      const response = await fetch(`${this.API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          blocked_domains: settings.customDomains || [],
          keywords: settings.customKeywords || [],
          social_media_enabled: settings.socialMediaBlocking || false,
          haram_content_enabled: settings.haramBlocking || true,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to sync settings:', error);
      return false;
    }
  }

  /**
   * Start periodic connection checking
   */
  static startPeriodicCheck(intervalMs = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    this.checkConnection();

    // Then check periodically
    this.checkInterval = setInterval(async () => {
      await this.ping();
    }, intervalMs);
  }

  /**
   * Stop periodic checking
   */
  static stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get connection status
   */
  static getStatus() {
    return {
      connected: this.isConnected,
      lastCheck: this.lastCheckTime,
      apiUrl: this.API_URL
    };
  }
}

// Auto-start connection checking when extension loads
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onStartup.addListener(() => {
    AppConnector.startPeriodicCheck();
  });

  chrome.runtime.onInstalled.addListener(() => {
    AppConnector.startPeriodicCheck();
  });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConnector;
}

/**
 * ecosystem-integration.js
 * Service worker module for integrating all Amn Shield ecosystem features
 */

import prayerService from './prayer-service.js';
import wellnessService from './wellness-service.js';

class EcosystemIntegration {
    constructor() {
        this.services = {
            prayer: prayerService,
            wellness: wellnessService
        };
        this.initialize();
    }

    async initialize() {
        // Set up message handling
        this.setupMessageHandlers();

        // Initialize state sync
        await this.initializeStateSync();
    }

    setupMessageHandlers() {
        // Listen for messages from content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep channel open for async response
        });

        // Listen for external messages from web app
        chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
            if (this.isValidOrigin(sender.url)) {
                this.handleExternalMessage(message, sender, sendResponse);
                return true; // Keep channel open for async response
            }
        });
    }

    async initializeStateSync() {
        // Load initial state
        const state = await chrome.storage.sync.get(null);

        // Initialize services with state
        if (state.prayerTimes) {
            await this.services.prayer.updatePrayerTimes(state.prayerTimes, state.location);
        }

        if (state.protectionSchedule) {
            await this.services.prayer.updateProtectionSchedule(state.protectionSchedule);
        }
    }

    async handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'contentBlocked':
                await this.handleContentBlocked(message.data, sender);
                break;

            case 'getStatus':
                await this.handleStatusRequest(sendResponse);
                break;

            case 'updateSettings':
                await this.handleSettingsUpdate(message.data);
                break;

            case 'toggleIslamicMode':
                await this.handleIslamicModeToggle(message.data);
                break;

            default:
                console.warn('Unknown message action:', message.action);
        }
    }

    async handleExternalMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'syncSettings':
                await this.handleSettingsSync(message.data, sendResponse);
                break;

            case 'updatePrayerTimes':
                await this.handlePrayerTimesUpdate(message.data, sendResponse);
                break;

            case 'updateGoals':
                await this.handleGoalsUpdate(message.data, sendResponse);
                break;

            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    async handleContentBlocked(data, sender) {
        // Update wellness stats
        await this.services.wellness.incrementBlockedCount();

        // Notify content script
        if (sender && sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
                action: 'contentBlocked',
                data: {
                    ...data,
                    stats: await this.services.wellness.getReport()
                }
            });
        }
    }

    async handleStatusRequest(sendResponse) {
        sendResponse({
            version: chrome.runtime.getManifest().version,
            active: true,
            stats: await this.services.wellness.getReport(),
            prayerTimes: this.services.prayer.prayerTimes
        });
    }

    async handleSettingsSync(data, sendResponse) {
        try {
            await chrome.storage.sync.set({ settings: data });

            if (data.prayerTimes) {
                await this.services.prayer.updatePrayerTimes(data.prayerTimes, data.location);
            }

            if (data.protectionSchedule) {
                await this.services.prayer.updateProtectionSchedule(data.protectionSchedule);
            }

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ error: error.message });
        }
    }

    async handlePrayerTimesUpdate(data, sendResponse) {
        try {
            await this.services.prayer.updatePrayerTimes(data.prayerTimes, data.location);
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ error: error.message });
        }
    }

    async handleGoalsUpdate(data, sendResponse) {
        try {
            await this.services.wellness.updateGoals(data);
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ error: error.message });
        }
    }

    async handleSettingsUpdate(data) {
        await chrome.storage.sync.set({ settings: data });
        await this.updateBlockingRules(data);
    }

    async handleIslamicModeToggle(data) {
        const settings = await chrome.storage.sync.get('settings');
        settings.islamicMode = data.enabled;

        if (data.enabled) {
            settings.blockHaram = true;
            settings.enhancedBlocking = true;
        }

        await this.handleSettingsUpdate(settings);
    }

    async updateBlockingRules(settings) {
        // Your existing updateBlockingRules implementation
        if (chrome.declarativeNetRequest) {
            await this.updateDeclarativeNetRequestRules(settings);
        } else {
            this.updateWebRequestRules(settings);
        }
    }

    isValidOrigin(url) {
        // Validate message origin
        return url && (
            url.startsWith('https://alhaq-initiative.org') ||
            url.startsWith('http://localhost') // For development
        );
    }
}

// Initialize ecosystem integration
const ecosystemIntegration = new EcosystemIntegration();
export default ecosystemIntegration;

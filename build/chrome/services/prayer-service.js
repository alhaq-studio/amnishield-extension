/**
 * prayer-service.js
 * Service worker for managing prayer times and protection scheduling
 */

class PrayerService {
    constructor() {
        this.prayerTimes = null;
        this.location = null;
        this.protectionSchedule = null;
        this.initialize();
    }

    async initialize() {
        // Load saved data
        await this.loadSavedData();
        
        // Start schedule monitoring
        this.startScheduleMonitor();
    }

    async loadSavedData() {
        try {
            const data = await chrome.storage.sync.get([
                'prayerTimes',
                'location',
                'protectionSchedule'
            ]);
            
            this.prayerTimes = data.prayerTimes;
            this.location = data.location;
            this.protectionSchedule = data.protectionSchedule;
        } catch (error) {
            console.error('Failed to load prayer data:', error);
        }
    }

    startScheduleMonitor() {
        // Check schedule every minute
        setInterval(() => this.checkSchedule(), 60000);
    }

    async checkSchedule() {
        if (!this.prayerTimes) return;

        const now = new Date();
        const currentPrayer = this.getCurrentPrayer(now);
        
        if (currentPrayer) {
            await this.activateEnhancedProtection(currentPrayer);
        } else {
            await this.deactivateEnhancedProtection();
        }
    }

    getCurrentPrayer(now) {
        for (const [prayer, time] of Object.entries(this.prayerTimes)) {
            const prayerTime = new Date(time);
            const timeDiff = Math.abs(now - prayerTime) / 1000 / 60; // Minutes
            
            // If within 30 minutes of prayer time
            if (timeDiff <= 30) {
                return {
                    name: prayer,
                    time: prayerTime,
                    remainingMinutes: 30 - timeDiff
                };
            }
        }
        return null;
    }

    async activateEnhancedProtection(prayer) {
        const settings = await chrome.storage.sync.get('settings');
        
        // Create enhanced settings
        const enhancedSettings = {
            ...settings,
            blockHaram: true,
            blockSocial: true,
            enhancedBlocking: true,
            currentPrayer: prayer.name
        };

        // Update settings
        await chrome.storage.sync.set({ settings: enhancedSettings });
        
        // Notify app
        try {
            chrome.runtime.sendMessage({
                action: 'protectionModeChanged',
                data: {
                    mode: 'enhanced',
                    prayer: prayer.name,
                    remainingMinutes: prayer.remainingMinutes
                }
            }, () => {
                if (chrome.runtime.lastError) {
                    console.debug('No listener for enhanced protection message:', chrome.runtime.lastError.message);
                }
            });
        } catch (err) {
            console.debug('Failed to notify enhanced protection mode:', err);
        }
    }

    async deactivateEnhancedProtection() {
        const settings = await chrome.storage.sync.get('settings');
        
        // Remove enhanced settings
        const normalSettings = {
            ...settings,
            enhancedBlocking: false,
            currentPrayer: null
        };

        // Update settings
        await chrome.storage.sync.set({ settings: normalSettings });
        
        // Notify app
        try {
            chrome.runtime.sendMessage({
                action: 'protectionModeChanged',
                data: {
                    mode: 'normal'
                }
            }, () => {
                if (chrome.runtime.lastError) {
                    console.debug('No listener for normal protection message:', chrome.runtime.lastError.message);
                }
            });
        } catch (err) {
            console.debug('Failed to notify normal protection mode:', err);
        }
    }

    async updatePrayerTimes(prayerTimes, location) {
        this.prayerTimes = prayerTimes;
        this.location = location;
        
        // Save to storage
        await chrome.storage.sync.set({
            prayerTimes,
            location
        });
        
        // Immediate schedule check
        this.checkSchedule();
    }

    async updateProtectionSchedule(schedule) {
        this.protectionSchedule = schedule;
        
        // Save to storage
        await chrome.storage.sync.set({
            protectionSchedule: schedule
        });
        
        // Immediate schedule check
        this.checkSchedule();
    }
}

// Create and export service instance
const prayerService = new PrayerService();
export default prayerService;

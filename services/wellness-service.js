/**
 * wellness-service.js
 * Service for tracking digital wellness metrics
 */

class WellnessService {
    constructor() {
        this.stats = {
            blockedToday: 0,
            focusTime: 0,
            protectionPercentage: 0,
            dailyGoals: {
                focusHours: 6,
                maxSocialMedia: 2,
                prayerBreaks: 5
            }
        };
        this.initialize();
    }

    async initialize() {
        await this.loadStats();
        this.startDailyReset();
        this.startStatsTracking();
    }

    async loadStats() {
        try {
            const data = await chrome.storage.local.get([
                'wellnessStats',
                'lastStatsDate'
            ]);
            
            const today = new Date().toDateString();
            
            if (data.lastStatsDate === today && data.wellnessStats) {
                this.stats = data.wellnessStats;
            } else {
                // Reset stats for new day
                await this.resetDailyStats();
            }
        } catch (error) {
            console.error('Failed to load wellness stats:', error);
        }
    }

    async resetDailyStats() {
        this.stats = {
            ...this.stats,
            blockedToday: 0,
            focusTime: 0,
            protectionPercentage: 0
        };
        
        await this.saveStats();
    }

    startDailyReset() {
        // Check for day change every hour
        setInterval(async () => {
            const data = await chrome.storage.local.get('lastStatsDate');
            const today = new Date().toDateString();
            
            if (data.lastStatsDate !== today) {
                await this.resetDailyStats();
            }
        }, 3600000); // Every hour
    }

    startStatsTracking() {
        // Update stats every 5 minutes
        setInterval(() => this.updateStats(), 300000);
    }

    async updateStats() {
        const now = new Date();
        const settings = await chrome.storage.sync.get('settings');
        
        // Calculate focus time (simplified example)
        if (settings.blockSocial) {
            this.stats.focusTime += 5/60; // Add 5 minutes
        }
        
        // Calculate protection percentage
        const activeProtections = [
            settings.blockHaram,
            settings.blockSocial,
            settings.enhancedBlocking
        ].filter(Boolean).length;
        
        this.stats.protectionPercentage = (activeProtections / 3) * 100;
        
        await this.saveStats();
        this.notifyStatsUpdate();
    }

    async incrementBlockedCount() {
        this.stats.blockedToday++;
        await this.saveStats();
        this.notifyStatsUpdate();
    }

    async saveStats() {
        await chrome.storage.local.set({
            wellnessStats: this.stats,
            lastStatsDate: new Date().toDateString()
        });
    }

    notifyStatsUpdate() {
        try {
            chrome.runtime.sendMessage({
                action: 'wellnessStatsUpdated',
                data: this.stats
            }, () => {
                if (chrome.runtime.lastError) {
                    console.debug('No listener for wellness stats update:', chrome.runtime.lastError.message);
                }
            });
        } catch (err) {
            console.debug('Failed to broadcast wellness stats update:', err);
        }
    }

    async updateGoals(goals) {
        this.stats.dailyGoals = {
            ...this.stats.dailyGoals,
            ...goals
        };
        await this.saveStats();
    }

    async getReport() {
        return {
            ...this.stats,
            goalProgress: {
                focusHours: (this.stats.focusTime / this.stats.dailyGoals.focusHours) * 100,
                socialMedia: (this.stats.blockedToday > 0) ? 
                    Math.min(100, (this.stats.blockedToday / this.stats.dailyGoals.maxSocialMedia) * 100) : 0,
                prayerBreaks: 0 // To be implemented with prayer service integration
            }
        };
    }
}

// Create and export service instance
const wellnessService = new WellnessService();
export default wellnessService;

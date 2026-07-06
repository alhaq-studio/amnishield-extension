/**
 * popup-ecosystem.js
 * Enhanced popup interface for Amn Shield ecosystem
 */

document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
});

async function initializePopup() {
    try {
        const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
        updateStatusDisplay(status);
    } catch (err) {
        console.warn('Failed to fetch popup status from background:', err);
    }
    setupEventListeners();
}

function updateStatusDisplay(status) {
    // Update stats display
    updateStatsDisplay(status.stats);

    // Update prayer times
    if (status.prayerTimes) {
        updatePrayerTimesDisplay(status.prayerTimes);
    }

    // Update version info
    document.getElementById('version').textContent = `v${status.version}`;
}

function updateStatsDisplay(stats) {
    // Update blocked count
    document.getElementById('blockedToday').textContent = stats.blockedToday;

    // Update focus time
    document.getElementById('focusTime').textContent =
        `${Math.round(stats.focusTime * 10) / 10}h`;

    // Update protection percentage
    const protectionCircle = document.getElementById('protectionCircle');
    if (protectionCircle) {
        protectionCircle.style.setProperty(
            '--percentage',
            `${stats.protectionPercentage}%`
        );
        document.getElementById('protectionPercentage').textContent =
            `${Math.round(stats.protectionPercentage)}%`;
    }

    // Update goal progress
    if (stats.goalProgress) {
        updateGoalProgress(stats.goalProgress);
    }
}

function updatePrayerTimesDisplay(prayerTimes) {
    const container = document.getElementById('prayerTimes');
    if (!container) return;

    container.innerHTML = Object.entries(prayerTimes)
        .map(([prayer, time]) => `
            <div class="prayer-time">
                <span class="prayer-name">${prayer}</span>
                <span class="prayer-time-value">${formatTime(time)}</span>
            </div>
        `).join('');
}

function updateGoalProgress(progress) {
    // Update focus hours progress
    const focusProgress = document.getElementById('focusProgress');
    if (focusProgress) {
        focusProgress.style.width = `${progress.focusHours}%`;
        document.getElementById('focusPercentage').textContent =
            `${Math.round(progress.focusHours)}%`;
    }

    // Update social media control
    const socialProgress = document.getElementById('socialProgress');
    if (socialProgress) {
        socialProgress.style.width = `${progress.socialMedia}%`;
        document.getElementById('socialPercentage').textContent =
            `${Math.round(progress.socialMedia)}%`;
    }

    // Update prayer breaks
    const prayerProgress = document.getElementById('prayerProgress');
    if (prayerProgress) {
        prayerProgress.style.width = `${progress.prayerBreaks}%`;
        document.getElementById('prayerPercentage').textContent =
            `${Math.round(progress.prayerBreaks)}%`;
    }
}

function setupEventListeners() {
    // Islamic mode toggle
    const islamicModeToggle = document.getElementById('islamicMode');
    if (islamicModeToggle) {
        islamicModeToggle.addEventListener('change', async (e) => {
            try {
                await chrome.runtime.sendMessage({
                    action: 'toggleIslamicMode',
                    data: { enabled: e.target.checked }
                });
            } catch (err) {
                console.warn('Failed to toggle Islamic mode from popup:', err);
            }
        });
    }

    // Settings sync
    const syncButton = document.getElementById('syncSettings');
    if (syncButton) {
        syncButton.addEventListener('click', async () => {
            try {
                const settings = await chrome.storage.sync.get('settings');
                await chrome.runtime.sendMessage({
                    action: 'syncSettings',
                    data: settings
                });
            } catch (err) {
                console.warn('Failed to sync settings from popup:', err);
            }
        });
    }

    // Open dashboard
    const dashboardButton = document.getElementById('openDashboard');
    if (dashboardButton) {
        dashboardButton.addEventListener('click', () => {
            chrome.tabs.create({
                url: 'https://alhaq.uk/dashboard'
            });
        });
    }
}

function formatTime(timeString) {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

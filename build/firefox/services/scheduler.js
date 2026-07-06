/*
 * services/scheduler.js
 * Minimal scheduler service (Phase 1): computes effective settings
 * based on islamicMode (off|flexible|full) and profile (personal|work|school|custom).
 *
 * Future phases will incorporate full timetable calculations and prayer times.
 */
(function (global) {
  // Simple weekly schedule stub for future UI integration
  // The shape matches FEATURE_PLAN WeeklySchedule interface loosely.
  const defaultWeeklyTemplates = {
    work: {
      // Mon–Fri work hours + light evening focus
      days: [1, 2, 3, 4, 5].map(d => ({
        day: d, ranges: [
          { start: 9 * 60, end: 17 * 60 }, // work day
          { start: 20 * 60, end: 22 * 60 } // optional focus slot
        ]
      })),
      categories: ['social', 'entertainment', 'streaming']
    },
    school: {
      // Mon–Fri school hours + study window
      days: [1, 2, 3, 4, 5].map(d => ({
        day: d, ranges: [
          { start: 8 * 60, end: 15 * 60 },
          { start: 19 * 60, end: 21 * 60 }
        ]
      })),
      categories: ['social', 'games', 'entertainment']
    },
    personal: {
      // Evenings across the week; include a modest weekend block
      days: [0, 1, 2, 3, 4, 5, 6].map(d => ({
        day: d, ranges: [
          { start: 21 * 60, end: 24 * 60 }
        ]
      })).concat([{ day: 6, ranges: [{ start: 10 * 60, end: 12 * 60 }] }]), // Sat late morning
      categories: ['social', 'streaming', 'shopping']
    },
    custom: { days: [], categories: [] }
  };

  // All available blocking categories for reference and future UI
  const ALL_CATEGORIES = [
    'haram',       // Adult/Haram content (adult, gambling, inappropriate)
    'social',      // Social media (all platforms)
    'games',       // Gaming sites
    'entertainment', // General entertainment
    'streaming',   // Video streaming (movies, shows)
    'shopping',    // E-commerce
    'news',        // News (optional)
    'stock',       // Stock photos/images (suggestive content)
    'female'       // Female-focused content (for strict mode)
  ];

  const SCHEDULER = {
    /** Return a friendly status string like "Strict Mode" or "Flexible Mode + Work" */
    getFriendlyStatus(mode, profile) {
      const modeMap = {
        off: 'Off',
        flexible: 'Flexible',
        full: 'Full Protection',
        strict: 'Strict Mode',
        'flexible-mode': 'Flexible Mode'
      };
      const profileMap = { personal: 'Personal', work: 'Work', school: 'School', custom: 'Custom' };
      const a = modeMap[String(mode || 'off')] || 'Off';
      const b = profileMap[String(profile || 'personal')] || 'Personal';

      // Strict and Flexible modes override profile display
      if (mode === 'strict' || mode === 'flexible-mode') {
        return a;
      }

      return `${a} + ${b}`;
    },

    /** Expose all available categories */
    getAllCategories() {
      return [...ALL_CATEGORIES];
    },

    /**
     * Check if the given time falls within a time range
     * @param {Date} now - Current time
     * @param {Object} range - Range object with start/end in minutes since midnight
     * @returns {boolean}
     */
    isTimeInRange(now, range) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return currentMinutes >= range.start && currentMinutes < range.end;
    },

    /**
     * Get active blocking categories for the current time based on weekly schedule
     * @param {Date} now - Current time
     * @param {Object} weeklySchedule - Schedule object with days array
     * @returns {string[]} Array of active category names
     */
    getActiveCategories(now, weeklySchedule) {
      if (!weeklySchedule || !weeklySchedule.days) {
        return [];
      }

      const currentDay = now.getDay(); // 0=Sunday, 6=Saturday
      const daySchedules = weeklySchedule.days.filter(d => d.day === currentDay);

      for (const daySchedule of daySchedules) {
        if (!daySchedule.ranges) continue;

        for (const range of daySchedule.ranges) {
          if (this.isTimeInRange(now, range)) {
            // Return categories for this range, or fall back to global categories
            return range.categories || weeklySchedule.categories || [];
          }
        }
      }

      return [];
    },

    /**
     * Get the next scheduled time change (useful for countdown timers)
     * @param {Date} now - Current time
     * @param {Object} weeklySchedule - Schedule object
     * @returns {Object|null} { time: Date, categories: string[], entering: boolean }
     */
    getNextScheduleChange(now, weeklySchedule) {
      if (!weeklySchedule || !weeklySchedule.days) {
        return null;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentDay = now.getDay();

      // Collect all schedule boundaries for the week
      const boundaries = [];
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDay = (currentDay + dayOffset) % 7;
        const daySchedules = weeklySchedule.days.filter(d => d.day === checkDay);

        for (const daySchedule of daySchedules) {
          if (!daySchedule.ranges) continue;

          for (const range of daySchedule.ranges) {
            const categories = range.categories || weeklySchedule.categories || [];

            // Start boundary
            const startMinutes = range.start + (dayOffset * 24 * 60);
            if (dayOffset > 0 || range.start > currentMinutes) {
              boundaries.push({
                minutes: startMinutes,
                categories,
                entering: true,
                dayOffset
              });
            }

            // End boundary
            const endMinutes = range.end + (dayOffset * 24 * 60);
            if (dayOffset > 0 || range.end > currentMinutes) {
              boundaries.push({
                minutes: endMinutes,
                categories: [],
                entering: false,
                dayOffset
              });
            }
          }
        }
      }

      // Sort by time and return the nearest
      boundaries.sort((a, b) => a.minutes - b.minutes);
      if (boundaries.length === 0) return null;

      const next = boundaries[0];
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + Math.floor(next.minutes / (24 * 60)));
      nextDate.setHours(Math.floor((next.minutes % (24 * 60)) / 60));
      nextDate.setMinutes(next.minutes % 60);
      nextDate.setSeconds(0);

      return {
        time: nextDate,
        categories: next.categories,
        entering: next.entering
      };
    },
    /**
     * Check if current time is within prayer time window (±1 hour)
     * @param {Date} now - Current time
     * @param {Array} prayerTimes - Array of prayer time objects
     * @returns {boolean} - True if within ±1 hour of any prayer
     */
    isWithinPrayerTimeWindow(now, prayerTimes) {
      if (!prayerTimes || !Array.isArray(prayerTimes) || prayerTimes.length === 0) {
        return false;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const BUFFER_MINUTES = 60; // ±1 hour = 60 minutes

      for (const prayer of prayerTimes) {
        if (!prayer.time) continue;

        try {
          // Parse prayer time (format: "HH:MM" or Date object)
          let prayerMinutes;
          if (typeof prayer.time === 'string') {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            prayerMinutes = hours * 60 + minutes;
          } else if (prayer.time instanceof Date) {
            prayerMinutes = prayer.time.getHours() * 60 + prayer.time.getMinutes();
          } else {
            continue;
          }

          // Check if within ±1 hour window
          const diff = Math.abs(currentMinutes - prayerMinutes);
          if (diff <= BUFFER_MINUTES) {
            return true; // Within prayer time window
          }
        } catch (e) {
          console.warn('Error parsing prayer time:', prayer, e);
        }
      }

      return false;
    },

    /**
     * Compute effective settings given base user settings.
     * Does not mutate the original object; returns a shallow clone with overrides.
     * @param {Object} base
     * @param {Date} [now]
     * @returns {Object} effective settings with activeCategories array
     */
    getEffectiveSettings(base, now) {
      const s = { ...(base || {}) };
      const islamicMode = (s.islamicMode || 'off');
      const profile = (s.profile || 'personal');
      const currentTime = now || new Date();

      // Check if within prayer time window
      const withinPrayerTime = this.isWithinPrayerTimeWindow(currentTime, s.prayerTimes);

      // Islamic Mode adjustments
      if (islamicMode === 'strict' || islamicMode === 'full') {
        // STRICT/FULL MODE: Maximum protection - ALL blocked ALL the time
        // IMMUTABLE: Blocks cannot be turned off until Islamic mode is disabled
        s.blockHaram = true;
        s.blockSocial = true;
        s.blockGames = true;
        s.blockEntertainment = true;
        s.blockStreaming = true; // Movies
        s.blockStock = true; // Stock photos
        s.blockFemale = true; // Female-focused content
        s.safeSearchEnabled = true;
        s.enhancedBlocking = true;
        s.blurrEnabled = true; // Full blur (except Islamic sites)
        s.aggressiveBlur = true; // Maximum blur on all non-Islamic content
        s.aiProtection = true; // Enable AI-based real-time analysis
        s.immutableBlocks = true; // Prevent ALL toggles from being disabled
        s.lockedMode = true; // UI should show locks on all toggles
        s.prayerWindowLocked = false; // Not prayer-specific, always locked
        // Override to always active (24/7)
        s.activeCategories = ['haram', 'social', 'games', 'entertainment', 'streaming', 'stock', 'female'];
      } else if (islamicMode === 'flexible-mode') {
        // FLEXIBLE MODE: Allows social media, but haram content ALWAYS blocked
        // IMMUTABLE: Haram blocks cannot be turned off (even outside prayer times)
        // FLEXIBLE: Other blocks can be toggled off EXCEPT during prayer times (±1 hour)
        s.blockHaram = true; // IMMUTABLE - always blocked
        s.safeSearchEnabled = true; // IMMUTABLE - always enabled
        s.aiProtection = true; // IMMUTABLE - always enabled
        s.immutableHaram = true; // Flag: Haram blocks ALWAYS enforced (cannot be toggled off)
        s.enhancedBlocking = true;

        // Check if within prayer time window (±1 hour)
        if (withinPrayerTime) {
          // PRAYER TIME WINDOW: Lock ALL toggles
          s.blockSocial = true; // Locked during prayer times
          s.blockGames = true;
          s.blockEntertainment = true;
          s.blockStreaming = true;
          s.blockStock = true;
          s.blockFemale = true;
          s.blurrEnabled = true;
          s.aggressiveBlur = true;
          s.lockedMode = true; // Lock ALL toggles
          s.prayerWindowLocked = true; // Flag: Locked due to prayer time
          s.activeCategories = ['haram', 'social', 'games', 'entertainment', 'streaming', 'stock', 'female'];
        } else {
          // OUTSIDE PRAYER TIME: Allow user toggles (except haram)
          // User can toggle these on/off as needed
          // Note: blockHaram, safeSearch, aiProtection remain IMMUTABLE
          s.lockedMode = false; // Toggles unlocked (except haram)
          s.prayerWindowLocked = false;
          s.activeCategories = ['haram']; // Haram always included

          // Add other categories if enabled by user
          if (s.blockSocial) s.activeCategories.push('social');
          if (s.blockGames) s.activeCategories.push('games');
          if (s.blockEntertainment) s.activeCategories.push('entertainment');
          if (s.blockStreaming) s.activeCategories.push('streaming');
          if (s.blockStock) s.activeCategories.push('stock');
          if (s.blockFemale) s.activeCategories.push('female');
        }

        s.prayerTimeLocking = true; // Flag: Prayer time locking is enabled
      } else if (islamicMode === 'flexible') {
        // FLEXIBLE: Original flexible mode
        s.blockHaram = true;
        s.safeSearchEnabled = true;
      } else {
        // islamicMode = 'off' ⇒ no special overrides
      }

      // Profile adjustments (simple defaults; can be expanded later)
      if (profile === 'work' || profile === 'school') {
        s.blockSocial = true;
      }
      // personal/custom: leave as-is

      // Attach a stub schedule for future use if not present and scheduleEnabled
      const scheduleEnabled = s.scheduleEnabled !== false; // default true
      if (scheduleEnabled && !s.weeklySchedule) {
        const tpl = defaultWeeklyTemplates[profile] || defaultWeeklyTemplates.personal;
        s.weeklySchedule = JSON.parse(JSON.stringify(tpl));
      }

      // Phase 2: Time-based category enforcement
      s.activeCategories = [];
      if (scheduleEnabled && s.weeklySchedule) {
        s.activeCategories = this.getActiveCategories(currentTime, s.weeklySchedule);

        // Map active categories to blocking flags
        if (s.activeCategories.includes('haram')) s.blockHaram = true;
        if (s.activeCategories.includes('social')) s.blockSocial = true;
        if (s.activeCategories.includes('games')) s.blockGames = true;
        if (s.activeCategories.includes('entertainment')) s.blockEntertainment = true;
        if (s.activeCategories.includes('streaming')) s.blockStreaming = true;
        if (s.activeCategories.includes('shopping')) s.blockShopping = true;
        if (s.activeCategories.includes('news')) s.blockNews = true;
      }

      // Store next schedule change for UI/notifications
      s.nextScheduleChange = this.getNextScheduleChange(currentTime, s.weeklySchedule);

      return s;
    }
  };

  // Expose on a global namespace
  try {
    global.AmnShield = global.AmnShield || {};
    global.AmnShield.scheduler = SCHEDULER;
  } catch { }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : window));

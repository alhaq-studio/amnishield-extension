/*
 * services/timetable-editor.js
 * Phase 2: Interactive Timetable Editor
 * Handles grid rendering, drag-to-select, category assignment, and persistence
 */

(function (global) {
  const CATEGORY_COLORS = {
    haram: '#dc2626',
    social: '#3b82f6',
    games: '#f59e0b',
    entertainment: '#8b5cf6',
    streaming: '#ec4899',
    shopping: '#10b981',
    news: '#6366f1'
  };

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  class TimetableEditor {
    constructor() {
      this.schedule = { days: [], categories: [] };
      this.isDragging = false;
      this.selectionStart = null;
      this.selectionEnd = null;
      this.selectedCells = new Set();
    }

    /**
     * Initialize the timetable grid
     * @param {HTMLElement} gridContainer 
     */
    initializeGrid(gridContainer) {
      if (!gridContainer) return;

      // Generate 24-hour grid for 7 days
      for (let hour = 0; hour < 24; hour++) {
        // Hour label cell
        const hourCell = document.createElement('div');
        hourCell.style.background = '#f9fafb';
        hourCell.style.padding = '8px';
        hourCell.style.textAlign = 'center';
        hourCell.style.fontWeight = '500';
        hourCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
        gridContainer.appendChild(hourCell);

        // Day cells
        for (let day = 0; day < 7; day++) {
          const cell = document.createElement('div');
          cell.dataset.hour = hour;
          cell.dataset.day = day;
          cell.style.background = '#fff';
          cell.style.padding = '12px';
          cell.style.cursor = 'pointer';
          cell.style.minHeight = '40px';
          cell.style.position = 'relative';
          cell.style.transition = 'background 0.15s';

          // Mouse events for drag-to-select
          cell.addEventListener('mousedown', (e) => this.handleCellMouseDown(e, cell));
          cell.addEventListener('mouseenter', (e) => this.handleCellMouseEnter(e, cell));
          cell.addEventListener('mouseup', (e) => this.handleCellMouseUp(e));

          gridContainer.appendChild(cell);
        }
      }

      // Global mouseup to handle drag end
      document.addEventListener('mouseup', () => {
        this.isDragging = false;
      });
    }

    /**
     * Handle cell mouse down (start drag)
     */
    handleCellMouseDown(e, cell) {
      e.preventDefault();
      this.isDragging = true;
      this.selectedCells.clear();
      this.selectionStart = { hour: parseInt(cell.dataset.hour), day: parseInt(cell.dataset.day) };
      this.selectionEnd = this.selectionStart;

      this.selectedCells.add(`${cell.dataset.day}-${cell.dataset.hour}`);
      this.updateSelection();
    }

    /**
     * Handle cell mouse enter (continue drag)
     */
    handleCellMouseEnter(e, cell) {
      if (!this.isDragging) return;

      this.selectionEnd = { hour: parseInt(cell.dataset.hour), day: parseInt(cell.dataset.day) };
      this.updateSelectionRange();
    }

    /**
     * Handle cell mouse up (end drag)
     */
    handleCellMouseUp(e) {
      if (!this.isDragging) return;

      this.isDragging = false;
      this.showRangeEditor();
    }

    /**
     * Update selection range based on start and end points
     */
    updateSelectionRange() {
      if (!this.selectionStart || !this.selectionEnd) return;

      this.selectedCells.clear();

      const startHour = Math.min(this.selectionStart.hour, this.selectionEnd.hour);
      const endHour = Math.max(this.selectionStart.hour, this.selectionEnd.hour);
      const startDay = Math.min(this.selectionStart.day, this.selectionEnd.day);
      const endDay = Math.max(this.selectionStart.day, this.selectionEnd.day);

      for (let day = startDay; day <= endDay; day++) {
        for (let hour = startHour; hour <= endHour; hour++) {
          this.selectedCells.add(`${day}-${hour}`);
        }
      }

      this.updateSelection();
    }

    /**
     * Visual update of selected cells
     */
    updateSelection() {
      const grid = document.getElementById('timetableGrid');
      if (!grid) return;

      const cells = grid.querySelectorAll('[data-hour]');
      cells.forEach(cell => {
        const key = `${cell.dataset.day}-${cell.dataset.hour}`;
        if (this.selectedCells.has(key)) {
          cell.style.background = '#dbeafe';
          cell.style.borderLeft = '3px solid #3b82f6';
        } else {
          // Reset to show existing ranges
          this.applyCellStyle(cell);
        }
      });
    }

    /**
     * Apply category colors to cell
     */
    applyCellStyle(cell) {
      const day = parseInt(cell.dataset.day);
      const hour = parseInt(cell.dataset.hour);
      const categories = this.getCategoriesForCell(day, hour);

      if (categories.length === 0) {
        cell.style.background = '#fff';
        cell.style.borderLeft = 'none';
        cell.innerHTML = '';
      } else {
        // Show gradient or stripes for multiple categories
        const color = CATEGORY_COLORS[categories[0]] || '#6b7280';
        cell.style.background = `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`;
        cell.style.borderLeft = `3px solid ${color}`;

        // Show category badges
        cell.innerHTML = categories.slice(0, 3).map(cat =>
          `<span style="display:inline-block;width:6px;height:6px;background:${CATEGORY_COLORS[cat]};border-radius:50%;margin:2px;"></span>`
        ).join('');
      }
    }

    /**
     * Get categories for a specific cell
     */
    getCategoriesForCell(day, hour) {
      if (!this.schedule || !this.schedule.days) return [];

      const daySchedule = this.schedule.days.find(d => d.day === day);
      if (!daySchedule || !daySchedule.ranges) return [];

      const minutesSinceMidnight = hour * 60;
      for (const range of daySchedule.ranges) {
        if (minutesSinceMidnight >= range.start && minutesSinceMidnight < range.end) {
          return range.categories || this.schedule.categories || [];
        }
      }

      return [];
    }

    /**
     * Show the range editor panel
     */
    showRangeEditor() {
      const panel = document.getElementById('rangeEditorPanel');
      const display = document.getElementById('selectedRangeDisplay');

      if (!panel || !display || this.selectedCells.size === 0) return;

      panel.classList.remove('hidden');

      // Calculate range description
      const cells = Array.from(this.selectedCells).map(key => {
        const [day, hour] = key.split('-').map(Number);
        return { day, hour };
      });

      const minDay = Math.min(...cells.map(c => c.day));
      const maxDay = Math.max(...cells.map(c => c.day));
      const minHour = Math.min(...cells.map(c => c.hour));
      const maxHour = Math.max(...cells.map(c => c.hour)) + 1; // +1 for end hour

      let rangeText = '';
      if (minDay === maxDay) {
        rangeText = `${DAY_NAMES[minDay]}, ${minHour.toString().padStart(2, '0')}:00 - ${maxHour.toString().padStart(2, '0')}:00`;
      } else {
        rangeText = `${DAY_NAMES[minDay]} - ${DAY_NAMES[maxDay]}, ${minHour.toString().padStart(2, '0')}:00 - ${maxHour.toString().padStart(2, '0')}:00`;
      }

      display.textContent = rangeText;

      // Load existing categories for this range if it exists
      const existingCategories = this.getCategoriesForCell(minDay, minHour);
      const checkboxes = document.querySelectorAll('#categoryCheckboxes input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = existingCategories.includes(checkbox.value);
      });
    }

    /**
     * Apply selected categories to the current selection
     */
    applyCategories() {
      const checkboxes = document.querySelectorAll('#categoryCheckboxes input[type="checkbox"]:checked');
      const selectedCategories = Array.from(checkboxes).map(cb => cb.value);

      if (selectedCategories.length === 0) {
        alert('Please select at least one category to block.');
        return;
      }

      // Convert selected cells to time ranges per day
      const cells = Array.from(this.selectedCells).map(key => {
        const [day, hour] = key.split('-').map(Number);
        return { day, hour };
      });

      // Group by day
      const dayGroups = {};
      cells.forEach(({ day, hour }) => {
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(hour);
      });

      // Create ranges for each day
      Object.keys(dayGroups).forEach(dayStr => {
        const day = parseInt(dayStr);
        const hours = dayGroups[day].sort((a, b) => a - b);
        const start = hours[0] * 60; // Convert to minutes
        const end = (hours[hours.length - 1] + 1) * 60; // End is exclusive

        // Remove existing overlapping ranges for this day
        if (!this.schedule.days) this.schedule.days = [];
        let daySchedule = this.schedule.days.find(d => d.day === day);

        if (!daySchedule) {
          daySchedule = { day, ranges: [] };
          this.schedule.days.push(daySchedule);
        }

        // Remove overlapping ranges
        daySchedule.ranges = daySchedule.ranges.filter(range => {
          return range.end <= start || range.start >= end;
        });

        // Add new range
        daySchedule.ranges.push({
          start,
          end,
          categories: selectedCategories
        });
      });

      // Clear selection and refresh grid
      this.selectedCells.clear();
      this.refreshGrid();
      this.hideRangeEditor();
    }

    /**
     * Delete the selected range
     */
    deleteRange() {
      if (this.selectedCells.size === 0) return;

      const cells = Array.from(this.selectedCells).map(key => {
        const [day, hour] = key.split('-').map(Number);
        return { day, hour };
      });

      // Group by day
      const dayGroups = {};
      cells.forEach(({ day, hour }) => {
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(hour);
      });

      // Remove ranges for each day
      Object.keys(dayGroups).forEach(dayStr => {
        const day = parseInt(dayStr);
        const hours = dayGroups[day].sort((a, b) => a - b);
        const start = hours[0] * 60;
        const end = (hours[hours.length - 1] + 1) * 60;

        const daySchedule = this.schedule.days?.find(d => d.day === day);
        if (daySchedule) {
          daySchedule.ranges = daySchedule.ranges.filter(range => {
            return !(range.start >= start && range.end <= end);
          });
        }
      });

      // Clear selection and refresh
      this.selectedCells.clear();
      this.refreshGrid();
      this.hideRangeEditor();
    }

    /**
     * Hide the range editor panel
     */
    hideRangeEditor() {
      const panel = document.getElementById('rangeEditorPanel');
      if (panel) panel.classList.add('hidden');
    }

    /**
     * Refresh the entire grid with current schedule
     */
    refreshGrid() {
      const grid = document.getElementById('timetableGrid');
      if (!grid) return;

      const cells = grid.querySelectorAll('[data-hour]');
      cells.forEach(cell => this.applyCellStyle(cell));
    }

    /**
     * Load schedule from storage
     */
    async loadSchedule(settings) {
      this.schedule = settings.weeklySchedule || { days: [], categories: [] };
      this.refreshGrid();
    }

    /**
     * Get current schedule for saving
     */
    getSchedule() {
      return this.schedule;
    }

    /**
     * Reset schedule to default template
     */
    resetSchedule(templateName = 'personal') {
      const scheduler = global.AmnShield?.scheduler;
      if (!scheduler) return;

      // Get default template
      const settings = { profile: templateName };
      const effective = scheduler.getEffectiveSettings(settings);
      this.schedule = effective.weeklySchedule || { days: [], categories: [] };
      this.refreshGrid();
    }

    /**
     * Export schedule as JSON
     */
    exportSchedule() {
      const json = JSON.stringify(this.schedule, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amn-shield-schedule-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    /**
     * Import schedule from JSON
     */
    async importSchedule(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target.result);
            if (imported.days && Array.isArray(imported.days)) {
              this.schedule = imported;
              this.refreshGrid();
              resolve();
            } else {
              reject(new Error('Invalid schedule format'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
  }

  // Expose globally
  global.AmnShield = global.AmnShield || {};
  global.AmnShield.TimetableEditor = TimetableEditor;

})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : window));

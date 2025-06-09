// Math Academy Progress Tracker Extension

(function () {
  'use strict';

  // Configuration
  const STORAGE_KEY = 'mathacademy_progress_data';
  const WIDGET_ID = 'ma-progress-widget';
  const DAYS_TO_SHOW = 365; // Show last year of data

  // Initialize the extension
  function init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Create and inject the widget
    injectWidget();

    // Update data
    updateProgressData();

    // // Set up periodic updates
    // setInterval(updateProgressData, 60000); // Update every minute
  }

  // Create and inject the progress widget
  function injectWidget() {
    // Check if widget already exists
    if (document.getElementById(WIDGET_ID)) return;

    // Calculate widget width based on sidebar position
    const sidebar = document.getElementById('sidebar');
    let widgetWidth = '100%'; // Default

    if (sidebar) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const leftSpace = sidebarRect.left - 40; // 20px margin on each side
      widgetWidth = '100%';
    }

    // Create widget container
    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    // widget.style.width = widgetWidth;
    widget.innerHTML = `
      <div class="ma-widget-header">
        <h3>Progress Tracker</h3>
        <button class="ma-widget-close">×</button>
      </div>
      <div class="ma-widget-stats">
        <div class="ma-stat">
          <div class="ma-stat-value" id="ma-streak">0</div>
          <div class="ma-stat-label">Day Streak</div>
        </div>
        <div class="ma-stat">
          <div class="ma-stat-value" id="ma-total-days">0</div>
          <div class="ma-stat-label">Total Days</div>
        </div>
        <div class="ma-stat">
          <div class="ma-stat-value" id="ma-today-xp">0</div>
          <div class="ma-stat-label">Today's XP</div>
        </div>
      </div>
      <div class="ma-contributions-chart" id="ma-chart">
        <div class="ma-chart-loading">Loading...</div>
      </div>
      <div class="ma-chart-legend">
        <span>Less</span>
        <div class="ma-legend-blocks">
          <div class="ma-contribution-block ma-level-0"></div>
          <div class="ma-contribution-block ma-level-1"></div>
          <div class="ma-contribution-block ma-level-2"></div>
          <div class="ma-contribution-block ma-level-3"></div>
          <div class="ma-contribution-block ma-level-4"></div>
        </div>
        <span>More</span>
      </div>
    `;

    // Add widget to page
    // document.body.appendChild(widget);
    // Add widget between #courseFrame and #XPFrame (fallback to <body> if not found)
    const xpFrame = document.getElementById('xpFrame');
    if (xpFrame && xpFrame.parentNode) {
      // insert widget just before the XPFrame
      xpFrame.parentNode.insertBefore(widget, xpFrame);
    } else {
      document.body.appendChild(widget);
    }

    // Add close button functionality
    widget.querySelector('.ma-widget-close').addEventListener('click', () => {
      widget.style.display = 'none';
      localStorage.setItem('ma_widget_hidden', 'true');
      // Clean up tooltip
      const tooltip = document.querySelector('.ma-tooltip');
      if (tooltip) tooltip.remove();
    });

    // Check if widget was previously hidden
    if (localStorage.getItem('ma_widget_hidden') === 'true') {
      widget.style.display = 'none';
    } else {
      // If widget is visible, update toggle button position after render
      setTimeout(() => {
        const toggleBtn = document.getElementById('ma-toggle-button');
        if (toggleBtn && widget.offsetHeight) {
          toggleBtn.style.bottom = `${widget.offsetHeight + 30}px`;
        }
      }, 100);
    }

    // Add toggle button to show/hide widget
    addToggleButton();

    // Adjust widget width on window resize
    window.addEventListener('resize', () => {
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const leftSpace = sidebarRect.left - 40;
        widget.style.width = '100%';
      }
    });
  }

  // Add a toggle button to show/hide the widget
  function addToggleButton() {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ma-toggle-button';
    toggleBtn.innerHTML = '📊';
    toggleBtn.title = 'Toggle Progress Tracker';

    toggleBtn.addEventListener('click', () => {
      const widget = document.getElementById(WIDGET_ID);
      if (widget) {
        if (widget.style.display === 'none') {
          widget.style.display = 'block';
          localStorage.removeItem('ma_widget_hidden');
          // Calculate button position based on widget height
          const widgetHeight = widget.offsetHeight;
          toggleBtn.style.bottom = `20px`;
        } else {
          widget.style.display = 'none';
          localStorage.setItem('ma_widget_hidden', 'true');
          toggleBtn.style.bottom = '20px';
        }
      }
    });

    // Set initial position based on widget visibility
    const widget = document.getElementById(WIDGET_ID);
    if (widget && widget.style.display !== 'none' && localStorage.getItem('ma_widget_hidden') !== 'true') {
      setTimeout(() => {
        const widgetHeight = widget.offsetHeight;
        toggleBtn.style.bottom = `20px`;
      }, 100);
    }

    // document.body.appendChild(toggleBtn);
    // Similarly position the toggle button relative to the XPFrame (so it moves with the widget)
    const xpFrame2 = document.getElementById('XPFrame');
    if (xpFrame2 && xpFrame2.parentNode) {
      xpFrame2.parentNode.insertBefore(toggleBtn, xpFrame2);
    } else {
      document.body.appendChild(toggleBtn);
    }
  }

  // Extract current day's XP from the page
  function getCurrentDayXP() {
    const xpElement = document.getElementById('dailyGoalPoints');
    if (xpElement) {
      const text = xpElement.textContent;
      const match = text.match(/(\d+)\/\d+\s*XP/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 0;
  }

  // // Extract completed tasks and their XP from the page
  // function extractCompletedTasks() {
  //   const tasks = [];
  //   const completedTasks = document.querySelectorAll('#completedTasks .taskCompleted');

  //   completedTasks.forEach(task => {
  //     const timeElement = task.querySelector('.taskTimeCompleted');
  //     const xpElement = task.querySelector('.taskPoints');

  //     if (timeElement && xpElement) {
  //       const timeText = timeElement.textContent;
  //       const xpText = xpElement.textContent;

  //       // Parse XP (format: "9/7 XP" or similar)
  //       const xpMatch = xpText.match(/(\d+)/);
  //       const xp = xpMatch ? parseInt(xpMatch[1]) : 0;

  //       // Parse date
  //       const dateHeader = task.previousElementSibling;
  //       if (dateHeader && dateHeader.classList.contains('completedTasksDate')) {
  //         const dateText = dateHeader.textContent;
  //         tasks.push({
  //           date: parseDate(dateText),
  //           xp: xp
  //         });
  //       }
  //     }
  //   });

  //   return tasks;
  // }

  // Extract completed tasks and their XP from the page, grouped by date
  function extractCompletedTasks() {
    const tasks = [];
    const container = document.getElementById('completedTasks');
    if (!container) return tasks;

    let currentDate = null;
    Array.from(container.children).forEach(node => {
      if (node.classList.contains('completedTasksDate')) {
        // whenever you hit a date header, parse & remember it
        currentDate = parseDate(node.textContent);
      }
      else if (node.classList.contains('taskCompleted')) {
        // for every task under that date…
        const xpEl = node.querySelector('.taskPoints');
        const xpMatch = xpEl?.textContent.match(/(\d+)/);
        const xp = xpMatch ? parseInt(xpMatch[1]) : 0;

        if (currentDate) {
          tasks.push({ date: currentDate, xp });
        }
      }
    });

    return tasks;
  }

  // Parse date from Math Academy format
  function parseDate(dateText) {
    const today = new Date();
    const year = today.getFullYear();

    // Handle relative dates
    if (dateText.includes('Today')) {
      return formatDate(today);
    } else if (dateText.includes('Yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return formatDate(yesterday);
    }

    // Parse dates like "Sat, Jun 7th"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < months.length; i++) {
      if (dateText.includes(months[i])) {
        const dayMatch = dateText.match(/(\d+)/);
        if (dayMatch) {
          const date = new Date(year, i, parseInt(dayMatch[1]));
          // Handle year boundary
          if (date > today) {
            date.setFullYear(year - 1);
          }
          return formatDate(date);
        }
      }
    }

    return formatDate(today);
  }

  // Format date as YYYY-MM-DD
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Update progress data
  async function updateProgressData() {
    // Get stored data
    const storedData = await getStoredData();

    // Get current day's XP
    const todayXP = getCurrentDayXP();
    const today = formatDate(new Date());

    // Extract completed tasks
    const completedTasks = extractCompletedTasks();
    storedData[today] = todayXP;

    // Save updated data
    await saveData(storedData);

    // Update UI
    updateUI(storedData);

    // Update today's XP
    // if (!storedData[today] || storedData[today] < todayXP) {
    //   storedData[today] = 2000;
    // }

    // Add completed tasks XP
    // completedTasks.forEach(task => {
    //   if (!storedData[task.date]) {
    //     storedData[task.date] = 0;
    //   }
    //   // Only update if the extracted XP is higher (to avoid double counting)
    //   if (task.xp > storedData[task.date]) {
    //     storedData[task.date] = task.xp;
    //   }
    // });

    // const xpByDate = completedTasks.reduce((map, task) => {
    //   map[task.date] = (map[task.date] || 0) + task.xp;
    //   return map;
    // }, {});

    // // Merge into storage (skip today, since you’re already using getCurrentDayXP())
    // Object.entries(xpByDate).forEach(([date, sumXp]) => {
    //   if (date === today) return;
    //   else storedData[date] = sumXp;
    // });

    // // Save updated data
    // await saveData(storedData);

    // // Update UI
    // updateUI(storedData);
  }

  // Get stored progress data
  async function getStoredData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || {});
      });
    });
  }

  // Save progress data
  async function saveData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
    });
  }

  // Calculate streak
  function calculateStreak(data) {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    // Check backwards from today
    while (true) {
      const dateStr = formatDate(checkDate);
      if (data[dateStr] && data[dateStr] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (formatDate(checkDate) === formatDate(today)) {
        // Today has no XP yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Calculate total learning days
  function calculateTotalDays(data) {
    return Object.keys(data).filter(date => data[date] > 0).length;
  }

  // Update the UI
  function updateUI(data) {
    // Update stats
    const streak = calculateStreak(data);
    const totalDays = calculateTotalDays(data);
    const todayXP = getCurrentDayXP();

    document.getElementById('ma-streak').textContent = streak;
    document.getElementById('ma-total-days').textContent = totalDays;
    document.getElementById('ma-today-xp').textContent = todayXP;

    // Generate contributions chart
    generateContributionsChart(data);
  }

  // Generate GitHub-style contributions chart
  function generateContributionsChart(data) {
    const chartContainer = document.getElementById('ma-chart');
    chartContainer.innerHTML = '';

    // Clean up any existing tooltips
    const existingTooltips = document.querySelectorAll('.ma-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());

    // Calculate how many days to show based on widget width
    const widget = document.getElementById(WIDGET_ID);
    const widgetWidth = widget ? widget.offsetWidth : 800;
    const maxWeeks = 52; // Show maximum 1 year
    const blockSize = 10;
    const blockGap = 3;
    const dayLabelsWidth = 32;
    const padding = 40;

    // Calculate how many weeks can fit
    const availableWidth = widgetWidth - dayLabelsWidth - padding * 2;
    const weeksToShow = Math.min(Math.floor(availableWidth / (blockSize + blockGap)), maxWeeks);
    const daysToShow = weeksToShow * 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToShow + 1);

    // Calculate max XP for scaling
    const maxXP = Math.max(...Object.values(data), 1);

    // Generate weeks
    const weeks = [];
    let currentDate = new Date(startDate);
    let currentWeek = [];

    // Start from the beginning of the week
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      const xp = data[dateStr] || 0;
      const level = getContributionLevel(xp, maxXP);

      currentWeek.push({
        date: dateStr,
        xp: xp,
        level: level,
        dayOfWeek: currentDate.getDay()
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add the last incomplete week
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Create the chart
    const chart = document.createElement('div');
    chart.className = 'ma-contributions-grid';

    // Add month labels
    const monthLabels = document.createElement('div');
    monthLabels.className = 'ma-month-labels';
    const monthsToShow = getMonthsInRange(startDate, endDate);
    monthsToShow.forEach(month => {
      const label = document.createElement('span');
      label.className = 'ma-month-label';
      label.textContent = month.label;
      // Position based on week index with proper spacing
      label.style.left = `${(month.startWeek - 1) * (blockSize + blockGap)}px`;
      monthLabels.appendChild(label);
    });
    chart.appendChild(monthLabels);

    // Add day labels
    const dayLabels = document.createElement('div');
    dayLabels.className = 'ma-day-labels';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day, index) => {
      if (index % 2 === 1) { // Show every other day
        const label = document.createElement('span');
        label.className = 'ma-day-label';
        label.textContent = day;
        dayLabels.appendChild(label);
      } else {
        dayLabels.appendChild(document.createElement('span'));
      }
    });

    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'ma-grid-container';
    gridContainer.appendChild(dayLabels);

    // Create weeks container
    const weeksContainer = document.createElement('div');
    weeksContainer.className = 'ma-weeks-container';

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'ma-tooltip';
    document.body.appendChild(tooltip);

    // Add contribution blocks
    weeks.forEach((week, weekIndex) => {
      const weekColumn = document.createElement('div');
      weekColumn.className = 'ma-week-column';

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayData = week.find(d => d.dayOfWeek === dayIndex);
        const block = document.createElement('div');
        block.className = 'ma-contribution-block';

        if (dayData) {
          block.classList.add(`ma-level-${dayData.level}`);
          // Store data for tooltip
          block.dataset.date = dayData.date;
          block.dataset.xp = dayData.xp;

          // Add hover events for custom tooltip
          block.addEventListener('mouseenter', (e) => {
            const rect = e.target.getBoundingClientRect();
            const date = new Date(dayData.date);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            tooltip.textContent = `${dateStr}: ${dayData.xp} XP`;

            // Calculate position
            let left = rect.left + rect.width / 2;
            let top = rect.top - 15;

            // Ensure tooltip stays within viewport
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.transform = 'translate(-50%, -100%)';
            tooltip.classList.add('visible');

            // Adjust if tooltip goes off screen
            setTimeout(() => {
              const tooltipRect = tooltip.getBoundingClientRect();
              if (tooltipRect.left < 10) {
                tooltip.style.transform = 'translate(0, -100%)';
                tooltip.style.left = '10px';
              } else if (tooltipRect.right > window.innerWidth - 10) {
                tooltip.style.transform = 'translate(-100%, -100%)';
                tooltip.style.left = `${window.innerWidth - 10}px`;
              }
            }, 0);
          });

          block.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
            // Reset transform for next use
            setTimeout(() => {
              tooltip.style.transform = 'translate(-50%, -100%)';
            }, 200);
          });
        } else {
          block.classList.add('ma-empty');
        }

        weekColumn.appendChild(block);
      }

      weeksContainer.appendChild(weekColumn);
    });

    gridContainer.appendChild(weeksContainer);
    chart.appendChild(gridContainer);
    chartContainer.appendChild(chart);

    // Clean up tooltip on widget removal
    const existingTooltip = document.querySelector('.ma-tooltip');
    if (existingTooltip && existingTooltip !== tooltip) {
      existingTooltip.remove();
    }
  }

  // Get contribution level based on XP
  function getContributionLevel(xp, maxXP) {
    if (xp === 0) return 0;
    const percentage = xp / maxXP;
    if (percentage <= 0.25) return 1;
    if (percentage <= 0.5) return 2;
    if (percentage <= 0.75) return 3;
    return 4;
  }

  // Get months in date range for labels
  function getMonthsInRange(startDate, endDate) {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let currentDate = new Date(startDate);
    // Adjust to start of week
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    let weekIndex = 0;
    let lastMonth = -1;
    let lastYear = -1;

    while (currentDate <= endDate) {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();

      if (month !== lastMonth || year !== lastYear) {
        months.push({
          label: monthNames[month],
          startWeek: weekIndex
        });
        lastMonth = month;
        lastYear = year;
      }

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
      weekIndex++;
    }

    return months;
  }

  // Initialize the extension
  init();
})();
(function () {
  const baseDate = new Date(1984, 0, 1);
  const cycleOrder = [2, 3, 5, 7];
  const cycleDescriptors = [
    { cycle: 2, key: 'two', className: 'legend-two' },
    { cycle: 3, key: 'three', className: 'legend-three' },
    { cycle: 5, key: 'five', className: 'legend-five' },
    { cycle: 7, key: 'seven', className: 'legend-seven' }
  ];
  const defaultCycleConfig = Object.freeze({
    2: ['陰', '陽'],
    3: ['石', '鋏', '紙'],
    5: ['風', '雨', '雷', '雲', '霧'],
    7: ['日', '月', '火', '水', '木', '金', '土']
  });
  const SETTINGS_STORAGE_KEY = 'cycledayCalendar.cycleNames';

  const cycleConfigState = {
    config: loadCycleConfig()
  };

  let cycleMeta = createCycleMeta(cycleConfigState.config);

  const ringContainer = document.getElementById('ring');
  const ringCenter = document.getElementById('ring-center');
  const ringYearEl = document.getElementById('ring-year');
  const ringMonthNumberEl = document.getElementById('ring-month-number');
  const ringDateEl = document.getElementById('ring-date');
  const ringTimeEl = document.getElementById('ring-time');
  const ringTitle = document.getElementById('ring-title');
  const fallbackList = document.getElementById('fallback-list');

  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const todayBtn = document.getElementById('today');

  const legendPanel = document.querySelector('.legend-panel');
  const legendToggle = document.getElementById('legend-toggle');
  const legendSection = document.querySelector('.legend');
  const legendList = document.getElementById('legend-list');
  const appMain = document.querySelector('.app-main');

  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  const settingsForm = document.getElementById('settings-form');
  const settingsReset = document.getElementById('settings-reset');
  const settingsImportInput = document.getElementById('settings-import-input');
  const settingsExport = document.getElementById('settings-export');

  let isSyncingSettingsForm = false;

  const state = {
    today: new Date(),
    viewYear: 0,
    viewMonth: 0,
    selectedDate: null
  };

  const legendState = {
    hidden: true
  };

  function cloneCycleConfig(source) {
    return cycleOrder.reduce((acc, cycle) => {
      acc[cycle] = Array.isArray(source[cycle]) ? [...source[cycle]] : [...defaultCycleConfig[cycle]];
      return acc;
    }, {});
  }

  function createCycleMeta(config) {
    return cycleOrder.reduce((acc, cycle) => {
      acc[cycle] = { names: [...config[cycle]] };
      return acc;
    }, {});
  }

  function normalizeCycleConfig(rawConfig) {
    const normalized = {};
    cycleOrder.forEach((cycle) => {
      const defaults = defaultCycleConfig[cycle];
      const values = Array.isArray(rawConfig?.[cycle]) ? rawConfig[cycle] : [];
      normalized[cycle] = Array.from({ length: cycle }, (_, index) => {
        const value = values[index];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
        return defaults[index];
      });
    });
    return normalized;
  }

  function loadCycleConfig() {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) {
        return cloneCycleConfig(defaultCycleConfig);
      }
      const parsed = JSON.parse(stored);
      return normalizeCycleConfig(parsed);
    } catch (error) {
      console.warn('Failed to load cycle settings from localStorage.', error);
      return cloneCycleConfig(defaultCycleConfig);
    }
  }

  function saveCycleConfig(config) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save cycle settings to localStorage.', error);
    }
  }

  function applyCycleConfig(newConfig, { skipSave = false } = {}) {
    const normalized = normalizeCycleConfig(newConfig);
    cycleConfigState.config = normalized;
    cycleMeta = createCycleMeta(normalized);
    if (!skipSave) {
      saveCycleConfig(normalized);
    }
    syncSettingsFormInputs();
    renderLegendEntries();
    render();
  }

  function syncSettingsFormInputs() {
    if (!settingsForm) {
      return;
    }
    const inputs = settingsForm.querySelectorAll('input[data-cycle]');
    if (!inputs.length) {
      return;
    }
    isSyncingSettingsForm = true;
    inputs.forEach((input) => {
      const cycle = Number(input.dataset.cycle);
      const index = Number(input.dataset.index);
      if (!Number.isFinite(cycle) || !Number.isFinite(index)) {
        return;
      }
      input.value = cycleConfigState.config[cycle][index] || '';
      input.placeholder = defaultCycleConfig[cycle][index] || '';
    });
    isSyncingSettingsForm = false;
  }

  function renderLegendEntries() {
    if (!legendList) {
      return;
    }
    legendList.innerHTML = '';
    cycleDescriptors.forEach(({ cycle, className }) => {
      const item = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = `legend-dot ${className}`;
      dot.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      const names = cycleConfigState.config[cycle] || [];
      text.textContent = `${cycle}日周期: ${names.join('・')}`;
      item.appendChild(dot);
      item.appendChild(text);
      legendList.appendChild(item);
    });
  }

  function buildSettingsForm() {
    if (!settingsForm) {
      return;
    }
    const help = settingsForm.querySelector('#settings-help');
    settingsForm.innerHTML = '';
    if (help) {
      settingsForm.appendChild(help);
    }
    cycleDescriptors.forEach(({ cycle }) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'settings-fieldset';
      const legend = document.createElement('legend');
      legend.textContent = `${cycle}日周期`;
      fieldset.appendChild(legend);

      const wrapper = document.createElement('div');
      wrapper.className = 'settings-cycle-inputs';

      for (let index = 0; index < cycle; index += 1) {
        const row = document.createElement('div');
        row.className = 'settings-input-row';

        const label = document.createElement('label');
        const inputId = `settings-${cycle}-${index}`;
        label.setAttribute('for', inputId);
        label.textContent = `${index + 1}日目`;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = inputId;
        input.dataset.cycle = String(cycle);
        input.dataset.index = String(index);
        input.placeholder = defaultCycleConfig[cycle][index] || '';
        input.value = cycleConfigState.config[cycle][index] || '';
        input.addEventListener('change', handleSettingsInput);

        row.appendChild(label);
        row.appendChild(input);
        wrapper.appendChild(row);
      }

      fieldset.appendChild(wrapper);
      settingsForm.appendChild(fieldset);
    });

    settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }

  function handleSettingsInput(event) {
    if (isSyncingSettingsForm) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const cycle = Number(target.dataset.cycle);
    const index = Number(target.dataset.index);
    if (!Number.isFinite(cycle) || !Number.isFinite(index)) {
      return;
    }
    const rawValue = target.value;
    const normalizedValue = rawValue && rawValue.trim() ? rawValue.trim() : defaultCycleConfig[cycle][index];
    const nextConfig = cloneCycleConfig(cycleConfigState.config);
    nextConfig[cycle][index] = normalizedValue;
    applyCycleConfig(nextConfig);
    if (target.value !== normalizedValue) {
      isSyncingSettingsForm = true;
      target.value = normalizedValue;
      isSyncingSettingsForm = false;
    }
  }

  function setSettingsVisibility(visible) {
    if (!settingsPanel || !settingsToggle) {
      return;
    }
    if (visible) {
      settingsPanel.removeAttribute('hidden');
    } else {
      settingsPanel.setAttribute('hidden', '');
    }
    settingsToggle.setAttribute('aria-expanded', String(visible));
    settingsToggle.setAttribute('aria-label', visible ? '曜日設定を閉じる' : '曜日設定を開く');
  }

  function focusFirstSettingsInput() {
    if (!settingsPanel) {
      return;
    }
    const input = settingsPanel.querySelector('input[data-cycle]');
    if (input) {
      input.focus();
    }
  }

  function initializeSettingsUI() {
    if (!settingsForm) {
      return;
    }
    buildSettingsForm();
    syncSettingsFormInputs();

    if (settingsToggle) {
      setSettingsVisibility(false);
      settingsToggle.addEventListener('click', () => {
        const isHidden = settingsPanel ? settingsPanel.hasAttribute('hidden') : true;
        setSettingsVisibility(isHidden);
        if (isHidden) {
          focusFirstSettingsInput();
        }
      });
    }

    if (settingsClose) {
      settingsClose.addEventListener('click', () => {
        setSettingsVisibility(false);
        if (settingsToggle) {
          settingsToggle.focus();
        }
      });
    }

    if (settingsReset) {
      settingsReset.addEventListener('click', () => {
        applyCycleConfig(cloneCycleConfig(defaultCycleConfig));
      });
    }

    if (settingsImportInput) {
      settingsImportInput.addEventListener('change', handleImportChange);
    }

    if (settingsExport) {
      settingsExport.addEventListener('click', handleExportClick);
    }
  }

  function handleImportChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const parsed = JSON.parse(text);
        applyCycleConfig(parsed);
      } catch (error) {
        console.error('Failed to import cycle settings.', error);
        window.alert('設定ファイルの読み込みに失敗しました。JSON形式を確認してください。');
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      console.error('Failed to import cycle settings.', reader.error);
      window.alert('設定ファイルの読み込みに失敗しました。再度お試しください。');
      input.value = '';
    };
    reader.readAsText(file);
  }

  function handleExportClick() {
    const data = JSON.stringify(cycleConfigState.config, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    anchor.href = url;
    anchor.download = `cycle-settings_${timestamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }


  function setNodeText(node, value) {
    if (!node) {
      return;
    }
    if (node.textContent !== undefined) {
      node.textContent = value;
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    node.appendChild(document.createTextNode(value));
  }

  function startClock() {
    if (!ringDateEl || !ringTimeEl) {
      return;
    }
    function update() {
      const now = new Date();
      const { dateLabel, timeLabel } = formatDateParts(now);
      setNodeText(ringDateEl, dateLabel);
      setNodeText(ringTimeEl, timeLabel);
    }
    update();
    setInterval(update, 1000);
  }

  function formatDateParts(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const delta = deltaDays(date);
    const cycleStamp = cycleOrder
      .map((cycle) => cycleLabel(delta, cycle))
      .join('');
    return {
      dateLabel: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}(${cycleStamp})`,
      timeLabel: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    };
  }

  function initState() {
    const today = new Date();
    state.today = today;
    const hashMatch = location.hash.match(/^(#|#!)(\d{4})-(\d{2})$/);
    if (hashMatch) {
      state.viewYear = Number(hashMatch[2]);
      state.viewMonth = Number(hashMatch[3]) - 1;
    } else {
      state.viewYear = today.getFullYear();
      state.viewMonth = today.getMonth();
    }
    state.selectedDate = new Date(state.viewYear, state.viewMonth, today.getDate());
    if (state.selectedDate.getMonth() !== state.viewMonth) {
      state.selectedDate = new Date(state.viewYear, state.viewMonth, 1);
    }
  }

  function deltaDays(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((d - baseDate) / 86_400_000);
  }

  function cycleIndex(delta, n) {
    const mod = delta % n;
    return (mod + n) % n;
  }

  function cycleLabel(delta, n) {
    const meta = cycleMeta[n];
    const idx = cycleIndex(delta, n);
    if (!meta || !Array.isArray(meta.names)) {
      return String(idx + 1);
    }
    return meta.names[idx] ?? String(idx + 1);
  }

  function render() {
    const year = state.viewYear;
    const month = state.viewMonth;
    updateCenterMonth(year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const svgSize = 600;
    const center = svgSize / 2;
    const radius = svgSize * 0.4;
    const subStep = 19;
    const subOffset = 10;
    const radii = {
      date: radius,
      two: radius - subStep - subOffset,
      three: radius - subStep * 2 - subOffset,
      five: radius - subStep * 3 - subOffset,
      seven: radius - subStep * 4 - subOffset
    };

    const ringSection = ringContainer.parentElement;
    if (ringSection) {
      const sectionRect = ringSection.getBoundingClientRect();
      const availableWidth = ringSection.clientWidth;
      const availableHeight = window.innerHeight - sectionRect.top - 56;
      if (availableWidth > 0) {
        const widthLimit = Math.max(availableWidth, 0);
        const heightLimit = availableHeight > 0 ? availableHeight : widthLimit;
        let ringSize = Math.min(widthLimit, heightLimit);
        if (!Number.isFinite(ringSize) || ringSize <= 0) {
          ringSize = widthLimit;
        }
        if (ringSize > 0) {
          ringContainer.style.width = `${ringSize}px`;
          ringContainer.style.height = `${ringSize}px`;
        }
      }
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'ring-calendar-svg');
    svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
    svg.setAttribute('aria-hidden', 'false');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // background ring bands
    [
      { radius: radii.date - subStep  - subOffset, className: 'cycle-band two' },
      { radius: radii.date - subStep * 2 - subOffset, className: 'cycle-band three' },
      { radius: radii.date - subStep * 3 - subOffset, className: 'cycle-band five' },
      { radius: radii.date - subStep * 4 - subOffset, className: 'cycle-band seven' }
    ].forEach(({ radius: r, className }) => {
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', center);
      circle.setAttribute('cy', center);
      circle.setAttribute('r', r);
      circle.setAttribute('class', className);
      svg.appendChild(circle);
    });

    const today = state.today;
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDay = isCurrentMonth ? today.getDate() : null;

    let selectedDay = state.selectedDate && state.selectedDate.getMonth() === month && state.selectedDate.getFullYear() === year
      ? state.selectedDate.getDate()
      : null;
    if (!selectedDay) {
      selectedDay = todayDay || 1;
      state.selectedDate = new Date(year, month, selectedDay);
    }

    const pointerGroup = document.createElementNS(svgNS, 'g');
    pointerGroup.setAttribute('class', 'pointer-group');
    svg.appendChild(pointerGroup);

    const fallbackItems = [];

    const dayAngle = (day) => {
      const base = (day - 0.5) / daysInMonth;
      return 2 * Math.PI * base - Math.PI / 2 + Math.PI / daysInMonth;
    };

    for (let day = 1; day <= daysInMonth; day += 1) {
      const theta = dayAngle(day);
      const x = center + radii.date * Math.cos(theta);
      const y = center + radii.date * Math.sin(theta);

      const dateObj = new Date(year, month, day);
      const delta = deltaDays(dateObj);
      const dayCycles = {};
      cycleDescriptors.forEach(({ cycle }) => {
        dayCycles[cycle] = cycleLabel(delta, cycle);
      });

      const dayGroup = document.createElementNS(svgNS, 'g');
      dayGroup.setAttribute('transform', `translate(${x}, ${y})`);
      dayGroup.setAttribute('class', 'calendar-day');
      dayGroup.setAttribute('tabindex', '0');
      dayGroup.setAttribute('role', 'button');
      dayGroup.setAttribute('aria-pressed', String(day === selectedDay));
      dayGroup.dataset.day = day;
      dayGroup.dataset.date = dateObj.toISOString();
      const cycleDataset = cycleDescriptors.reduce((acc, descriptor) => {
        acc[descriptor.key] = dayCycles[descriptor.cycle];
        return acc;
      }, {});
      dayGroup.dataset.cycles = JSON.stringify(cycleDataset);

      const title = document.createElementNS(svgNS, 'title');
      const cycleSummary = cycleOrder.map((cycle) => dayCycles[cycle]).join(', ');
      title.textContent = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${cycleSummary}`;
      dayGroup.appendChild(title);

      cycleDescriptors.forEach(({ cycle, key, className }) => {
        const subTheta = dayAngle(day);
        const subRadius = radii[key];
        const sx = center + subRadius * Math.cos(subTheta);
        const sy = center + subRadius * Math.sin(subTheta);
        const subText = document.createElementNS(svgNS, 'text');
        subText.setAttribute('x', sx);
        subText.setAttribute('y', sy);
        subText.setAttribute('class', `sub-label ${className}`);
        subText.textContent = shrinkLabel(dayCycles[cycle]);
        svg.appendChild(subText);
      });

      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('r', 18);
      circle.setAttribute('class', day === todayDay ? 'today-circle' : 'day-circle');
      circle.setAttribute('cx', 0);
      circle.setAttribute('cy', 0);
      dayGroup.appendChild(circle);

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('class', `day-label${day === todayDay ? ' today-text' : ''}`);
      text.setAttribute('x', 0);
      text.setAttribute('y', 4);
      text.textContent = day;
      dayGroup.appendChild(text);

      if (day === selectedDay) {
        const outline = document.createElementNS(svgNS, 'circle');
        outline.setAttribute('class', 'selected-outline');
        outline.setAttribute('r', 20);
        outline.setAttribute('cx', 0);
        outline.setAttribute('cy', 0);
        dayGroup.appendChild(outline);
      }

      if (day === todayDay) {
        const angle = dayAngle(day);
        const wedgeWidth = (2 * Math.PI) / daysInMonth * 0.95;
        const outerRadius = radii.date + 28;
        const weekdayRingRadius = Math.max(radii.seven - 15, 0);
        const outerOffset = wedgeWidth / 2;
        const innerOffset = wedgeWidth * 0.5;

        const points = [
          {
            x: center + outerRadius * Math.cos(angle - outerOffset),
            y: center + outerRadius * Math.sin(angle - outerOffset)
          },
          {
            x: center + weekdayRingRadius * Math.cos(angle - innerOffset),
            y: center + weekdayRingRadius * Math.sin(angle - innerOffset)
          },
          {
            x: center + weekdayRingRadius * Math.cos(angle + innerOffset),
            y: center + weekdayRingRadius * Math.sin(angle + innerOffset)
          },
          {
            x: center + outerRadius * Math.cos(angle + outerOffset),
            y: center + outerRadius * Math.sin(angle + outerOffset)
          }
        ];

        const polygon = document.createElementNS(svgNS, 'polygon');
        polygon.setAttribute(
          'points',
          points.map(({ x, y }) => `${x},${y}`).join(' ')
        );
        polygon.setAttribute('class', 'pointer-triangle');
        pointerGroup.appendChild(polygon);
      }

      dayGroup.addEventListener('click', handleDaySelection);
      dayGroup.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          handleDaySelection.call(dayGroup, ev);
        }
      });

      svg.appendChild(dayGroup);

      fallbackItems.push({
        day,
        labels: cycleDescriptors.reduce((acc, descriptor) => {
          acc[descriptor.cycle] = dayCycles[descriptor.cycle];
          return acc;
        }, {})
      });
    }

    const existingSvg = ringContainer ? ringContainer.querySelector('svg.ring-calendar-svg') : null;
    if (existingSvg) {
      existingSvg.remove();
    }
    if (ringContainer) {
      if (ringCenter) {
        ringContainer.insertBefore(svg, ringCenter);
      } else {
        ringContainer.appendChild(svg);
      }
    }
    updateRingTitle(year, month);
    renderFallbackList(year, month, fallbackItems);
    updateHash(year, month);
  }

  function updateCenterMonth(year, month) {
    if (ringYearEl) {
      setNodeText(ringYearEl, `${year}年`);
    }
    if (ringMonthNumberEl) {
      setNodeText(ringMonthNumberEl, String(month + 1));
    }
  }

  function shrinkLabel(label) {
    return label;
  }

  function updateRingTitle(year, month) {
    ringTitle.textContent = `${year}年 ${String(month + 1).padStart(2, '0')}月の環状月暦`;
  }

  function renderFallbackList(year, month, items) {
    const listWrapper = document.createElement('div');
    listWrapper.className = 'fallback-list';
    const heading = document.createElement('h3');
    heading.textContent = `${year}年${String(month + 1).padStart(2, '0')}月 日別サイクル`;
    heading.id = 'fallback-heading';
    listWrapper.appendChild(heading);

    const list = document.createElement('ul');
    items.forEach(({ day, labels }) => {
      const item = document.createElement('li');
      const labelText = cycleDescriptors
        .map(({ cycle }) => labels[cycle])
        .join(' / ');
      item.textContent = `${String(day).padStart(2, '0')}日: ${labelText}`;
      list.appendChild(item);
    });

    listWrapper.appendChild(list);
    fallbackList.innerHTML = '';
    fallbackList.appendChild(listWrapper);
  }

  function updateHash(year, month) {
    const fragment = `#${year}-${String(month + 1).padStart(2, '0')}`;
    if (location.hash !== fragment) {
      history.replaceState(null, '', fragment);
    }
  }

  function handleDaySelection(event) {
    const dayGroup = this;
    const iso = dayGroup.dataset.date;
    const date = new Date(iso);
    state.selectedDate = date;
    render();
  }

  function changeMonth(offset) {
    const newMonth = new Date(state.viewYear, state.viewMonth + offset, 1);
    state.viewYear = newMonth.getFullYear();
    state.viewMonth = newMonth.getMonth();
    const selectedDay = state.selectedDate ? state.selectedDate.getDate() : 1;
    state.selectedDate = new Date(state.viewYear, state.viewMonth, selectedDay);
    if (state.selectedDate.getMonth() !== state.viewMonth) {
      state.selectedDate = new Date(state.viewYear, state.viewMonth, new Date(state.viewYear, state.viewMonth + 1, 0).getDate());
    }
    render();
  }

  prevBtn.addEventListener('click', () => changeMonth(-1));
  nextBtn.addEventListener('click', () => changeMonth(1));
  todayBtn.addEventListener('click', () => {
    const today = new Date();
    state.viewYear = today.getFullYear();
    state.viewMonth = today.getMonth();
    state.selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    render();
  });

  window.addEventListener('resize', () => {
    render();
  });

  window.addEventListener('hashchange', () => {
    const hashMatch = location.hash.match(/^(#|#!)(\d{4})-(\d{2})$/);
    if (!hashMatch) return;
    const year = Number(hashMatch[2]);
    const month = Number(hashMatch[3]) - 1;
    state.viewYear = year;
    state.viewMonth = month;
    state.selectedDate = new Date(year, month, state.today.getDate());
    if (state.selectedDate.getMonth() !== month) {
      state.selectedDate = new Date(year, month, 1);
    }
    render();
  });

  document.addEventListener('DOMContentLoaded', () => {
    startClock();
    initState();
    initializeSettingsUI();
    renderLegendEntries();
    render();
    if (legendToggle) {
      legendToggle.addEventListener('click', () => {
        legendState.hidden = !legendState.hidden;
        updateLegendVisibility();
        render();
      });
      updateLegendVisibility();
    }
  });

  function updateLegendVisibility() {
    if (!legendPanel || !legendToggle || !appMain) {
      return;
    }
    legendPanel.classList.toggle('is-hidden', legendState.hidden);
    appMain.classList.toggle('legend-hidden', legendState.hidden);
    legendToggle.setAttribute('aria-expanded', String(!legendState.hidden));
    legendToggle.textContent = legendState.hidden ? '凡例を表示' : '凡例を隠す';
    legendToggle.setAttribute('aria-label', legendState.hidden ? '凡例を表示' : '凡例を隠す');
    if (legendSection) {
      if (legendState.hidden) {
        legendSection.setAttribute('aria-hidden', 'true');
        legendSection.setAttribute('inert', '');
        legendSection.hidden = true;
      } else {
        legendSection.removeAttribute('aria-hidden');
        legendSection.removeAttribute('inert');
        legendSection.hidden = false;
      }
    }
  }
})();

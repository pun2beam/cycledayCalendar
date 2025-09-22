(function () {
  const baseDate = new Date(1980, 0, 1);
  const twoCycle = ['陰', '陽'];
  const threeCycle = ['石', '鋏', '紙'];
  const fiveCycle = ['風', '雨', '雷', '雲', '霧'];
  const sevenCycle = ['日', '月', '火', '水', '木', '金', '土'];

  const cycleMeta = {
    2: { names: twoCycle },
    3: { names: threeCycle },
    5: { names: fiveCycle },
    7: { names: sevenCycle, isWeekday: true }
  };

  const ringContainer = document.getElementById('ring');
  const ringCenter = document.getElementById('ring-center');
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
  const appMain = document.querySelector('.app-main');

  const state = {
    today: new Date(),
    viewYear: 0,
    viewMonth: 0,
    selectedDate: null
  };

  const legendState = {
    hidden: true
  };

  function startClock() {
    if (!ringDateEl || !ringTimeEl) {
      return;
    }
    function update() {
      const now = new Date();
      const { dateLabel, timeLabel } = formatDateParts(now);
      ringDateEl.textContent = dateLabel;
      ringTimeEl.textContent = timeLabel;
    }
    update();
    setInterval(update, 1000);
  }

  function formatDateParts(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const delta = deltaDays(date);
    const cycleStamp = [2, 3, 5, 7]
      .map((cycle) => cycleLabel(date, delta, cycle))
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

  function cycleLabel(date, delta, n) {
    const meta = cycleMeta[n];
    if (meta.isWeekday) {
      return meta.names[date.getDay()];
    }
    const idx = cycleIndex(delta, n);
    return meta.names[idx];
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
      const label2 = cycleLabel(dateObj, delta, 2);
      const label3 = cycleLabel(dateObj, delta, 3);
      const label5 = cycleLabel(dateObj, delta, 5);
      const label7 = cycleLabel(dateObj, delta, 7);

      const dayGroup = document.createElementNS(svgNS, 'g');
      dayGroup.setAttribute('transform', `translate(${x}, ${y})`);
      dayGroup.setAttribute('class', 'calendar-day');
      dayGroup.setAttribute('tabindex', '0');
      dayGroup.setAttribute('role', 'button');
      dayGroup.setAttribute('aria-pressed', String(day === selectedDay));
      dayGroup.dataset.day = day;
      dayGroup.dataset.date = dateObj.toISOString();
      dayGroup.dataset.cycles = JSON.stringify({
        two: label2,
        three: label3,
        five: label5,
        seven: label7
      });

      const title = document.createElementNS(svgNS, 'title');
      title.textContent = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${label2}, ${label3}, ${label5}, ${label7}`;
      dayGroup.appendChild(title);

      const subLabels = [
        { text: label2, radius: radii.two, className: 'legend-two' },
        { text: label3, radius: radii.three, className: 'legend-three' },
        { text: label5, radius: radii.five, className: 'legend-five' },
        { text: label7, radius: radii.seven, className: 'legend-seven' }
      ];

      subLabels.forEach(({ text, radius: subR, className: legendClass }, index) => {
        const subTheta = dayAngle(day);
        const sx = center + subR * Math.cos(subTheta);
        const sy = center + subR * Math.sin(subTheta);
        const subText = document.createElementNS(svgNS, 'text');
        subText.setAttribute('x', sx);
        subText.setAttribute('y', sy);
        subText.setAttribute('class', `sub-label ${legendClass}`);
        subText.textContent = shrinkLabel(text);
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
        label2,
        label3,
        label5,
        label7
      });
    }

    const existingSvg = ringContainer ? ringContainer.querySelector('svg') : null;
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
    if (ringMonthNumberEl) {
      ringMonthNumberEl.textContent = String(month + 1);
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
    items.forEach(({ day, label2, label3, label5, label7 }) => {
      const item = document.createElement('li');
      item.textContent = `${String(day).padStart(2, '0')}日: ${label2} / ${label3} / ${label5} / ${label7}`;
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

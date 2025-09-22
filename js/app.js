(function () {
  const baseDate = new Date(1980, 0, 1);
  const twoCycle = ['子', '午'];
  const threeCycle = ['子', '辰', '申'];
  const fiveCycle = ['甲', '丙', '戊', '庚', '壬'];
  const sevenCycle = ['日', '月', '火', '水', '木', '金', '土'];

  const cycleMeta = {
    2: { prefix: '[二]', names: twoCycle },
    3: { prefix: '[三]', names: threeCycle },
    5: { prefix: '[五]', names: fiveCycle },
    7: { prefix: '[七]', names: sevenCycle }
  };

  const nowEl = document.getElementById('now');
  const ringContainer = document.getElementById('ring');
  const ringTitle = document.getElementById('ring-title');
  const fallbackList = document.getElementById('fallback-list');

  const detailDateEl = document.getElementById('detail-date');
  const detailTwoEl = document.getElementById('detail-two');
  const detailThreeEl = document.getElementById('detail-three');
  const detailFiveEl = document.getElementById('detail-five');
  const detailSevenEl = document.getElementById('detail-seven');

  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const todayBtn = document.getElementById('today');

  const state = {
    today: new Date(),
    viewYear: 0,
    viewMonth: 0,
    selectedDate: null
  };

  function startClock() {
    function update() {
      const now = new Date();
      nowEl.textContent = formatDateTime(now);
    }
    update();
    setInterval(update, 1000);
  }

  function formatDateTime(date) {
    const dayOfWeek = sevenCycle[date.getDay()];
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} (${dayOfWeek}) ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
    const idx = cycleIndex(delta, n);
    return `${cycleMeta[n].prefix}${cycleMeta[n].names[idx]}曜`;
  }

  function render() {
    const year = state.viewYear;
    const month = state.viewMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const svgSize = 600;
    const center = svgSize / 2;
    const radius = svgSize * 0.4;
    const subStep = 38;
    const radii = {
      date: radius,
      two: radius - subStep,
      three: radius - subStep * 2,
      five: radius - subStep * 3,
      seven: radius - subStep * 4
    };

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
    svg.setAttribute('aria-hidden', 'false');

    // background ring bands
    [
      { radius: radii.date + 18, className: 'cycle-band two' },
      { radius: radii.date - subStep + 18, className: 'cycle-band three' },
      { radius: radii.date - subStep * 2 + 18, className: 'cycle-band five' },
      { radius: radii.date - subStep * 3 + 18, className: 'cycle-band seven' }
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

    const fallbackItems = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const theta = (2 * Math.PI * ((day - 0.5) / daysInMonth)) - Math.PI / 2;
      const x = center + radii.date * Math.cos(theta);
      const y = center + radii.date * Math.sin(theta);

      const dateObj = new Date(year, month, day);
      const delta = deltaDays(dateObj);
      const label2 = cycleLabel(delta, 2);
      const label3 = cycleLabel(delta, 3);
      const label5 = cycleLabel(delta, 5);
      const label7 = cycleLabel(delta, 7);

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
        const subTheta = (2 * Math.PI * ((day - 0.5) / daysInMonth)) - Math.PI / 2;
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
        outline.setAttribute('r', 22);
        outline.setAttribute('cx', 0);
        outline.setAttribute('cy', 0);
        dayGroup.appendChild(outline);
      }

      if (day === todayDay) {
        const angle = (2 * Math.PI * ((day - 0.5) / daysInMonth)) - Math.PI / 2;
        const pointer = document.createElementNS(svgNS, 'line');
        const pointerLength = radii.date + 36;
        pointer.setAttribute('x1', center);
        pointer.setAttribute('y1', center);
        pointer.setAttribute('x2', center + pointerLength * Math.cos(angle));
        pointer.setAttribute('y2', center + pointerLength * Math.sin(angle));
        pointer.setAttribute('class', 'pointer');
        pointerGroup.appendChild(pointer);

        const tip = document.createElementNS(svgNS, 'circle');
        tip.setAttribute('cx', center + (pointerLength + 6) * Math.cos(angle));
        tip.setAttribute('cy', center + (pointerLength + 6) * Math.sin(angle));
        tip.setAttribute('r', 4);
        tip.setAttribute('class', 'pointer-tip');
        pointerGroup.appendChild(tip);
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

    svg.appendChild(pointerGroup);

    ringContainer.innerHTML = '';
    ringContainer.appendChild(svg);
    updateRingTitle(year, month);
    renderFallbackList(year, month, fallbackItems);
    updateHash(year, month);
    updateDetail(state.selectedDate);
  }

  function shrinkLabel(label) {
    if (window.innerWidth < 360) {
      return label.replace(/\[(.)\]./, '$1');
    }
    if (window.innerWidth < 420) {
      return label.replace(/\[(.)\]/, '$1:').replace('曜', '');
    }
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
    updateDetail(date);
    render();
  }

  function updateDetail(date) {
    if (!date) return;
    const delta = deltaDays(date);
    detailDateEl.textContent = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    detailTwoEl.textContent = cycleLabel(delta, 2);
    detailThreeEl.textContent = cycleLabel(delta, 3);
    detailFiveEl.textContent = cycleLabel(delta, 5);
    detailSevenEl.textContent = cycleLabel(delta, 7);
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
  });
})();

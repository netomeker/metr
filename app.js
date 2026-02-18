const editables = document.querySelectorAll('.editable[contenteditable="true"]');
const adminPanel = document.getElementById('adminPanel');
const inputs = document.querySelectorAll('[data-input]');
const metricNodes = document.querySelectorAll('[data-metric]');
const overlayItems = document.querySelectorAll('.overlay-item');
const mockCanvas = document.getElementById('mockCanvas');
const visibilityList = document.getElementById('visibilityList');
const resetValuesBtn = document.getElementById('resetValues');
const resetLabelsBtn = document.getElementById('resetLabels');
const resetLayoutBtn = document.getElementById('resetLayout');
const showAllBtn = document.getElementById('showAllItems');
const hideAllBtn = document.getElementById('hideAllItems');
const sizeTargetSelect = document.getElementById('sizeTargetSelect');
const sizeTargetRange = document.getElementById('sizeTargetRange');
const sizeTargetOutput = document.getElementById('sizeTargetOutput');
const sizeGlobalRange = document.getElementById('sizeGlobalRange');
const sizeGlobalOutput = document.getElementById('sizeGlobalOutput');
const resetItemSizeBtn = document.getElementById('resetItemSize');
const resetAllSizesBtn = document.getElementById('resetAllSizes');
const periodSelects = document.querySelectorAll('[data-select]');
const periodMainSelect = document.querySelector('[data-select="periodMain"]');
const periodDropdown = document.querySelector('.overlay-dropdown');
const periodTrigger = document.getElementById('periodTrigger');
const periodMenu = document.getElementById('periodMenu');
const periodLabel = document.getElementById('periodLabel');
const periodOptions = periodMenu ? periodMenu.querySelectorAll('.dropdown-option') : [];
const customOptionLabel = 'Data personalizada';
const customDaysStorageKey = 'metricsCustomPeriodDays';

const basePeriodKey = 'Últimos 30 dias';
const periodDaysMap = {
  'Hoje': 1,
  'Últimos 7 dias': 7,
  'Últimos 15 dias': 15,
  'Últimos 30 dias': 30,
  'Este mês': 30,
  'Mês passado': 30,
};

const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatDatePt(date) {
  const day = date.getDate();
  const month = monthLabels[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function subtractDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function getCustomDays() {
  const raw = localStorage.getItem(customDaysStorageKey);
  const parsed = Number.parseInt(raw || '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function saveCustomDays(days) {
  localStorage.setItem(customDaysStorageKey, String(days));
}

function updatePeriodRanges() {
  if (!periodMenu) {
    return;
  }
  const today = new Date();
  periodMenu.querySelectorAll('[data-range]').forEach((node) => {
    const key = node.dataset.range;
    if (!key) {
      return;
    }
    if (key === 'Hoje') {
      node.textContent = formatDatePt(today);
      return;
    }
    const days = key === customOptionLabel ? getCustomDays() : getPeriodDays(key);
    const start = subtractDays(today, days);
    node.textContent = `${formatDatePt(start)} a ${formatDatePt(today)}`;
  });
}

function requestCustomDays() {
  const current = getCustomDays();
  const result = window.prompt('Quantos dias esse período representa?', String(current));
  if (result === null) {
    return null;
  }
  const parsed = Number.parseInt(result.replace(',', '.'), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  saveCustomDays(parsed);
  updatePeriodRanges();
  return parsed;
}

const storageKey = 'metricsAdminState';
const labelStorageKey = 'metricsLabelState';
const positionStorageKey = 'metricsPositionState';
const visibilityStorageKey = 'metricsVisibilityState';
const sizeStorageKey = 'metricsSizeState';

const defaultState = {
  salesCount: 0,
  avgSalePrice: 0,
  unitsPerSale: 1,
  visits: 0,
  canceledSales: 0,
  costPerUnit: 0,
  feeRate: 0,
  adSpend: 0,
  otherCosts: 0,
};

const formatters = {
  number: new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }),
  currency: new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  percent: new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }),
};

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const normalized = String(value).replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeState(state) {
  const salesCount = Math.max(0, Math.round(toNumber(state.salesCount)));
  const avgSalePrice = Math.max(0, toNumber(state.avgSalePrice));
  const unitsPerSale = Math.max(0.1, toNumber(state.unitsPerSale) || 1);
  const visits = Math.max(0, Math.round(toNumber(state.visits)));
  const canceledSalesRaw = Math.max(0, Math.round(toNumber(state.canceledSales)));
  const canceledSales = Math.min(canceledSalesRaw, salesCount);
  const costPerUnit = Math.max(0, toNumber(state.costPerUnit));
  const feeRate = Math.min(100, Math.max(0, toNumber(state.feeRate)));
  const adSpend = Math.max(0, toNumber(state.adSpend));
  const otherCosts = Math.max(0, toNumber(state.otherCosts));

  return {
    salesCount,
    avgSalePrice,
    unitsPerSale,
    visits,
    canceledSales,
    costPerUnit,
    feeRate,
    adSpend,
    otherCosts,
  };
}

function getCurrentPeriod() {
  if (periodMainSelect) {
    return periodMainSelect.value;
  }
  return basePeriodKey;
}

function getPeriodDays(periodKey) {
  if (periodKey === customOptionLabel) {
    return getCustomDays();
  }
  return periodDaysMap[periodKey] || 30;
}

function deriveStateForPeriod(base, periodKey) {
  const ratio = getPeriodDays(periodKey) / getPeriodDays(basePeriodKey);
  const derived = { ...base };
  const scaleInt = (value) => Math.max(0, Math.round(value * ratio));
  const scaleMoney = (value) => Math.max(0, Number((value * ratio).toFixed(2)));

  derived.salesCount = scaleInt(base.salesCount);
  derived.visits = scaleInt(base.visits);
  derived.canceledSales = scaleInt(base.canceledSales);
  derived.adSpend = scaleMoney(base.adSpend);
  derived.otherCosts = scaleMoney(base.otherCosts);

  return normalizeState(derived);
}

function computeMetrics(state) {
  const base = normalizeState(state);

  const grossSales = base.salesCount * base.avgSalePrice;
  const unitsSold = base.salesCount * base.unitsPerSale;
  const avgUnitPrice = unitsSold > 0 ? grossSales / unitsSold : 0;
  const conversion = base.visits > 0 ? (base.salesCount / base.visits) * 100 : 0;
  const cancelRate = base.salesCount > 0 ? (base.canceledSales / base.salesCount) * 100 : 0;
  const netSalesCount = Math.max(0, base.salesCount - base.canceledSales);
  const canceledRevenue = base.canceledSales * base.avgSalePrice;
  const netSales = grossSales - canceledRevenue;
  const cogs = unitsSold * base.costPerUnit;
  const platformFees = netSales * (base.feeRate / 100);
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - platformFees - base.adSpend - base.otherCosts;
  const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  return {
    ...base,
    grossSales,
    unitsSold,
    avgUnitPrice,
    conversion,
    cancelRate,
    netSalesCount,
    canceledRevenue,
    netSales,
    cogs,
    platformFees,
    grossProfit,
    netProfit,
    netMargin,
  };
}

function formatValue(value, format) {
  const safe = Number.isFinite(value) ? value : 0;
  const formatter = formatters[format] || formatters.number;
  return formatter.format(format === 'number' ? Math.round(safe) : safe);
}

function renderMetrics(metrics) {
  metricNodes.forEach((node) => {
    const key = node.dataset.metric;
    if (!key || !(key in metrics)) {
      return;
    }
    const format = node.dataset.format || 'number';
    const prefix = node.dataset.prefix || '';
    const suffix = node.dataset.suffix || '';
    let text = formatValue(metrics[key], format);
    if (prefix) {
      text = `${prefix} ${text}`;
    }
    if (suffix) {
      text = `${text}${suffix}`;
    }
    node.textContent = text;
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (error) {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function loadLabels() {
  try {
    const raw = localStorage.getItem(labelStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveLabels(labels) {
  try {
    localStorage.setItem(labelStorageKey, JSON.stringify(labels));
  } catch (error) {
    // Ignore storage failures.
  }
}

function loadPositions() {
  try {
    const raw = localStorage.getItem(positionStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function savePositions(positions) {
  try {
    localStorage.setItem(positionStorageKey, JSON.stringify(positions));
  } catch (error) {
    // Ignore storage failures.
  }
}

function loadVisibility() {
  try {
    const raw = localStorage.getItem(visibilityStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveVisibility(state) {
  try {
    localStorage.setItem(visibilityStorageKey, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

const minSizeScale = 0.5;
const maxSizeScale = 2.5;

function clampSizeScale(value, fallback = 1) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(maxSizeScale, Math.max(minSizeScale, value));
}

function scaleToPercent(scale) {
  return Math.round(clampSizeScale(scale) * 100);
}

function percentToScale(percent) {
  return clampSizeScale(percent / 100);
}

function syncInputs(state) {
  inputs.forEach((input) => {
    const key = input.dataset.input;
    if (!key || !(key in state)) {
      return;
    }
    input.value = state[key];
  });
}

function setInputsDisabled(isDisabled) {
  inputs.forEach((input) => {
    input.disabled = isDisabled;
  });
}

function updateCanvasScale() {
  if (!mockCanvas) {
    return;
  }
  const rect = mockCanvas.getBoundingClientRect();
  const scale = rect.width / 1381;
  document.documentElement.style.setProperty('--canvas-scale', scale.toFixed(4));
}

function getPosKey(node) {
  return node.dataset.posKey || node.dataset.metric || node.dataset.editKey || null;
}

function loadSizes() {
  const fallback = { global: 1, items: {} };
  try {
    const raw = localStorage.getItem(sizeStorageKey);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const next = {
      global: clampSizeScale(parsed && parsed.global, 1),
      items: {},
    };

    if (parsed && typeof parsed.items === 'object') {
      Object.entries(parsed.items).forEach(([key, value]) => {
        const scale = clampSizeScale(Number(value), 1);
        if (Math.abs(scale - 1) > 0.001) {
          next.items[key] = scale;
        }
      });
    }
    return next;
  } catch (error) {
    return fallback;
  }
}

function saveSizes(state) {
  try {
    localStorage.setItem(sizeStorageKey, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function getItemScale(sizeState, key) {
  if (!key) {
    return 1;
  }
  return clampSizeScale(Number(sizeState.items[key]), 1);
}

function setItemScale(sizeState, key, scale) {
  if (!key) {
    return;
  }
  const safeScale = clampSizeScale(scale, 1);
  if (Math.abs(safeScale - 1) <= 0.001) {
    delete sizeState.items[key];
    return;
  }
  sizeState.items[key] = safeScale;
}

function applySizes(sizeState) {
  if (mockCanvas) {
    mockCanvas.style.setProperty('--overlay-size-scale', clampSizeScale(sizeState.global, 1).toFixed(3));
  }
  overlayItems.forEach((item) => {
    const key = getPosKey(item);
    const scale = key ? getItemScale(sizeState, key) : 1;
    item.style.setProperty('--item-scale', scale.toFixed(3));
  });
}

function buildSizeTargetOptions() {
  if (!sizeTargetSelect) {
    return;
  }
  sizeTargetSelect.innerHTML = '';
  overlayItems.forEach((item) => {
    const key = getPosKey(item);
    if (!key) {
      return;
    }
    const option = document.createElement('option');
    option.value = key;
    option.textContent = item.dataset.title || key;
    sizeTargetSelect.appendChild(option);
  });
}

function syncSizeControls(sizeState) {
  if (sizeGlobalRange) {
    sizeGlobalRange.value = String(scaleToPercent(sizeState.global));
  }
  if (sizeGlobalOutput) {
    sizeGlobalOutput.textContent = `${scaleToPercent(sizeState.global)}%`;
  }
  if (!sizeTargetSelect || !sizeTargetRange || !sizeTargetOutput) {
    return;
  }
  if (!sizeTargetSelect.value && sizeTargetSelect.options.length > 0) {
    sizeTargetSelect.value = sizeTargetSelect.options[0].value;
  }
  const activeKey = sizeTargetSelect.value;
  const activeScale = getItemScale(sizeState, activeKey);
  sizeTargetRange.value = String(scaleToPercent(activeScale));
  sizeTargetOutput.textContent = `${scaleToPercent(activeScale)}%`;
}

function applyVisibility(item, visible) {
  item.classList.toggle('is-hidden', !visible);
}

function buildVisibilityList(visibilityState) {
  if (!visibilityList) {
    return;
  }
  visibilityList.innerHTML = '';

  overlayItems.forEach((item) => {
    const key = getPosKey(item);
    if (!key) {
      return;
    }
    const title = item.dataset.title || key;
    const row = document.createElement('div');
    row.className = 'admin-item';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = visibilityState[key] !== false;

    const name = document.createElement('span');
    name.textContent = title;

    checkbox.addEventListener('change', () => {
      const visible = checkbox.checked;
      visibilityState[key] = visible;
      applyVisibility(item, visible);
      saveVisibility(visibilityState);
    });

    label.appendChild(checkbox);
    label.appendChild(name);
    row.appendChild(label);
    visibilityList.appendChild(row);
  });
}

const initialPositions = new Map();
overlayItems.forEach((item) => {
  const key = getPosKey(item);
  const x = parseFloat(item.style.getPropertyValue('--x'));
  const y = parseFloat(item.style.getPropertyValue('--y'));
  if (key && Number.isFinite(x) && Number.isFinite(y)) {
    initialPositions.set(key, { x, y });
  }
});

const sizeState = loadSizes();

let baseState = loadState() || { ...defaultState };
baseState = normalizeState(baseState);
function refreshDisplay() {
  const currentPeriod = getCurrentPeriod();
  const isDerived = currentPeriod !== basePeriodKey;
  const displayState = isDerived ? deriveStateForPeriod(baseState, currentPeriod) : baseState;
  syncInputs(displayState);
  setInputsDisabled(isDerived);
  renderMetrics(computeMetrics(displayState));
}

refreshDisplay();

inputs.forEach((input) => {
  input.addEventListener('input', () => {
    const key = input.dataset.input;
    if (!key) {
      return;
    }
    if (getCurrentPeriod() !== basePeriodKey) {
      refreshDisplay();
      return;
    }
    baseState[key] = input.value;
    renderMetrics(computeMetrics(baseState));
    saveState(baseState);
  });

  input.addEventListener('blur', () => {
    if (getCurrentPeriod() !== basePeriodKey) {
      refreshDisplay();
      return;
    }
    baseState = normalizeState(baseState);
    syncInputs(baseState);
    renderMetrics(computeMetrics(baseState));
    saveState(baseState);
  });
});

const labelState = loadLabels();
if (labelState.periodMain === 'Personalizado') {
  labelState.periodMain = customOptionLabel;
}
if (labelState.periodCompare === 'Personalizado') {
  labelState.periodCompare = customOptionLabel;
}
editables.forEach((el) => {
  el.setAttribute('spellcheck', 'false');
  const key = el.dataset.editKey;
  const fallback = el.dataset.default || el.textContent.trim() || '—';
  if (key && labelState[key]) {
    el.textContent = labelState[key];
  } else {
    el.textContent = fallback;
  }

  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      el.blur();
    }
  });

  el.addEventListener('paste', (event) => {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  el.addEventListener('focus', () => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });

  el.addEventListener('blur', () => {
    const text = el.textContent.trim() || fallback;
    el.textContent = text;
    if (key) {
      labelState[key] = text;
      saveLabels(labelState);
      syncPeriodSelects();
    }
  });
});

function getEditableByKey(key) {
  if (!key) {
    return null;
  }
  return document.querySelector(`[data-edit-key="${key}"]`);
}

function setEditableText(key, value) {
  const el = getEditableByKey(key);
  if (el) {
    el.textContent = value;
  }
  labelState[key] = value;
  saveLabels(labelState);
  syncPeriodSelects();
  if (key === 'periodMain') {
    refreshDisplay();
  }
}

function ensureCustomOption(select, value) {
  const existing = select.querySelector('option[data-custom="true"]');
  if (!value) {
    if (existing) {
      existing.remove();
    }
    return;
  }
  if (existing) {
    existing.value = value;
    existing.textContent = value;
    return;
  }
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  option.dataset.custom = 'true';
  const customPlaceholder = Array.from(select.options).find((opt) => opt.value === customOptionLabel);
  if (customPlaceholder) {
    select.insertBefore(option, customPlaceholder);
  } else {
    select.appendChild(option);
  }
}

function syncPeriodSelects() {
  periodSelects.forEach((select) => {
    const key = select.dataset.select;
    if (!key) {
      return;
    }
    const currentValue = labelState[key] || select.value;
    const options = Array.from(select.options).map((opt) => opt.value);
    if (options.includes(currentValue)) {
      select.value = currentValue;
      if (currentValue !== customOptionLabel) {
        ensureCustomOption(select, '');
      }
      return;
    }
    ensureCustomOption(select, currentValue);
    select.value = currentValue;
  });
  updatePeriodDropdown();
}

function updatePeriodDropdown() {
  if (!periodLabel || !periodMenu) {
    return;
  }
  const current = getCurrentPeriod();
  periodLabel.textContent = current;
  periodMenu.querySelectorAll('.dropdown-option').forEach((option) => {
    const key = option.dataset.period;
    const isActive = key === current;
    option.classList.toggle('active', isActive);
    option.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  updatePeriodRanges();
}

function closePeriodDropdown() {
  if (!periodDropdown || !periodTrigger || !periodMenu) {
    return;
  }
  periodDropdown.classList.remove('open');
  periodMenu.setAttribute('aria-hidden', 'true');
  periodTrigger.setAttribute('aria-expanded', 'false');
}

function openPeriodDropdown() {
  if (!periodDropdown || !periodTrigger || !periodMenu) {
    return;
  }
  periodDropdown.classList.add('open');
  periodMenu.setAttribute('aria-hidden', 'false');
  periodTrigger.setAttribute('aria-expanded', 'true');
  updatePeriodRanges();
}

function requestCustomPeriod(key) {
  const current = labelState[key] || '';
  const result = window.prompt('Digite o período personalizado:', current);
  if (result === null) {
    return null;
  }
  const trimmed = result.trim();
  return trimmed.length ? trimmed : null;
}

const positionState = loadPositions();
overlayItems.forEach((item) => {
  const key = getPosKey(item);
  if (!key || !positionState[key]) {
    return;
  }
  const { x, y } = positionState[key];
  if (typeof x === 'number' && typeof y === 'number') {
    item.style.setProperty('--x', x);
    item.style.setProperty('--y', y);
  }
});

const visibilityState = loadVisibility();
overlayItems.forEach((item) => {
  const key = getPosKey(item);
  if (!key) {
    return;
  }
  const visible = visibilityState[key] !== false;
  applyVisibility(item, visible);
});

buildVisibilityList(visibilityState);
buildSizeTargetOptions();
applySizes(sizeState);
syncSizeControls(sizeState);
updateCanvasScale();
window.addEventListener('resize', updateCanvasScale);
syncPeriodSelects();
refreshDisplay();

function toggleAdmin() {
  const isOpen = document.body.classList.toggle('admin-open');
  if (adminPanel) {
    adminPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
}

function toggleLayoutMode() {
  document.body.classList.toggle('layout-mode');
}

let draggingItem = null;
let draggingKey = null;

overlayItems.forEach((item) => {
  item.addEventListener('click', () => {
    if (!sizeTargetSelect) {
      return;
    }
    const key = getPosKey(item);
    if (!key || sizeTargetSelect.value === key) {
      return;
    }
    sizeTargetSelect.value = key;
    syncSizeControls(sizeState);
  });

  item.addEventListener('pointerdown', (event) => {
    if (!document.body.classList.contains('layout-mode') || !mockCanvas) {
      return;
    }
    draggingItem = item;
    draggingKey = getPosKey(item);
    item.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  item.addEventListener('pointermove', (event) => {
    if (!draggingItem || draggingItem !== item || !mockCanvas) {
      return;
    }
    const rect = mockCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.min(100, Math.max(0, x));
    const clampedY = Math.min(100, Math.max(0, y));
    item.style.setProperty('--x', clampedX.toFixed(2));
    item.style.setProperty('--y', clampedY.toFixed(2));
  });

  item.addEventListener('pointerup', (event) => {
    if (!draggingItem || draggingItem !== item) {
      return;
    }
    item.releasePointerCapture(event.pointerId);
    draggingItem = null;
    if (draggingKey) {
      const x = parseFloat(item.style.getPropertyValue('--x'));
      const y = parseFloat(item.style.getPropertyValue('--y'));
      if (Number.isFinite(x) && Number.isFinite(y)) {
        positionState[draggingKey] = { x, y };
        savePositions(positionState);
      }
    }
    draggingKey = null;
  });

  item.addEventListener('pointercancel', () => {
    draggingItem = null;
    draggingKey = null;
  });
});

if (resetValuesBtn) {
  resetValuesBtn.addEventListener('click', () => {
    baseState = { ...defaultState };
    refreshDisplay();
    saveState(baseState);
  });
}

if (resetLabelsBtn) {
  resetLabelsBtn.addEventListener('click', () => {
    Object.keys(labelState).forEach((key) => delete labelState[key]);
    editables.forEach((el) => {
      const fallback = el.dataset.default || el.textContent.trim() || '—';
      el.textContent = fallback;
      const key = el.dataset.editKey;
      if (key) {
        labelState[key] = fallback;
      }
    });
    saveLabels(labelState);
    syncPeriodSelects();
  });
}

if (resetLayoutBtn) {
  resetLayoutBtn.addEventListener('click', () => {
    Object.keys(positionState).forEach((key) => delete positionState[key]);
    overlayItems.forEach((item) => {
      const key = getPosKey(item);
      if (!key || !initialPositions.has(key)) {
        return;
      }
      const { x, y } = initialPositions.get(key);
      item.style.setProperty('--x', x.toFixed(2));
      item.style.setProperty('--y', y.toFixed(2));
    });
    savePositions(positionState);
  });
}

function setAllVisibility(visible) {
  overlayItems.forEach((item) => {
    const key = getPosKey(item);
    if (!key) {
      return;
    }
    visibilityState[key] = visible;
    applyVisibility(item, visible);
  });
  saveVisibility(visibilityState);
  buildVisibilityList(visibilityState);
}

if (showAllBtn) {
  showAllBtn.addEventListener('click', () => setAllVisibility(true));
}

if (hideAllBtn) {
  hideAllBtn.addEventListener('click', () => setAllVisibility(false));
}

if (sizeTargetSelect) {
  sizeTargetSelect.addEventListener('change', () => {
    syncSizeControls(sizeState);
  });
}

if (sizeTargetRange) {
  sizeTargetRange.addEventListener('input', () => {
    const key = sizeTargetSelect ? sizeTargetSelect.value : '';
    const scale = percentToScale(toNumber(sizeTargetRange.value));
    setItemScale(sizeState, key, scale);
    applySizes(sizeState);
    syncSizeControls(sizeState);
    saveSizes(sizeState);
  });
}

if (sizeGlobalRange) {
  sizeGlobalRange.addEventListener('input', () => {
    sizeState.global = percentToScale(toNumber(sizeGlobalRange.value));
    applySizes(sizeState);
    syncSizeControls(sizeState);
    saveSizes(sizeState);
  });
}

if (resetItemSizeBtn) {
  resetItemSizeBtn.addEventListener('click', () => {
    const key = sizeTargetSelect ? sizeTargetSelect.value : '';
    if (!key) {
      return;
    }
    delete sizeState.items[key];
    applySizes(sizeState);
    syncSizeControls(sizeState);
    saveSizes(sizeState);
  });
}

if (resetAllSizesBtn) {
  resetAllSizesBtn.addEventListener('click', () => {
    sizeState.global = 1;
    sizeState.items = {};
    applySizes(sizeState);
    syncSizeControls(sizeState);
    saveSizes(sizeState);
  });
}

periodSelects.forEach((select) => {
  select.addEventListener('change', () => {
    const key = select.dataset.select;
    if (!key) {
      return;
    }
    const value = select.value;
    if (value === customOptionLabel) {
      if (key === 'periodMain') {
        const customDays = requestCustomDays();
        if (customDays) {
          setEditableText(key, customOptionLabel);
        } else {
          syncPeriodSelects();
        }
        return;
      }
      const customValue = requestCustomPeriod(key);
      if (customValue) {
        setEditableText(key, customValue);
      } else {
        syncPeriodSelects();
      }
      return;
    }
    setEditableText(key, value);
  });
});

if (periodTrigger) {
  periodTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    if (periodDropdown && periodDropdown.classList.contains('open')) {
      closePeriodDropdown();
    } else {
      openPeriodDropdown();
    }
  });
}

if (periodOptions.length) {
  periodOptions.forEach((option) => {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      const value = option.dataset.period;
      if (!value) {
        return;
      }
      if (value === customOptionLabel) {
        const customDays = requestCustomDays();
        if (!customDays) {
          closePeriodDropdown();
          return;
        }
      }
      setEditableText('periodMain', value);
      closePeriodDropdown();
    });
  });
}

document.addEventListener('click', (event) => {
  if (!periodDropdown || !periodDropdown.classList.contains('open')) {
    return;
  }
  if (periodDropdown.contains(event.target)) {
    return;
  }
  closePeriodDropdown();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePeriodDropdown();
  }
});

let lastKeyPressed = '';
let lastKeyTime = 0;
const doublePressDelay = 400;

document.addEventListener('keydown', (event) => {
  if (event.repeat) {
    return;
  }

  const target = event.target;
  const isEditingField =
    target instanceof Element && (target.matches('input, textarea, select') || target.isContentEditable);
  if (isEditingField) {
    return;
  }

  const key = String(event.key || '').toLowerCase();
  const isPlainA =
    (event.code === 'KeyA' || key === 'a') && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  const isPlainF =
    (event.code === 'KeyF' || key === 'f') && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;

  if (!isPlainA && !isPlainF) {
    return;
  }

  const now = Date.now();
  const keyId = isPlainA ? 'a' : 'f';
  const isDoublePress = keyId === lastKeyPressed && now - lastKeyTime <= doublePressDelay;

  lastKeyPressed = keyId;
  lastKeyTime = now;

  if (!isDoublePress) {
    return;
  }

  lastKeyPressed = '';
  lastKeyTime = 0;

  if (keyId === 'a') {
    toggleAdmin();
    return;
  }

  if (keyId === 'f') {
    toggleLayoutMode();
  }
});

(function () {
  'use strict';

  document.getElementById('backButton').addEventListener('click', function () {
    // Catalog settings run in HudWidgetSettingsFragment, whose onClose
    // callback finishes the native settings activity.
    if (!window.androidApi) {
      window.location.replace('index.html');
      return;
    }

    try {
      if (typeof window.androidApi.onClose !== 'function') {
        throw new Error('Android onClose is unavailable');
      }
      window.androidApi.onClose('SECURE_TOKEN_2025');
    } catch (error) {
      console.error('Не удалось закрыть настройки', error);
      document.getElementById('status').textContent = 'Не удалось закрыть экран. Используйте системную кнопку «Назад».';
    }
  });
})();

(function () {
  'use strict';
  const store = window.HUDSettings;
  const $ = id => document.getElementById(id);
  const frame = $('preview');
  let settings = store.load();
  let mode = 'navigation';
  let selected = store.widgets[0].id;
  let ratio = 1;
  let drag = null;
  const handles = new Map();
  const rows = new Map();
  const api = () => frame.contentWindow.HUDLayout;
  function persist() {
    $('status').textContent = store.save(settings)
      ? 'Настройки сохранены'
      : 'Не удалось сохранить. Проверьте доступ к хранилищу браузера.';
  }
  function position(id) {
    const item = settings.profiles[mode].widgets[id];
    const rect = api()?.rect(id);
    return { x: item.x ?? (rect ? rect.x / 10 : 0), y: item.y ?? (rect ? rect.y / 5.6 : 0) };
  }
  function refreshControls() {
    const item = settings.profiles[mode].widgets[selected];
    const pos = position(selected);
    $('selectedName').textContent = store.widgets.find(w => w.id === selected).name;
    $('scale').value = item.scale * 100;
    $('scaleValue').textContent = Math.round(item.scale * 100) + '%';
    $('posX').value = pos.x.toFixed(1);
    $('posY').value = pos.y.toFixed(1);
    rows.forEach(({ row, checkbox, button }, id) => {
      row.hidden = !store.available(mode, id);
      row.classList.toggle('active', id === selected);
      checkbox.checked = settings.profiles[mode].widgets[id].visible;
      button.setAttribute('aria-pressed', String(id === selected));
    });
  }
  function refreshHandles() {
    if (!api()) return;
    handles.forEach((handle, id) => {
      const rect = api().rect(id);
      handle.hidden = !store.available(mode, id) || !settings.profiles[mode].widgets[id].visible;
      handle.classList.toggle('selected', id === selected);
      Object.assign(handle.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    });
  }
  function render() {
    api()?.setPreviewMode(mode);
    api()?.apply(settings);
    refreshControls();
    refreshHandles();
  }
  function update(patch, save = true) {
    const pos = position(selected);
    settings.profiles[mode].widgets[selected] = { ...settings.profiles[mode].widgets[selected], ...pos, ...patch };
    settings = store.normalize(settings);
    render();
    if (save) persist();
  }
  store.widgets.forEach(({ id, name }) => {
    const row = document.createElement('div');
    row.className = 'widget-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', 'Показывать: ' + name);
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => { selected = id; render(); };
    checkbox.onchange = () => { settings.profiles[mode].widgets[id].visible = checkbox.checked; render(); persist(); };
    row.append(checkbox, button);
    $('widgetList').append(row);
    rows.set(id, { row, checkbox, button });
    const handle = document.createElement('button');
    handle.className = 'handle';
    handle.setAttribute('aria-label', 'Переместить: ' + name);
    handle.title = name + ' — перетащите или используйте стрелки';
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !api()) return;
      selected = id;
      const rect = api().rect(id);
      drag = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, left: rect.x, top: rect.y, width: rect.width, height: rect.height };
      handle.setPointerCapture(event.pointerId);
      render();
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== id || drag.pointer !== event.pointerId) return;
      const x = Math.max(0, Math.min(1000 - drag.width, drag.left + (event.clientX - drag.x) / ratio));
      const y = Math.max(0, Math.min(560 - drag.height, drag.top + (event.clientY - drag.y) / ratio));
      update({ x: x / 10, y: y / 5.6 }, false);
    });
    const finish = () => { if (drag?.id === id) { drag = null; persist(); } };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
    handle.addEventListener('keydown', event => {
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!moves[event.key]) return;
      event.preventDefault(); selected = id;
      const pos = position(id), step = event.shiftKey ? 1 : 0.1;
      update({ x: pos.x + moves[event.key][0] * step, y: pos.y + moves[event.key][1] * step });
    });
    $('handles').append(handle); handles.set(id, handle);
  });
  $('scale').oninput = () => update({ scale: Number($('scale').value) / 100 });
  ['posX', 'posY'].forEach((id, index) => {
    $(id).onchange = () => {
      if ($(id).value === '' || !Number.isFinite($(id).valueAsNumber)) { refreshControls(); return; }
      update({ [index ? 'y' : 'x']: $(id).valueAsNumber });
    };
  });
  function visibility(visible) { store.widgets.forEach(({ id }) => { if (store.available(mode, id)) settings.profiles[mode].widgets[id].visible = visible; }); render(); persist(); }
  $('showAll').onclick = () => visibility(true);
  $('hideAll').onclick = () => visibility(false);
  $('resetOne').onclick = () => { settings.profiles[mode].widgets[selected] = store.normalize(null).profiles[mode].widgets[selected]; render(); persist(); };
  $('resetAll').onclick = () => { settings.profiles[mode] = store.normalize(null).profiles[mode]; render(); persist(); };
  document.querySelectorAll('[data-layout-mode]').forEach(button => {
    button.addEventListener('click', () => {
      if (drag) { drag = null; persist(); }
      mode = button.dataset.layoutMode;
      if (!store.available(mode, selected)) selected = 'hudPanelTop';
      document.querySelectorAll('[data-layout-mode]').forEach(option => {
        option.setAttribute('aria-pressed', String(option.dataset.layoutMode === mode));
      });
      $('modeHint').textContent = mode === 'navigation'
        ? 'Навигация включена: доступны все блоки. Настройки каждого режима сохраняются отдельно.'
        : 'Навигация выключена: антирадар и GPS. Настройки каждого режима сохраняются отдельно.';
      render();
    });
  });
  new ResizeObserver(() => { ratio = $('previewArea').clientWidth / 1000; $('canvas').style.transform = `scale(${ratio})`; }).observe($('previewArea'));
  frame.addEventListener('load', () => { render(); setTimeout(refreshHandles, 500); });
  window.addEventListener('storage', event => {
    if (event.key === store.key || event.key === null) { settings = store.load(); render(); }
  });
  refreshControls();
})();

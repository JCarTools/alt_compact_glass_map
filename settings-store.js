(function () {
  'use strict';
  const key = 'altCompactGlassSettings';
  const widgets = [
    { id: 'hudPanel', name: 'Навигация' },
    { id: 'hudPanelTop', name: 'Радар' },
    { id: 'gpsWidget', name: 'Сигнал GPS' },
    { id: 'routeMap', name: 'Мини-карта' }
  ];
  const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const modes = ['navigation', 'radar'];
  function normalizeWidgets(value) {
    const result = {};
    widgets.forEach(({ id }) => {
      const item = value?.[id] || {};
      result[id] = {
        visible: item.visible !== false,
        x: clamp(item.x, 0, 100, null),
        y: clamp(item.y, 0, 100, null),
        scale: clamp(item.scale, 0.5, 3, 1)
      };
    });
    return result;
  }
  function normalize(value) {
    const result = { version: 2, profiles: {} };
    modes.forEach(mode => {
      // Copy the old shared layout into both profiles without sharing objects.
      result.profiles[mode] = { widgets: normalizeWidgets(value?.profiles?.[mode]?.widgets ?? value?.widgets) };
    });
    return result;
  }
  function modeForState(state) { return state.navi ? 'navigation' : 'radar'; }
  function available(mode, id) { return mode === 'navigation' || (id !== 'hudPanel' && id !== 'routeMap'); }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(key))); }
    catch (_) { return normalize(null); }
  }
  function save(value) {
    const settings = normalize(value);
    try { localStorage.setItem(key, JSON.stringify(settings)); }
    catch (_) { return false; }
    window.dispatchEvent(new CustomEvent('hud-settings', { detail: settings }));
    return true;
  }
  window.HUDSettings = { key, widgets, modes, modeForState, available, normalize, load, save };
})();

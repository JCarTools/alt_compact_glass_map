(function () {
  'use strict';
  const store = window.HUDSettings;
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const slots = new Map();
  let settings = store.load();
  function apply(value) {
    settings = store.normalize(value);
    store.widgets.forEach(({ id }) => {
      const element = document.getElementById(id);
      const item = settings.widgets[id];
      element.classList.toggle('user-hidden', !item.visible);
      const custom = item.x !== null && item.y !== null;
      let slot = slots.get(id);
      if (custom && !slot) {
        const marker = document.createComment(id);
        element.before(marker);
        const wrapper = document.createElement('div');
        wrapper.className = 'layout-slot';
        document.body.append(wrapper);
        wrapper.append(element);
        slot = { wrapper, marker };
        slots.set(id, slot);
      }
      if (!custom && slot) {
        slot.marker.replaceWith(element);
        slot.wrapper.remove();
        slots.delete(id);
      }
      if (custom) {
        const { wrapper } = slot;
        wrapper.style.transform = `scale(${item.scale})`;
        wrapper.style.left = Math.min(innerWidth * item.x / 100, Math.max(0, innerWidth - element.offsetWidth * item.scale)) + 'px';
        wrapper.style.top = Math.min(innerHeight * item.y / 100, Math.max(0, innerHeight - element.offsetHeight * item.scale)) + 'px';
      }
    });
  }
  window.addEventListener('DOMContentLoaded', () => {
    if (preview) {
      document.body.classList.add('layout-preview');
      window.onAndroidEvent('hud', { hudSenderType: 'NAVI', naviOn: true, turnType: 3, turnDist: 350, nextRoad: 'Улица', speedLimit: 60 });
      window.onAndroidEvent('hud', { hudSenderType: 'ARAD', aradarOn: true, remainDist: 500, speedLimit: 60 });
      window.onAndroidEvent('GPSSignalQuality', { updateSignalQuality: 85 });
    }
    apply(settings);
    const observer = new ResizeObserver(() => apply(settings));
    store.widgets.forEach(({ id }) => observer.observe(document.getElementById(id)));
    window.HUDLayout = { apply, rect(id) {
      const r = document.getElementById(id).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    } };
  });
  window.addEventListener('resize', () => apply(settings));
  window.addEventListener('hud-settings', event => apply(event.detail));
  window.addEventListener('storage', event => {
    if (event.key === store.key || event.key === null) apply(store.load());
  });
})();

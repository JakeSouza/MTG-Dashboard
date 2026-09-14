// Animates a number counting up from 0, used for the win totals on load.
// Deliberately one orchestrated moment on page load, not a hover effect
// scattered across every element.
export function animateCount(el, target, { duration = 900, delay = 0 } = {}) {
  if (!el) return;
  const start = performance.now() + delay;

  function tick(now) {
    if (now < start) {
      requestAnimationFrame(tick);
      return;
    }
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
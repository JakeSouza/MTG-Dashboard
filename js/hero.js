// Sets the blurred, faded commander-art background behind the page header.
// Shared by index.html (the pod's current win leader) and player.html
// (that player's most-played deck).
export function setHeroArt(url) {
  const el = document.getElementById("hero-bg");
  if (!el || !url) return;
  el.style.backgroundImage = `url(${url})`;
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });
}
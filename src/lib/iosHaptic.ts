/**
 * Unofficial iPhone haptic: Safari has no Vibration API, but since iOS 18 it
 * plays a system tick when a native switch (`<input type="checkbox" switch>`)
 * toggles. Clicking a throwaway one borrows that tick. It only fires inside a
 * user gesture, and Apple may change it at any time; to drop it, delete this
 * file and its call in `haptics.ts`.
 */
export function playIosHaptic() {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.setAttribute("aria-hidden", "true");
  label.style.display = "none";
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}

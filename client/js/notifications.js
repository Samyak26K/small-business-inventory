
/* StockPilot reusable toast notifications */
(() => {
  let container;
  const timers = new WeakMap();

  function getContainer() {
    if (container?.isConnected) return container;

    container = document.createElement("div");
    container.className = "sp-toast-container";
    container.setAttribute("aria-label", "Notifications");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-relevant", "additions");

    document.body.appendChild(container);
    return container;
  }

  function show(message, type = "success", duration = 4500) {
    if (!message) return;

    const allowedTypes = ["success", "error", "warning", "info"];
    const safeType = allowedTypes.includes(type) ? type : "info";

    const toast = document.createElement("div");
    toast.className = `sp-toast sp-toast-${safeType}`;
    toast.setAttribute(
      "role",
      safeType === "error" ? "alert" : "status"
    );

    const icon = document.createElement("span");
    icon.className = "sp-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = {
      success: "✓",
      error: "!",
      warning: "⚠",
      info: "i"
    }[safeType];

    const text = document.createElement("p");
    text.className = "sp-toast-message";
    text.textContent = String(message);

    const close = document.createElement("button");
    close.className = "sp-toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";

    const dismiss = () => {
      const timer = timers.get(toast);
      if (timer) clearTimeout(timer);

      toast.classList.add("sp-toast-leaving");
      toast.addEventListener("animationend", () => toast.remove(), {
        once: true
      });

      // Fallback in case animations are disabled.
      setTimeout(() => toast.remove(), 250);
    };

    close.addEventListener("click", dismiss);

    toast.append(icon, text, close);
    getContainer().appendChild(toast);

    if (duration > 0) {
      timers.set(toast, setTimeout(dismiss, duration));
    }
  }

  window.StockPilotNotifications = { show };
})();

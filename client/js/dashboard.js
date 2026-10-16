
document.addEventListener("DOMContentLoaded", async () => {
  const token = sessionStorage.getItem("stockpilot_token");

  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  const status = document.getElementById("connection-status");
  const indicator = document.querySelector(".status-dot");
  const recentContainer = document.getElementById("recent-movements");

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-IN");
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short"
        });
  }

  function renderMovements(movements) {
    if (!recentContainer) return;

    if (!movements.length) {
      recentContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">◷</span>
          <h3>No stock movements yet</h3>
          <p>Record a stock transaction to see it here.</p>
        </div>`;
      return;
    }

    recentContainer.innerHTML = `
      <div class="table-wrapper">
        <table class="product-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Stock Change</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map((movement) => {
              const name = movement.productId?.name || "Unknown product";
              const sku = movement.productId?.sku || "";
              const change =
                Number(movement.quantityAfter) -
                Number(movement.quantityBefore);

              const displayChange =
                change > 0 ? `+${formatNumber(change)}` : formatNumber(change);

              return `
                <tr>
                  <td>
                    <strong>${escapeHTML(name)}</strong><br>
                    <small>${escapeHTML(sku)}</small>
                  </td>
                  <td>${escapeHTML(movement.type)}</td>
                  <td>${escapeHTML(displayChange)}</td>
                  <td>${escapeHTML(formatDate(movement.createdAt))}</td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  // 1. Check server and database connection.
  try {
    const health = await apiRequest("/api/health");

    if (status) {
      status.textContent = health.databaseReady
        ? "Database connected"
        : "Database disconnected";
    }

    if (indicator) {
      indicator.style.background = health.databaseReady
        ? "#55d6a0"
        : "#f4bd62";
    }
  } catch (error) {
    if (status) status.textContent = "Server unavailable";
    if (indicator) indicator.style.background = "#f4bd62";

    console.error("Health check failed:", error.message);
  }

  // 2. Load dashboard statistics.
  try {
    const result = await apiRequest("/api/dashboard/stats");

    if (!result || result.success !== true) {
      throw new Error(result?.message || "Unable to load statistics.");
    }

    const stats = result.stats || {};
    const movements = result.recentMovements || [];

    setText("total-products", formatNumber(stats.totalProducts));
    setText("low-stock-count", formatNumber(stats.lowStockProducts));
    setText("total-stock-units", formatNumber(stats.totalUnits));
    setText("inventory-value", formatCurrency(stats.inventoryValue));
    setText("out-of-stock-count", formatNumber(stats.outOfStockProducts));
    setText("recent-movement-count", formatNumber(movements.length));

    renderMovements(movements);
  } catch (error) {
    console.error("Dashboard statistics failed:", error);

    if (recentContainer) {
      recentContainer.innerHTML = `
        <div class="empty-state">
          <h3>Unable to load dashboard data</h3>
          <p>Check the dashboard API and server logs, then refresh.</p>
        </div>`;
    }
  }
});

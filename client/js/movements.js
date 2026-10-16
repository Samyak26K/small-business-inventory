
document.addEventListener("DOMContentLoaded", () => {
  if (!sessionStorage.getItem("stockpilot_token")) {
    window.location.replace("/login.html");
    return;
  }

  const $ = (id) => document.getElementById(id);
  const body = $("movement-body");
  const message = $("movement-message");
  let page = 1;
  const limit = 20;

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);

  async function loadMovements() {
    body.innerHTML =
      '<tr><td colspan="7">Loading history...</td></tr>';

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });

      if ($("movement-type").value) {
        params.set("type", $("movement-type").value);
      }

      const result = await apiRequest(`/api/stock?${params}`);
      const { movements, pagination } = result;

      body.innerHTML = movements.length
        ? movements.map((m) => {
            const date = new Date(m.createdAt).toLocaleString();
            const product = m.productId;
            const user = m.performedBy;

            const change = m.type === "IN"
              ? `+${m.quantity}`
              : m.type === "OUT"
                ? `-${m.quantity}`
                : `${m.quantityAfter - m.quantityBefore}`;

            return `
              <tr>
                <td>${escapeHTML(date)}</td>
                <td>${escapeHTML(product?.name || "Deleted product")}<br>
                    <small>${escapeHTML(product?.sku || "")}</small></td>
                <td>${escapeHTML(m.type)}</td>
                <td>${escapeHTML(change)}</td>
                <td>${m.quantityBefore} → ${m.quantityAfter}</td>
                <td>${escapeHTML(m.reason)}</td>
                <td>${escapeHTML(user?.name || "Unknown user")}</td>
              </tr>`;
          }).join("")
        : '<tr><td colspan="7">No movements recorded yet.</td></tr>';

      const pages = Math.max(1, pagination.pages);
      $("movement-page").textContent =
        `Page ${pagination.page} of ${pages} · ${pagination.total} records`;

      $("movement-prev").disabled = page <= 1;
      $("movement-next").disabled = page >= pages;
      message.textContent = "";
    } catch (error) {
      body.innerHTML =
        '<tr><td colspan="7">Unable to load movement history.</td></tr>';
      message.textContent = error.message;
      message.style.color = "#ff8b8b";
    }
  }

  $("movement-type").addEventListener("change", () => {
    page = 1;
    loadMovements();
  });

  $("refresh-movements").addEventListener("click", loadMovements);

  $("movement-prev").addEventListener("click", () => {
    if (page > 1) {
      page--;
      loadMovements();
    }
  });

  $("movement-next").addEventListener("click", () => {
    page++;
    loadMovements();
  });

  loadMovements();
});

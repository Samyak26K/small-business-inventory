
document.addEventListener("DOMContentLoaded", () => {
  if (!sessionStorage.getItem("stockpilot_token")) {
    window.location.replace("/login.html");
    return;
  }

  const $ = (id) => document.getElementById(id);

  const body = $("movement-body");
  const message = $("movement-message");

  const dialog = $("movement-dialog");
  const form = $("movement-form");
  const productSelect = $("movement-product");
  const typeSelect = $("movement-form-type");
  const quantityInput = $("movement-quantity");
  const formMessage = $("movement-form-message");
  const saveButton = $("save-movement");

  let page = 1;
  const limit = 20;
  let products = [];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function showFormMessage(text, isError = false) {
    formMessage.textContent = text;
    formMessage.style.color = isError ? "#ff8b8b" : "";
    formMessage.hidden = !text;
  }

  function showPageMessage(text, isError = false) {
  message.textContent = "";
  message.style.color = "";

  if (!text) return;

  window.StockPilotNotifications.show(
    text,
    isError ? "error" : "success"
  );
}

  function selectedProduct() {
    return products.find((product) =>
      product._id === productSelect.value
    );
  }

  function updateProductInfo() {
    const product = selectedProduct();

    $("movement-current-stock").textContent = product
      ? `${product.name} (${product.sku}) — Current stock: ${product.quantityOnHand}`
      : "Select a product to view current stock.";
  }

  function updateQuantityLabel() {
    const isAdjustment = typeSelect.value === "ADJUSTMENT";

    $("movement-quantity-label").textContent = isAdjustment
      ? "New counted quantity *"
      : "Movement quantity *";

    quantityInput.min = isAdjustment ? "0" : "1";
    quantityInput.value = "";
  }

  async function loadProducts() {
    const result = await apiRequest(
      "/api/products?status=active&limit=100"
    );

    products = result.products || [];

    productSelect.innerHTML =
      '<option value="">Select a product</option>' +
      products.map((product) =>
        `<option value="${escapeHTML(product._id)}">${escapeHTML(product.name)} — ${escapeHTML(product.sku)}</option>`
      ).join("");

    updateProductInfo();
  }

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
        ? movements.map((movement) => {
            const date = new Date(movement.createdAt).toLocaleString();
            const product = movement.productId;
            const user = movement.performedBy;

            const change = movement.type === "IN"
              ? `+${movement.quantity}`
              : movement.type === "OUT"
                ? `-${movement.quantity}`
                : `${movement.quantityAfter - movement.quantityBefore}`;

            return `
              <tr>
                <td>${escapeHTML(date)}</td>
                <td>
                  ${escapeHTML(product?.name || "Deleted product")}<br>
                  <small>${escapeHTML(product?.sku || "")}</small>
                </td>
                <td>${escapeHTML(movement.type)}</td>
                <td>${escapeHTML(change)}</td>
                <td>${movement.quantityBefore} → ${movement.quantityAfter}</td>
                <td>${escapeHTML(movement.reason)}</td>
                <td>${escapeHTML(user?.name || "Unknown user")}</td>
              </tr>`;
          }).join("")
        : '<tr><td colspan="7">No movements recorded yet.</td></tr>';

      const pages = Math.max(1, pagination.pages);

      $("movement-page").textContent =
        `Page ${pagination.page} of ${pages} · ${pagination.total} records`;

      $("movement-prev").disabled = page <= 1;
      $("movement-next").disabled = page >= pages;

      showPageMessage("");
    } catch (error) {
      body.innerHTML =
        '<tr><td colspan="7">Unable to load movement history.</td></tr>';

      showPageMessage(error.message, true);
    }
  }

  function openMovementDialog() {
    form.reset();
    showFormMessage("");
    saveButton.disabled = false;
    saveButton.textContent = "Save movement";

    updateQuantityLabel();
    updateProductInfo();

    dialog.showModal();
  }

  $("open-movement-dialog").addEventListener("click", openMovementDialog);

  $("close-movement-dialog").addEventListener("click", () => {
    dialog.close();
  });

  $("cancel-movement-dialog").addEventListener("click", () => {
    dialog.close();
  });

  productSelect.addEventListener("change", updateProductInfo);
  typeSelect.addEventListener("change", updateQuantityLabel);

  // Intentionally no backdrop-click handler:
  // clicking outside the dialog will not close it.

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    showFormMessage("");

    const productId = productSelect.value;
    const type = typeSelect.value;
    const quantity = Number(quantityInput.value);
    const reason = $("movement-reason").value.trim();

    if (!productId) {
      showFormMessage("Please select a product.", true);
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < (type === "ADJUSTMENT" ? 0 : 1)
    ) {
      showFormMessage(
        type === "ADJUSTMENT"
          ? "Enter a whole-number stock count of zero or more."
          : "Enter a whole-number quantity greater than zero.",
        true
      );
      return;
    }

    if (!reason) {
      showFormMessage("Please enter a reason for this movement.", true);
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      const result = await apiRequest("/api/stock", {
        method: "POST",
        body: JSON.stringify({
          productId,
          type,
          quantity,
          reason,
          reference: $("movement-reference").value.trim()
        })
      });

      const movement = result.movement;

dialog.close();
form.reset();
updateQuantityLabel();

page = 1;

await loadMovements();
await loadProducts();

window.StockPilotNotifications.show(
  `${result.message} Stock changed from ${movement.quantityBefore} to ${movement.quantityAfter}.`,
  "success"
);
    } catch (error) {
  window.StockPilotNotifications.show(error.message, "error");
} finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save movement";
    }
  });

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

  async function initialize() {
    try {
      await loadProducts();
    } catch (error) {
      showPageMessage(
        `Could not load products for the movement form: ${error.message}`,
        true
      );
    }

    await loadMovements();
  }

  updateQuantityLabel();
  initialize();
});

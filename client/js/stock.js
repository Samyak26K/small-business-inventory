
document.addEventListener("DOMContentLoaded", async () => {
  if (!sessionStorage.getItem("stockpilot_token")) {
    window.location.replace("/login.html");
    return;
  }

  const $ = (id) => document.getElementById(id);
  const form = $("stock-form");
  const productSelect = $("stock-product");
  const typeSelect = $("stock-type");
  const quantityInput = $("stock-quantity");
  const message = $("stock-message");
  const submit = $("stock-submit");

  let products = [];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);

  function selectedProduct() {
    return products.find((p) => p._id === productSelect.value);
  }

  function updateProductInfo() {
    const product = selectedProduct();

    $("current-stock").textContent = product
      ? `${product.name} (${product.sku}) — Current stock: ${product.quantityOnHand}`
      : "Select a product to view current stock.";
  }

  function updateQuantityLabel() {
    const adjustment = typeSelect.value === "ADJUSTMENT";

    $("stock-quantity-label").textContent = adjustment
      ? "New counted quantity *"
      : "Movement quantity *";

    quantityInput.min = adjustment ? "0" : "1";
    quantityInput.value = "";
  }

  function showMessage(text, isError = false) {
  if (!text) {
    message.textContent = "";
    return;
  }

  window.StockPilotNotifications.show(
    text,
    isError ? "error" : "success"
  );
}

  try {
    const result = await apiRequest(
      "/api/products?status=active&limit=100"
    );

    products = result.products;

    productSelect.innerHTML =
      '<option value="">Select a product</option>' +
      products.map((p) =>
        `<option value="${escapeHTML(p._id)}">${escapeHTML(p.name)} — ${escapeHTML(p.sku)}</option>`
      ).join("");

    updateProductInfo();
  } catch (error) {
    showMessage(error.message, true);
  }

  productSelect.addEventListener("change", updateProductInfo);
  typeSelect.addEventListener("change", updateQuantityLabel);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");
    submit.disabled = true;

    try {
      const result = await apiRequest("/api/stock", {
        method: "POST",
        body: JSON.stringify({
          productId: productSelect.value,
          type: typeSelect.value,
          quantity: Number(quantityInput.value),
          reason: $("stock-reason").value.trim(),
          reference: $("stock-reference").value.trim()
        })
      });

      const movement = result.movement;

      showMessage(
        `${result.message} Stock changed from ${movement.quantityBefore} to ${movement.quantityAfter}.`
      );

      // Reload quantities so the displayed balance stays current.
      const refreshed = await apiRequest(
        "/api/products?status=active&limit=100"
      );
      products = refreshed.products;
      updateProductInfo();

      form.reset();
      updateQuantityLabel();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  updateQuantityLabel();
});

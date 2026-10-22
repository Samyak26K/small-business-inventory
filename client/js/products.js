
document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("stockpilot_token");

  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  const $ = (id) => document.getElementById(id);

  const tableBody = $("products-table-body");
  const dialog = $("product-dialog");
  const form = $("product-form");
  const formMessage = $("product-form-message");
  const pageMessage = $("products-message");
  const saveButton = $("save-product");

  let categories = [];
  let page = 1;
  const pageSize = 10;
  let debounceTimer;

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value);

  function stockStatus(product) {
    if (!product.active) {
      return { label: "Archived", className: "stock-archived" };
    }

    if (product.quantityOnHand === 0) {
      return { label: "Out of stock", className: "stock-out" };
    }

    if (product.quantityOnHand <= product.reorderLevel) {
      return { label: "Low stock", className: "stock-low" };
    }

    return { label: "In stock", className: "stock-ok" };
  }

  function setMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? "#ff8b8b" : "";
  }


async function loadCategories() {
  const result = await apiRequest("/api/products/categories");

  categories = Array.isArray(result.categories)
    ? result.categories
    : [];

  const categoryOptions = categories.map((category) => {
    const id = escapeHTML(category._id);
    const name = escapeHTML(category.name);

    return `<option value="${id}">${name}</option>`;
  }).join("");

  $("category-filter").innerHTML =
    '<option value="">All categories</option>' + categoryOptions;

  $("product-category").innerHTML =
    '<option value="">Select a category</option>' + categoryOptions;

  if (categories.length === 0) {
    setMessage(
      pageMessage,
      "No categories found. Seed the default categories first.",
      true
    );
  }
}

  async function loadProducts() {
    tableBody.innerHTML =
      '<tr><td colspan="7">Loading products...</td></tr>';

    try {
      const params = new URLSearchParams({
        search: $("product-search").value.trim(),
        categoryId: $("category-filter").value,
        status: $("status-filter").value,
        page: String(page),
        limit: String(pageSize)
      });

      const result = await apiRequest(`/api/products?${params}`);

      const products = result.products;
      const total = result.pagination.total;

      $("products-count").textContent = total;

      const lowStock = products.filter(
        (product) => product.active &&
          product.quantityOnHand <= product.reorderLevel
      ).length;

      const inventoryValue = products.reduce(
        (sum, product) =>
          sum + product.quantityOnHand * product.unitPrice,
        0
      );

      $("products-low-stock").textContent = lowStock;
      $("products-value").textContent = money(inventoryValue);
      $("catalog-status").textContent = "Live";

      const totalPages = Math.max(result.pagination.pages, 1);

      $("products-pagination").textContent =
        `Page ${page} of ${totalPages} · ${total} products`;

      $("previous-page").disabled = page <= 1;
      $("next-page").disabled = page >= totalPages;

      if (products.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="7">No products found. Try changing your filters or add a product.</td></tr>';
        return;
      }

      tableBody.innerHTML = products.map((product) => {
        const status = stockStatus(product);
        const categoryName = product.categoryId?.name || "Unknown";

        return `
          <tr>
            <td>
              <div class="product-name-cell">
                <span class="product-avatar">${escapeHTML(product.name.charAt(0).toUpperCase())}</span>
                <span>
                  <strong>${escapeHTML(product.name)}</strong>
                  <small>${escapeHTML(product.description || "No description")}</small>
                </span>
              </div>
            </td>
            <td><span class="sku-text">${escapeHTML(product.sku)}</span></td>
            <td>${escapeHTML(categoryName)}</td>
            <td>${money(product.unitPrice)}</td>
            <td>${product.quantityOnHand}</td>
            <td><span class="stock-badge ${status.className}">${status.label}</span></td>
            <td>
              <div class="row-actions">
                <button class="small-action" data-action="edit" data-id="${escapeHTML(product._id)}">Edit</button>
                <button class="small-action" data-action="archive" data-id="${escapeHTML(product._id)}" ${!product.active ? "disabled" : ""}>Archive</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } catch (error) {
      tableBody.innerHTML =
        '<tr><td colspan="7">Unable to load products.</td></tr>';

      setMessage(pageMessage, error.message, true);
    }
  }

  function openNewProduct() {
    form.reset();
    $("product-id").value = "";
    $("product-dialog-title").textContent = "Add product";
    $("product-quantity").disabled = false;
    $("product-form-message").hidden = true;
    $("product-reorder").value = "5";
    saveButton.textContent = "Save product";
    dialog.showModal();
  }

  async function openEditProduct(id) {
    try {
      const result = await apiRequest(`/api/products/${encodeURIComponent(id)}`);
      const product = result.product;

      form.reset();
      $("product-id").value = product._id;
      $("product-name").value = product.name;
      $("product-sku").value = product.sku;
      $("product-category").value = product.categoryId?._id || "";
      $("product-price").value = product.unitPrice;
      $("product-quantity").value = product.quantityOnHand;
      $("product-reorder").value = product.reorderLevel;
      $("product-description").value = product.description || "";

      $("product-quantity").disabled = true;
      $("product-dialog-title").textContent = "Edit product";
      $("product-form-message").hidden = true;
      saveButton.textContent = "Save changes";

      dialog.showModal();
    } catch (error) {
      setMessage(pageMessage, error.message, true);
    }
  }

  async function archiveProduct(id) {
    if (!window.confirm(
      "Archive this product? It will no longer appear in the active catalog."
    )) {
      return;
    }

    try {
      const result = await apiRequest(
        `/api/products/${encodeURIComponent(id)}/archive`,
        { method: "PATCH" }
      );

      setMessage(pageMessage, result.message);
      await loadProducts();
    } catch (error) {
      setMessage(pageMessage, error.message, true);
    }
  }

  $("add-product-button").addEventListener("click", openNewProduct);

  $("close-product-dialog").addEventListener("click", () => dialog.close());
  $("cancel-product").addEventListener("click", () => dialog.close());

  
  
  tableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "edit") await openEditProduct(id);
    if (action === "archive") await archiveProduct(id);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    formMessage.hidden = true;
    saveButton.disabled = true;

    const id = $("product-id").value;

    const payload = {
      name: $("product-name").value.trim(),
      sku: $("product-sku").value.trim().toUpperCase(),
      categoryId: $("product-category").value,
      description: $("product-description").value.trim(),
      unitPrice: Number($("product-price").value),
      reorderLevel: Number($("product-reorder").value)
    };

    if (!id) {
      payload.quantityOnHand = Number($("product-quantity").value);
    }

    try {
      const result = await apiRequest(
        id ? `/api/products/${encodeURIComponent(id)}` : "/api/products",
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );

      dialog.close();
      setMessage(pageMessage, result.message);
      page = 1;
      await loadProducts();
    } catch (error) {
      formMessage.textContent = error.message;
      formMessage.hidden = false;
    } finally {
      saveButton.disabled = false;
    }
  });

  function applyFilters() {
    page = 1;
    loadProducts();
  }

  $("category-filter").addEventListener("change", applyFilters);
  $("status-filter").addEventListener("change", applyFilters);

  $("product-search").addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 300);
  });

  $("previous-page").addEventListener("click", () => {
    if (page > 1) {
      page--;
      loadProducts();
    }
  });

  $("next-page").addEventListener("click", () => {
    page++;
    loadProducts();
  });

  async function initialize() {
    try {
      await loadCategories();
      await loadProducts();
    } catch (error) {
      setMessage(pageMessage, error.message, true);
    }
  }

  initialize();
});

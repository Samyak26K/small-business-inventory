
document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("stockpilot_token");

  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  const filter = document.getElementById("report-filter");
  const tableBody = document.getElementById("report-table-body");
  const message = document.getElementById("report-message");
  const connectionStatus = document.getElementById("connection-status");

  let currentReport = [];
  let reportRequestId = 0;

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function number(value) {
    return Number(value || 0).toLocaleString("en-IN");
  }

  function currency(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function renderTable(products) {
    if (!products.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">No products match this filter.</td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = products.map((product) => `
      <tr>
        <td>${escapeHTML(product.name)}</td>
        <td>${escapeHTML(product.sku)}</td>
        <td>${escapeHTML(product.category)}</td>
        <td>${number(product.quantityOnHand)}</td>
        <td>${number(product.reorderLevel)}</td>
        <td>${currency(product.unitPrice)}</td>
        <td>${currency(product.inventoryValue)}</td>
        <td>${escapeHTML(product.stockStatus)}</td>
      </tr>
    `).join("");
  }

  async function loadReport() {
    const requestId = ++reportRequestId;
    const selectedStatus = filter.value;

    message.textContent = "Loading report...";
    tableBody.innerHTML = `
      <tr><td colspan="8">Loading inventory report...</td></tr>`;

    try {
      const result = await apiRequest(
        `/api/reports/inventory?status=${encodeURIComponent(selectedStatus)}`
      );

      if (requestId !== reportRequestId) return;

      if (!result || result.success !== true) {
        throw new Error(result?.message || "Unable to load report.");
      }

      currentReport = result.report || [];
      renderTable(currentReport);

      setText("report-total", number(result.total));

      // These counts describe the entire active inventory,
      // regardless of the selected table filter.
      if (selectedStatus === "all") {
        setText(
          "report-low-stock",
          number(currentReport.filter(
            (p) => p.stockStatus === "Low Stock"
          ).length)
        );

        setText(
          "report-out-of-stock",
          number(currentReport.filter(
            (p) => p.stockStatus === "Out of Stock"
          ).length)
        );
      }

      if (connectionStatus) {
        connectionStatus.textContent = "Report loaded";
      }

      message.textContent = `${currentReport.length} product(s) displayed.`;
    } catch (error) {
      if (requestId !== reportRequestId) return;

      console.error("Report loading failed:", error);
      currentReport = [];

      tableBody.innerHTML = `
        <tr><td colspan="8">Unable to load report. Check the server and try again.</td></tr>`;

      message.textContent = error.message || "Report loading failed.";

      if (connectionStatus) {
        connectionStatus.textContent = "Report unavailable";
      }
    }
  }

  function exportCSV() {
    if (!currentReport.length) {
      message.textContent = "There are no products to export.";
      return;
    }

    const columns = [
      ["Product", "name"],
      ["SKU", "sku"],
      ["Category", "category"],
      ["Available Quantity", "quantityOnHand"],
      ["Reorder Level", "reorderLevel"],
      ["Unit Price", "unitPrice"],
      ["Inventory Value", "inventoryValue"],
      ["Stock Status", "stockStatus"]
    ];

    function csvCell(value) {
      // Prevent spreadsheet formula injection.
      let text = String(value ?? "");

      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    }

    const rows = [
      columns.map(([heading]) => csvCell(heading)).join(","),
      ...currentReport.map((product) =>
        columns.map(([, key]) => csvCell(product[key])).join(",")
      )
    ];

    const blob = new Blob(
      ["\uFEFF" + rows.join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "stockpilot-inventory-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    message.textContent = "CSV export generated.";
  }

  filter.addEventListener("change", loadReport);

  document.getElementById("refresh-report")
    .addEventListener("click", loadReport);

  document.getElementById("export-csv")
    .addEventListener("click", exportCSV);

  loadReport();
});


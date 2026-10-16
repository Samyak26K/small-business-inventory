document.addEventListener("DOMContentLoaded", async () => {
  const token = sessionStorage.getItem("stockpilot_token");

  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  const status = document.getElementById("connection-status");
  const indicator = document.querySelector(".status-dot");

  try {
    const result = await apiRequest("/api/health");

    status.textContent = result.databaseReady
      ? "Database connected"
      : "Database disconnected";

    indicator.style.background = result.databaseReady
      ? "#55d6a0"
      : "#f4bd62";
  } catch (error) {
    status.textContent = "Server unavailable";
    indicator.style.background = "#f4bd62";
    console.error("Health check failed:", error.message);
  }
});
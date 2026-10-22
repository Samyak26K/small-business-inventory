
document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.getElementById("sidebar-logout");

  if (!logoutButton) return;

  logoutButton.addEventListener("click", () => {
    const confirmed = window.confirm("Are you sure you want to log out?");

    if (!confirmed) return;

    // Remove the authentication token from this browser session.
    sessionStorage.removeItem("stockpilot_token");

    // Return to the login page.
    window.location.replace("/login.html");
  });
});

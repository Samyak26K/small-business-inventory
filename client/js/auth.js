
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMessage = document.getElementById("login-error");
  const loginButton = document.getElementById("login-button");

  if (!form) return;

  // A previous session can go straight to the dashboard.
  if (sessionStorage.getItem("stockpilot_token")) {
    window.location.replace("/dashboard.html");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorMessage.hidden = true;
    errorMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });

      if (!result.token || !result.user) {
        throw new Error("The server returned an invalid login response.");
      }

      sessionStorage.setItem("stockpilot_token", result.token);
      sessionStorage.setItem(
        "stockpilot_user",
        JSON.stringify(result.user)
      );

      window.location.replace("/dashboard.html");
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
    }
  });
});

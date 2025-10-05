const API_URL = "/api";

const token = localStorage.getItem("token");

if (token) {
    window.location.href = "/";
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("button");
  const originalText = button.textContent;

  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem("token", data.token);

    button.innerHTML = '<i class="fas fa-check"></i> Success!';
    button.style.backgroundColor = "#10b981";

    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  } else {
    alert("Login failed. Please check your credentials.");
    button.disabled = false;
    button.textContent = originalText;
  }
});

document
  .getElementById("register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    const originalText = button.textContent;

    button.disabled = true;
    button.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      button.innerHTML = '<i class="fas fa-check"></i> Account created!';
      button.style.backgroundColor = "#10b981";
      const data = await response.json();
      const token = data.token;
      localStorage.setItem("token", token);
      setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
        button.style.backgroundColor = "";
        e.target.reset();
        window.location.href = "/";
      }, 1500);
    } else {
      const errorData = await response.json();
      alert(`Registration failed: ${errorData.error}`);
      button.disabled = false;
      button.textContent = originalText;
    }
  });

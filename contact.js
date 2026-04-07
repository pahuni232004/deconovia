const API_BASE = "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function showMessage(messageEl, text, isError = false) {
  if (!messageEl) return;
  messageEl.hidden = false;
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#ffd6d6" : "#bff6cb";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-inquiry-form");
  const messageEl = document.getElementById("contact-form-msg");
  if (!form || !messageEl) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !phone || !subject || !message) {
      showMessage(messageEl, "Please complete all fields before submitting.", true);
      return;
    }
    try {
      await apiFetch("/api/contact/inquiries", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      showMessage(messageEl, "Thank you. Your inquiry has been submitted successfully.");
      form.reset();
    } catch (err) {
      showMessage(messageEl, err?.message || "Failed to submit inquiry.", true);
    }
  });
});

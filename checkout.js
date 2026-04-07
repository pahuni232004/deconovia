function renderCheckoutSummary() {
  const list = document.getElementById("checkout-summary-list");
  const totalEl = document.getElementById("checkout-total");
  if (!list || !totalEl || typeof window.getCartLines !== "function") return;

  const lines = window.getCartLines();
  list.innerHTML = "";

  if (!lines.length) {
    list.innerHTML = "<li><span>No items</span></li>";
    totalEl.textContent = window.formatRs(0);
    return;
  }

  lines.forEach((line) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = `${line.name} × ${line.qty}`;
    const right = document.createElement("span");
    right.textContent = window.formatRs(line.priceAmount * line.qty);
    li.append(left, right);
    list.appendChild(li);
  });

  totalEl.textContent = window.formatRs(window.getCartSubtotal());
}

function initCheckoutPage() {
  const form = document.getElementById("checkout-form");
  const main = document.getElementById("checkout-main");
  const success = document.getElementById("checkout-success");
  const refEl = document.getElementById("checkout-order-ref");

  if (!main || !success) return;

  renderCheckoutSummary();
  window.addEventListener("decor-cart-updated", renderCheckoutSummary);

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const cartLines = window.getCartLines();
    if (!cartLines.length) return;

    const fd = new FormData(form);
    const orderPayload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      address: String(fd.get("address") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      pin: String(fd.get("pin") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to place order");

      await window.clearCart();

      main.hidden = true;
      success.hidden = false;
      if (refEl) refEl.textContent = `Reference: ${data?.orderRef || "-"}`;
      form.reset();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.message || "Failed to place order");
    }
  });
}

document.addEventListener("DOMContentLoaded", initCheckoutPage);

const state = { token: "", products: [] };
const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {}),
    },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
};
const render = (items, target, formatter) => {
  document.getElementById(target).innerHTML = items.length
    ? items.map(formatter).join("")
    : "<p>No records found.</p>";
};
async function loadDashboard() {
  state.products = await request("/api/products");
  render(
    state.products,
    "products",
    (product) =>
      `<div class="admin-row"><span><b>${product.productCode}</b> ${product.name}</span><button data-code="${product.productCode}">Delete</button></div>`,
  );
  const orders = await request("/api/admin/orders");
  render(
    orders,
    "orders",
    (order) =>
      `<div class="admin-row"><span><b>${order.status}</b> ${order.items.length} item(s)</span><small>${new Date(order.createdAt).toLocaleString()}</small></div>`,
  );
  document.querySelectorAll("[data-code]").forEach(
    (button) =>
      (button.onclick = async () => {
        await request(`/api/admin/products/${button.dataset.code}`, {
          method: "DELETE",
        });
        loadDashboard();
      }),
  );
}
document.getElementById("login-form").onsubmit = async (event) => {
  event.preventDefault();
  try {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    state.token = result.token;
    login.hidden = true;
    dashboard.hidden = false;
    await loadDashboard();
  } catch (error) {
    document.getElementById("login-message").textContent = error.message;
  }
};
document.getElementById("product-form").onsubmit = async (event) => {
  event.preventDefault();
  try {
    await request("/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        productCode: document.getElementById("product-code").value,
        name: document.getElementById("product-name").value,
        brand: document.getElementById("product-brand").value,
        category: document.getElementById("product-category").value,
        price: Number(document.getElementById("product-price").value),
        description: "Administrator-created product",
        specifications: {},
      }),
    });
    event.target.reset();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
};
document.getElementById("logout").onclick = () => location.reload();

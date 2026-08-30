const { useEffect, useState } = React;

const money = (value) => `$${Number(value).toFixed(2)}`;
const brandIcons = {
  AMD: "amd",
  Intel: "intel",
  NVIDIA: "nvidia",
  Corsair: "corsair",
  Kingston: "kingston",
  Samsung: "samsung",
  "Western Digital": "westerndigital",
};
const productImages = {
  CPU: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=80",
  GPU: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80",
  RAM: "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=80",
  Storage:
    "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=80",
  PSU: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=900&q=80",
};

function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState(
    "Ask me about hardware, budgets, or components.",
  );
  const [chatProducts, setChatProducts] = useState([]);
  const [token, setToken] = useState(
    localStorage.getItem("forgecart-token") || "",
  );
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const loadProducts = async (chosenCategory = category) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (chosenCategory !== "All") params.set("category", chosenCategory);
      if (search.trim()) params.set("search", search.trim());
      if (sort) params.set("sort", sort);
      const query = params.toString() ? `?${params}` : "";
      const response = await fetch(`/api/products${query}`);
      if (!response.ok) throw new Error("Could not load products.");
      setProducts(await response.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openProduct = async (product) => {
    setSelected(product);
    setRecommendations([]);
    const response = await fetch(`/api/recommendations/${product.productCode}`);
    if (response.ok) setRecommendations(await response.json());
  };

  const addToCart = (product) =>
    setCart((items) => {
      const existing = items.find(
        (item) => item.productCode === product.productCode,
      );
      const nextItems = existing
        ? items.map((item) =>
            item.productCode === product.productCode
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...items, { ...product, quantity: 1 }];
      if (token)
        fetch("/api/cart", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: nextItems }),
        });
      return nextItems;
    });
  const removeFromCart = (code) =>
    setCart((items) => {
      const nextItems = items.filter((item) => item.productCode !== code);
      if (token)
        fetch("/api/cart", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: nextItems }),
        });
      return nextItems;
    });
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const categories = [
    "All",
    ...new Set(products.map((product) => product.category)),
  ];
  const askAssistant = async (event) => {
    event.preventDefault();
    if (!chatMessage.trim()) return;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatMessage }),
    });
    const result = await response.json();
    setChatReply(result.reply || result.error);
    setChatProducts(result.products || []);
    setChatMessage("");
  };
  const authenticate = async (event) => {
    event.preventDefault();
    setAuthMessage("");
    const endpoint =
      authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authEmail,
        password: authPassword,
        name: authName,
      }),
    });
    const result = await response.json();
    if (!response.ok) return setAuthMessage(result.error);
    localStorage.setItem("forgecart-token", result.token);
    setToken(result.token);
    setAuthMessage(`Signed in as ${result.user.name || result.user.email}`);
    setAuthPassword("");
  };
  const createOrder = async () => {
    if (!token) return setAuthMessage("Login before creating an order.");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: cart }),
    });
    const result = await response.json();
    setAuthMessage(
      response.ok
        ? `Order created: ${String(result.id || "confirmed")}`
        : result.error,
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>ForgeCart</span>
        </div>
        <div className="status">● API connected</div>
        <a className="admin-link" href="/admin.html">
          Admin
        </a>
        <div className="cart-count">
          Cart <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">COMPUTER HARDWARE / CURATED</p>
            <h1>
              Build a better
              <br />
              <em>machine.</em>
            </h1>
            <p className="lede">
              Find the right components faster, with recommendations shaped by
              product features and specifications.
            </p>
          </div>
          <div className="intro-stat">
            <strong>{products.length || "—"}</strong>
            <span>
              components
              <br />
              in catalogue
            </span>
          </div>
        </section>
        <section className="workspace">
          <div className="catalogue">
            <div className="section-head">
              <div>
                <p className="eyebrow">CATALOGUE</p>
                <h2>Latest hardware</h2>
              </div>
              <div className="filters">
                {categories.map((item) => (
                  <button
                    className={category === item ? "active" : ""}
                    onClick={() => {
                      setCategory(item);
                      loadProducts(item);
                    }}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="catalogue-tools">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && loadProducts()}
                placeholder="Search hardware"
                aria-label="Search hardware"
              />
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setTimeout(loadProducts, 0);
                }}
                aria-label="Sort products"
              >
                <option value="">Sort products</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </div>
            {error && <p className="error">{error}</p>}
            {loading ? (
              <p className="loading">Loading catalogue...</p>
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <article
                    className="product"
                    key={product.productCode}
                    onClick={() => openProduct(product)}
                  >
                    <div
                      className={`product-art ${product.category.toLowerCase()}`}
                    >
                      <img
                        src={productImages[product.category]}
                        alt={`${product.name} component`}
                      />
                      <span>{product.category}</span>
                      <img
                        className="brand-icon"
                        src={`https://cdn.simpleicons.org/${brandIcons[product.brand]}`}
                        alt={`${product.brand} logo`}
                      />
                    </div>
                    <div className="product-info">
                      <div>
                        <span className="code">{product.productCode}</span>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                      </div>
                      <div className="product-footer">
                        <b>{money(product.price)}</b>
                        <button
                          aria-label={`Add ${product.name} to cart`}
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product);
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <aside className="side-panel">
            {selected ? (
              <>
                <button className="back" onClick={() => setSelected(null)}>
                  ← Back to catalogue
                </button>
                <p className="eyebrow">
                  {selected.productCode} / {selected.category}
                </p>
                <h2>{selected.name}</h2>
                <p className="detail-copy">{selected.description}</p>
                <div className="specs">
                  {Object.entries(selected.specifications).map(
                    ([key, value]) => (
                      <div key={key}>
                        <span>{key}</span>
                        <b>{value}</b>
                      </div>
                    ),
                  )}
                </div>
                <div className="detail-buy">
                  <strong>{money(selected.price)}</strong>
                  <button onClick={() => addToCart(selected)}>
                    Add to cart
                  </button>
                </div>
                <div className="recommendations">
                  <p className="eyebrow">AI MATCHES</p>
                  <h3>Similar products</h3>
                  {recommendations.map((product) => (
                    <button
                      className="recommendation"
                      onClick={() => openProduct(product)}
                      key={product.productCode}
                    >
                      <span>{product.productCode}</span>
                      <b>{product.name}</b>
                      <strong>{money(product.price)}</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">ACCOUNT</p>
                {token ? (
                  <p className="auth-message">
                    Authenticated session active.{" "}
                    <button
                      onClick={() => {
                        localStorage.removeItem("forgecart-token");
                        setToken("");
                      }}
                    >
                      Sign out
                    </button>
                  </p>
                ) : (
                  <>
                    <div className="auth-tabs">
                      <button
                        className={authMode === "login" ? "active" : ""}
                        onClick={() => setAuthMode("login")}
                      >
                        Login
                      </button>
                      <button
                        className={authMode === "register" ? "active" : ""}
                        onClick={() => setAuthMode("register")}
                      >
                        Register
                      </button>
                    </div>
                    <form className="auth-form" onSubmit={authenticate}>
                      {authMode === "register" && (
                        <input
                          value={authName}
                          onChange={(event) => setAuthName(event.target.value)}
                          placeholder="Name"
                        />
                      )}
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="Email"
                        required
                      />
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(event) =>
                          setAuthPassword(event.target.value)
                        }
                        placeholder="Password"
                        required
                      />
                      <button type="submit">
                        {authMode === "login" ? "Login" : "Create account"}
                      </button>
                    </form>
                  </>
                )}
                <p className="auth-message">{authMessage}</p>
                <p className="eyebrow account-cart">YOUR BUILD</p>
                <h2>Shopping cart</h2>
                {cart.length === 0 ? (
                  <p className="empty">
                    Your cart is ready for a first component.
                  </p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div className="cart-item" key={item.productCode}>
                        <div>
                          <b>{item.name}</b>
                          <span>
                            {item.quantity} × {money(item.price)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productCode)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="cart-total">
                      <span>Total</span>
                      <strong>{money(total)}</strong>
                    </div>
                    <button className="checkout" onClick={createOrder}>
                      Create order
                    </button>
                  </>
                )}
              </>
            )}
          </aside>
        </section>
      </main>
      <button className="chat-launcher" onClick={() => setChatOpen(!chatOpen)}>
        {chatOpen ? "×" : "✦"}{" "}
        <span>{chatOpen ? "Close assistant" : "Hardware assistant"}</span>
      </button>
      {chatOpen && (
        <section className="chat-panel">
          <p className="eyebrow">FORGECART AI</p>
          <h2>Hardware assistant</h2>
          <p className="chat-reply">{chatReply}</p>
          {chatProducts.map((product) => (
            <button
              className="chat-product"
              onClick={() => openProduct(product)}
              key={product.productCode}
            >
              <b>{product.name}</b>
              <span>
                {product.category} · {money(product.price)}
              </span>
            </button>
          ))}
          <form onSubmit={askAssistant}>
            <input
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              placeholder="e.g. GPU under $500"
              aria-label="Ask the hardware assistant"
            />
            <button type="submit">Ask</button>
          </form>
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

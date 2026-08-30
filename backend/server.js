require("dotenv").config();
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");

const app = express();
const port = Number(process.env.PORT || 5000);
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = "admin@gmail.com";
if (!process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = "admin123";
const jwtSecret = process.env.JWT_SECRET || "development-secret-change-me";
const productsPath = path.join(__dirname, "data", "products.json");
const recommendationsPath = path.join(__dirname, "recommendations.json");
const frontendPath = path.join(__dirname, "..", "frontend");
let mongoCollection = null;
let mongoDb = null;
const users = new Map();
const formatMoney = (value) => `$${Number(value).toFixed(2)}`;

app.use(express.json());
app.use(express.static(frontendPath));
app.use((request, response, next) => {
  response.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_ORIGIN || "*",
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return response.sendStatus(204);
  next();
});

function localProducts() {
  return JSON.parse(fs.readFileSync(productsPath, "utf8"));
}

async function getProducts(filter = {}) {
  if (mongoCollection) return mongoCollection.find(filter).toArray();
  return localProducts().filter((product) =>
    Object.entries(filter).every(([key, value]) => product[key] === value),
  );
}

async function findUser(email) {
  if (mongoDb) return mongoDb.collection("users").findOne({ email });
  return users.get(email);
}

function issueToken(user) {
  return jwt.sign(
    {
      sub: String(user._id || user.id),
      email: user.email,
      role: user.role || "customer",
    },
    jwtSecret,
    { algorithm: "HS256", expiresIn: "2h" },
  );
}

function requireAuth(request, response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    request.user = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
    next();
  } catch (error) {
    response.status(401).json({ error: "Authentication required." });
  }
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin")
    return response
      .status(403)
      .json({ error: "Administrator access required." });
  next();
}

function publicUser(user) {
  return {
    id: String(user._id || user.id),
    email: user.email,
    name: user.name,
    role: user.role || "customer",
  };
}

app.get("/api/health", (request, response) =>
  response.json({
    status: "ok",
    database: mongoCollection ? "mongodb" : "local-demo",
  }),
);

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const { email, password, name = "" } = request.body || {};
    if (!email || !password || password.length < 6)
      return response.status(400).json({
        error: "Email and a password of at least 6 characters are required.",
      });
    const normalizedEmail = email.trim().toLowerCase();
    if (await findUser(normalizedEmail))
      return response
        .status(409)
        .json({ error: "An account with this email already exists." });
    const user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: await bcrypt.hash(password, 12),
      role: "customer",
    };
    if (mongoDb) {
      const result = await mongoDb
        .collection("users")
        .insertOne({ ...user, createdAt: new Date() });
      user.id = result.insertedId;
    } else users.set(normalizedEmail, user);
    const token = issueToken(user);
    response.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const { email, password } = request.body || {};
    const user = await findUser(
      String(email || "")
        .trim()
        .toLowerCase(),
    );
    if (
      !user ||
      !(await bcrypt.compare(password || "", user.passwordHash || ""))
    )
      return response.status(401).json({ error: "Invalid email or password." });
    const token = issueToken(user);
    response.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", async (request, response, next) => {
  try {
    const filter = request.query.category
      ? { category: request.query.category }
      : {};
    let result = await getProducts(filter);
    const search = String(request.query.search || "")
      .trim()
      .toLowerCase();
    if (search)
      result = result.filter((product) =>
        `${product.name} ${product.brand} ${product.category} ${product.description}`
          .toLowerCase()
          .includes(search),
      );
    if (request.query.sort === "price-asc")
      result.sort((a, b) => a.price - b.price);
    if (request.query.sort === "price-desc")
      result.sort((a, b) => b.price - a.price);
    if (request.query.sort === "name")
      result.sort((a, b) => a.name.localeCompare(b.name));
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/cart", requireAuth, async (request, response, next) => {
  try {
    const cart = mongoDb
      ? await mongoDb.collection("carts").findOne({ userId: request.user.sub })
      : { items: [] };
    response.json(cart || { items: [] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/cart", requireAuth, async (request, response, next) => {
  try {
    const items = Array.isArray(request.body?.items) ? request.body.items : [];
    if (mongoDb)
      await mongoDb
        .collection("carts")
        .updateOne(
          { userId: request.user.sub },
          { $set: { userId: request.user.sub, items, updatedAt: new Date() } },
          { upsert: true },
        );
    response.json({ userId: request.user.sub, items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", requireAuth, async (request, response, next) => {
  try {
    const items = Array.isArray(request.body?.items) ? request.body.items : [];
    if (!items.length)
      return response
        .status(400)
        .json({ error: "Order must contain at least one item." });
    const order = {
      userId: request.user.sub,
      items,
      status: "created",
      createdAt: new Date(),
    };
    if (mongoDb) {
      const result = await mongoDb.collection("orders").insertOne(order);
      order.id = result.insertedId;
    }
    response.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/admin/products",
  requireAuth,
  requireAdmin,
  async (request, response, next) => {
    try {
      if (!mongoCollection)
        return response
          .status(503)
          .json({ error: "MongoDB is required for administration." });
      const product = request.body;
      await mongoCollection.insertOne(product);
      response.status(201).json(product);
    } catch (error) {
      next(error);
    }
  },
);
app.patch(
  "/api/admin/products/:productCode",
  requireAuth,
  requireAdmin,
  async (request, response, next) => {
    try {
      if (!mongoCollection)
        return response
          .status(503)
          .json({ error: "MongoDB is required for administration." });
      const result = await mongoCollection.findOneAndUpdate(
        { productCode: request.params.productCode.toUpperCase() },
        { $set: request.body },
        { returnDocument: "after" },
      );
      if (!result)
        return response.status(404).json({ error: "Product not found." });
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);
app.delete(
  "/api/admin/products/:productCode",
  requireAuth,
  requireAdmin,
  async (request, response, next) => {
    try {
      if (!mongoCollection)
        return response
          .status(503)
          .json({ error: "MongoDB is required for administration." });
      const result = await mongoCollection.deleteOne({
        productCode: request.params.productCode.toUpperCase(),
      });
      if (!result.deletedCount)
        return response.status(404).json({ error: "Product not found." });
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },
);
app.get(
  "/api/admin/orders",
  requireAuth,
  requireAdmin,
  async (request, response, next) => {
    try {
      response.json(
        mongoDb
          ? await mongoDb
              .collection("orders")
              .find()
              .sort({ createdAt: -1 })
              .toArray()
          : [],
      );
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/products/:productCode", async (request, response, next) => {
  try {
    const products = await getProducts({
      productCode: request.params.productCode.toUpperCase(),
    });
    if (!products[0])
      return response.status(404).json({ error: "Product not found." });
    response.json(products[0]);
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/recommendations/:productCode",
  async (request, response, next) => {
    try {
      const products = await getProducts();
      const source = products.find(
        (product) =>
          product.productCode === request.params.productCode.toUpperCase(),
      );
      if (!source)
        return response.status(404).json({ error: "Product not found." });
      const generated = fs.existsSync(recommendationsPath)
        ? JSON.parse(fs.readFileSync(recommendationsPath, "utf8"))
        : {};
      const codes =
        generated[source.productCode] ||
        products
          .filter(
            (product) =>
              product.category === source.category &&
              product.productCode !== source.productCode,
          )
          .slice(0, 3)
          .map((product) => product.productCode);
      response.json(
        codes
          .map((code) =>
            products.find((product) => product.productCode === code),
          )
          .filter(Boolean),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.post("/api/chat", async (request, response, next) => {
  try {
    const message = String(request.body?.message || "").trim();
    if (!message)
      return response.status(400).json({ error: "Please enter a message." });
    const products = await getProducts();
    const lowerMessage = message.toLowerCase();
    const category = ["cpu", "gpu", "ram", "storage", "psu"].find((item) =>
      lowerMessage.includes(item),
    );
    const budgetMatch = lowerMessage.match(
      /(?:under|below|less than)\s*\$?([\d,]+)/,
    );
    const budget = budgetMatch ? Number(budgetMatch[1].replace(",", "")) : null;
    const matches = products
      .filter((product) => {
        const searchable =
          `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
        return (
          (!category || product.category.toLowerCase() === category) &&
          (!budget || product.price <= budget) &&
          (category ||
            lowerMessage
              .split(/\s+/)
              .some((word) => word.length > 2 && searchable.includes(word)))
        );
      })
      .slice(0, 4);
    let reply =
      "I can help you find CPUs, GPUs, RAM, storage, and PSUs. Try asking for a GPU under $500 or a CPU recommendation.";
    if (matches.length)
      reply = `I found ${matches.length} option${matches.length === 1 ? "" : "s"} from the catalogue${budget ? ` under ${formatMoney(budget)}` : ""}. These are good places to start.`;
    else if (category || budget)
      reply = `I could not find a matching ${category ? category.toUpperCase() : "component"}${budget ? ` under ${formatMoney(budget)}` : ""}. Try increasing your budget or asking for another category.`;
    response.json({ reply, products: matches });
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error." });
});

async function connectMongo() {
  if (!process.env.MONGODB_URI) return;
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    mongoDb = client.db(process.env.MONGODB_DB || "hardware_store");
    mongoCollection = mongoDb.collection("products");
    await mongoDb
      .collection("users")
      .createIndex({ email: 1 }, { unique: true });
    await mongoDb
      .collection("carts")
      .createIndex({ userId: 1 }, { unique: true });
    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      !(await mongoDb
        .collection("users")
        .findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() }))
    ) {
      await mongoDb.collection("users").insertOne({
        id: crypto.randomUUID(),
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        name: "Administrator",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        role: "admin",
        createdAt: new Date(),
      });
      console.log("Initial administrator account created.");
    }
    console.log("Connected to MongoDB Atlas.");
  } catch (error) {
    mongoDb = null;
    mongoCollection = null;
    console.warn("MongoDB unavailable; using local demo data.", error.message);
  }
}

async function ensureLocalAdmin() {
  if (mongoDb) return;
  const email = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  if (!email || !password) return;
  if (users.has(email)) return;

  users.set(email, {
    id: crypto.randomUUID(),
    email,
    name: "Administrator",
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
  });
  console.log("Initial administrator account created for local demo mode.");
}

async function startServer() {
  await connectMongo();
  await ensureLocalAdmin();
  app.listen(port, () =>
    console.log(`Hardware MVP API running at http://localhost:${port}`),
  );
}

if (require.main === module) {
  startServer();
}

module.exports = { app, getProducts, findUser, users, ensureLocalAdmin };

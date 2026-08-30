require("dotenv").config();
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");

async function seed() {
  if (!process.env.MONGODB_URI)
    throw new Error(
      "Set MONGODB_URI before running npm run seed. Keep the URI private.",
    );
  const products = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "products.json"), "utf8"),
  );
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const collection = client
    .db(process.env.MONGODB_DB || "hardware_store")
    .collection("products");
  await collection.deleteMany({});
  await collection.insertMany(products);
  console.log(
    `SUCCESS: ${products.length} products inserted into hardware_store.products`,
  );
  await client.close();
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

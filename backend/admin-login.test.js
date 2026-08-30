const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

process.env.ADMIN_EMAIL = "admin@gmail.com";
process.env.ADMIN_PASSWORD = "admin123";
process.env.MONGODB_URI = "";

delete require.cache[require.resolve("./server.js")];
const { findUser, ensureLocalAdmin, users } = require("./server.js");

test("local demo mode creates the configured admin user", async () => {
  users.clear();
  await ensureLocalAdmin();

  const user = await findUser("admin@gmail.com");
  assert.ok(user, "Expected an admin user to exist in local demo mode");
  assert.equal(user.role, "admin");
  assert.equal(user.email, "admin@gmail.com");
  assert.ok(await bcrypt.compare("admin123", user.passwordHash));
});

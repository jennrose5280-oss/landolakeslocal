// netlify/functions/vote.js
// Increments the vote count for a business in Netlify Blobs

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let bizKey;
  try {
    const body = JSON.parse(event.body || "{}");
    bizKey = body.key;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!bizKey || typeof bizKey !== "string" || bizKey.length > 120) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid key" }) };
  }

  // Sanitize key — only allow alphanumeric, spaces, hyphens, ampersands
  const safeKey = bizKey.replace(/[^a-zA-Z0-9 &'\-]/g, "").trim();
  if (!safeKey) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid key after sanitization" }) };
  }

  try {
    const store = getStore("recommendations");
    const current = await store.get(safeKey);
    const newCount = (parseInt(current || "0", 10)) + 1;
    await store.set(safeKey, String(newCount));

    return { statusCode: 200, headers, body: JSON.stringify({ key: safeKey, count: newCount }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

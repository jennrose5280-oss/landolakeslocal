// netlify/functions/get-votes.js
// Returns vote counts for all businesses from Netlify Blobs

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const store = getStore("recommendations");
    const { blobs } = await store.list();

    const counts = {};
    await Promise.all(
      blobs.map(async (blob) => {
        const val = await store.get(blob.key);
        counts[blob.key] = parseInt(val || "0", 10);
      })
    );

    return { statusCode: 200, headers, body: JSON.stringify(counts) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

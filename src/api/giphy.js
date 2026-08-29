export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = String(req.query.q || "").trim();
  const limit = Math.min(Number(req.query.limit) || 24, 50);

  const apiKey = process.env.GIPHY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GIPHY_API_KEY is not configured",
    });
  }

  try {
    const endpoint = query
      ? "https://api.giphy.com/v1/gifs/search"
      : "https://api.giphy.com/v1/gifs/trending";

    const params = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      rating: "pg-13",
    });

    if (query) {
      params.set("q", query);
    }

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      const text = await response.text();

      return res.status(response.status).json({
        error: "GIPHY request failed",
        details: text,
      });
    }

    const data = await response.json();

    const gifs = (data.data || []).map((gif) => ({
      id: gif.id,
      title: gif.title || "GIF",
      url:
        gif.images?.original?.url ||
        gif.images?.downsized?.url ||
        gif.images?.fixed_height?.url,
      preview:
        gif.images?.fixed_width_small?.url ||
        gif.images?.fixed_height_small?.url ||
        gif.images?.original?.url,
      width: Number(gif.images?.original?.width || 0),
      height: Number(gif.images?.original?.height || 0),
    }));

    return res.status(200).json({
      gifs,
    });
  } catch (error) {
    console.error("GIPHY API error:", error);

    return res.status(500).json({
      error: "Unable to load GIFs",
    });
  }
}
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// API Middleware to prevent caching
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  next();
});

// Google OAuth Token Exchange and Refresh Proxy
app.post("/api/google/token", async (req, res) => {
  try {
    const { client_id, client_secret, code, refresh_token, redirect_uri, grant_type } = req.body;

    // Resolve credentials, prioritizing secure server-side environment variables
    const finalClientId = process.env.GOOGLE_CLIENT_ID || client_id;
    const finalClientSecret = process.env.GOOGLE_CLIENT_SECRET || client_secret;

    if (!finalClientId || !finalClientSecret) {
      return res.status(400).json({ error: "Missing client_id or client_secret credentials." });
    }

    const payload: Record<string, string> = {
      client_id: finalClientId,
      client_secret: finalClientSecret,
      grant_type
    };

    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: "Missing required authorization_code parameters." });
      }
      payload.code = code;
      payload.redirect_uri = redirect_uri;
    } else if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({ error: "Missing required refresh_token parameter." });
      }
      payload.refresh_token = refresh_token;
    } else {
      return res.status(400).json({ error: "Unsupported grant_type." });
    }

    const googleRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(payload).toString()
    });

    const data = await googleRes.json();
    if (!googleRes.ok) {
      return res.status(googleRes.status).json(data);
    }

    res.json(data);
  } catch (err: any) {
    console.error("Error proxying Google OAuth request:", err);
    res.status(500).json({ error: "Internal server error during OAuth proxying." });
  }
});

async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing successfully on http://0.0.0.0:${PORT}`);
  });
}

main().catch(err => {
  console.error("Server bootstrapping failed:", err);
});

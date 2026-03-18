import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const PORT = 3001;

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ Report endpoint
app.get("/api/report", async (req, res) => {
  try {
    const reportId = process.env.SMARTSHEET_REPORT_ID;
    const token = process.env.SMARTSHEET_API_TOKEN;

    if (!reportId || !token) {
      return res.status(500).json({
        error: "Missing SMARTSHEET_REPORT_ID or SMARTSHEET_API_TOKEN",
      });
    }

    const r = await fetch(
      `https://api.smartsheet.com/2.0/reports/${reportId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const text = await r.text();
    res
      .status(r.status)
      .type(r.headers.get("content-type") || "application/json")
      .send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ✅ Row attachments endpoint
app.get("/api/row-attachments", async (req, res) => {
  const { sheetId, rowId } = req.query;

  if (!sheetId || !rowId) {
    return res.status(400).json({ error: "Missing sheetId or rowId" });
  }

  try {
    const token = process.env.SMARTSHEET_API_TOKEN;
    if (!token)
      return res.status(500).json({ error: "Missing SMARTSHEET_API_TOKEN" });

    const r = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows/${rowId}/attachments`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const text = await r.text();
    res
      .status(r.status)
      .type(r.headers.get("content-type") || "application/json")
      .send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});
app.get("/api/attachment-file", async (req, res) => {
  const { sheetId, attachmentId } = req.query;

  if (!sheetId || !attachmentId) {
    return res.status(400).json({ error: "Missing sheetId or attachmentId" });
  }

  try {
    const token = process.env.SMARTSHEET_API_TOKEN;
    if (!token)
      return res.status(500).json({ error: "Missing SMARTSHEET_API_TOKEN" });

    // 1) Get attachment metadata (includes downloadable URL)
    const metaRes = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!metaRes.ok) {
      const t = await metaRes.text();
      return res.status(metaRes.status).type("application/json").send(t);
    }

    const meta = await metaRes.json();
    const downloadUrl = meta.url;
    if (!downloadUrl) {
      return res.status(500).json({ error: "Attachment metadata missing url" });
    }

    // 2) Fetch the file bytes
    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok) {
      const t = await fileRes.text();
      return res.status(fileRes.status).send(t);
    }

    // Stream back with correct content-type
    res.setHeader(
      "content-type",
      fileRes.headers.get("content-type") || "application/octet-stream",
    );
    res.setHeader("cache-control", "public, max-age=3600");

    const buf = Buffer.from(await fileRes.arrayBuffer());
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to stream attachment" });
  }
});
// ✅ Start server
app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

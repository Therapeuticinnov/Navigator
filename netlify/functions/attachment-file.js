export default async (event) => {
  const { sheetId, attachmentId } = event.queryStringParameters || {};
  const token = process.env.SMARTSHEET_API_TOKEN;

  if (!sheetId || !attachmentId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing params" }),
    };
  }

  // Step 1: get attachment metadata
  const metaRes = await fetch(
    `https://api.smartsheet.com/2.0/sheets/${sheetId}/attachments/${attachmentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const meta = await metaRes.json();

  // Step 2: fetch actual file
  const fileRes = await fetch(meta.url);
  const buffer = await fileRes.arrayBuffer();

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "content-type": fileRes.headers.get("content-type") || "image/png",
      "cache-control": "public, max-age=3600",
    },
    body: Buffer.from(buffer).toString("base64"),
  };
};

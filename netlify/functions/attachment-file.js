export default async (request) => {
  const url = new URL(request.url);
  const sheetId = url.searchParams.get("sheetId");
  const attachmentId = url.searchParams.get("attachmentId");
  const token = process.env.SMARTSHEET_API_TOKEN;

  if (!sheetId || !attachmentId) {
    return new Response(
      JSON.stringify({ error: "Missing sheetId or attachmentId" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing SMARTSHEET_API_TOKEN" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  try {
    // Get Smartsheet attachment metadata
    const metaRes = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!metaRes.ok) {
      const text = await metaRes.text();
      return new Response(text, {
        status: metaRes.status,
        headers: {
          "content-type":
            metaRes.headers.get("content-type") || "application/json",
        },
      });
    }

    const meta = await metaRes.json();

    if (!meta.url) {
      return new Response(
        JSON.stringify({ error: "Attachment metadata missing url" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // Fetch the actual file WITHOUT Authorization header
    const fileRes = await fetch(meta.url);

    if (!fileRes.ok) {
      const text = await fileRes.text();
      return new Response(text, {
        status: fileRes.status,
        headers: {
          "content-type":
            fileRes.headers.get("content-type") || "application/octet-stream",
        },
      });
    }

    const contentType =
      fileRes.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await fileRes.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to stream attachment" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};

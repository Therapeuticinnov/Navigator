export default async (request) => {
  const url = new URL(request.url);
  const sheetId = url.searchParams.get("sheetId");
  const rowId = url.searchParams.get("rowId");
  const token = process.env.SMARTSHEET_API_TOKEN;

  if (!sheetId || !rowId) {
    return new Response(JSON.stringify({ error: "Missing sheetId or rowId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
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
    const res = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows/${rowId}/attachments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch row attachments" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};

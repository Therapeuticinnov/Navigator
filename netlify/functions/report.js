export default async () => {
  const reportId = process.env.SMARTSHEET_REPORT_ID;
  const token = process.env.SMARTSHEET_API_TOKEN;

  if (!reportId || !token) {
    return new Response(
      JSON.stringify({
        error: "Missing SMARTSHEET_REPORT_ID or SMARTSHEET_API_TOKEN",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  try {
    const url = new URL(`https://api.smartsheet.com/2.0/reports/${reportId}`);

    // Increase report rows returned from default 100
    url.searchParams.set("pageSize", "10000");
    url.searchParams.set("page", "1");

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch report" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
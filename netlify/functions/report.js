export default async () => {
  const reportId = process.env.SMARTSHEET_REPORT_ID;
  const token = process.env.SMARTSHEET_API_TOKEN;

  if (!reportId || !token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing env variables" }),
    };
  }

  const res = await fetch(
    `https://api.smartsheet.com/2.0/reports/${reportId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await res.text();

  return {
    statusCode: res.status,
    headers: {
      "content-type": "application/json",
    },
    body: data,
  };
};

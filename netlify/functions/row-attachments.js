export default async (event) => {
  const { sheetId, rowId } = event.queryStringParameters || {};
  const token = process.env.SMARTSHEET_API_TOKEN;

  if (!sheetId || !rowId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing params" }),
    };
  }

  const res = await fetch(
    `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows/${rowId}/attachments`,
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

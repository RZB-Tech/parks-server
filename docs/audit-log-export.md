# Audit log JSON download

`GET /api/v1/audit-logs/export?from=2026-10-01&to=2026-10-12`

Send the employee access token as `Authorization: Bearer <access_token>`.
The route allows `superadmin`, `owner`, `director`, `admin`,
`head_accountant`, and `head_marketing`, with the same owner visibility
rules as `GET /api/v1/audit-logs`.

Both `from` and `to` are required:

- `YYYY-MM-DD`: the full start and end days are included in `Asia/Tashkent`.
- ISO date-time with timezone, such as `2026-10-12T09:00:00+05:00`:
  the start instant is included and the end instant is excluded.
  URL-encode query parameters, including `+` in timezone offsets.

Invalid dates, missing boundaries, or a start at/after the resolved end
return `400`. Date-only bounds may be the same day.

The response downloads `audit-logs_<from-date>_<to-date>.json` with
`Content-Type: application/json; charset=utf-8`,
`Content-Disposition: attachment`, and `Cache-Control: no-store`.

```json
{
  "from": "2026-10-01",
  "to": "2026-10-12",
  "exported_at": "2026-10-12T12:00:00.000Z",
  "audit_logs": []
}
```

`audit_logs` contains the same record fields as the journal list, including
employee details, action, entity, old/new values, request details, and
`created_at`. Empty ranges produce a downloadable empty array. The export
has no pagination; records are streamed in batches of 500 and sorted by
`created_at DESC, id DESC`.

For a browser frontend, request the route with the token and download the
response as a Blob. `Content-Disposition` is exposed through CORS:

```js
const query = new URLSearchParams({ from, to });
const response = await fetch(`${apiBase}/api/v1/audit-logs/export?${query}`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
if (!response.ok) throw new Error(`Export failed: ${response.status}`);

const blob = await response.blob();
const disposition = response.headers.get('Content-Disposition');
const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'audit-logs.json';
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
document.body.appendChild(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

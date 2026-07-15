# NexLaunch SP-API Sandbox Server

Zero-dependency Node 18+ backend that proxies Amazon SP-API **sandbox** calls
for the NexLaunch dashboard. No npm install needed — uses `node:http` and the
built-in `fetch`. No AWS SigV4 either: since October 2023 SP-API only needs
the LWA access token in the `x-amz-access-token` header.

## 1. Get sandbox credentials

1. Go to **solutionproviderportal.amazon.com** → **Developer Central**.
2. Click **"+ Add new app client"** → name it **"NexLaunch Internal"**, choose
   **SP-API**, and select the **sandbox**.
3. After creation, copy the **LWA Client ID** and **LWA Client Secret**.
4. Use the app's **"Authorize"** (self-authorization) action to generate a
   **Refresh Token** for your own seller account.

## 2. Configure

```sh
cd server
cp .env.example .env
# paste SPAPI_CLIENT_ID, SPAPI_CLIENT_SECRET, SPAPI_REFRESH_TOKEN into .env
```

**Never commit `.env`** — it is gitignored (this repo is public on GitHub).

Optional overrides: `SPAPI_BASE` (defaults to the NA sandbox), `PORT`
(default 4879), `MARKETPLACE_ID` (default `ATVPDKIKX0DER` = US).

## 3. Run and test

```sh
node server/server.js
```

```sh
curl localhost:4879/api/health
curl "localhost:4879/api/xray?asin=B07N4M94X4"
```

`/api/health` returns `{ ok: true, configured: true|false }`.
`/api/xray` returns `{ source, asin, catalog, offers, fees }` — each section
degrades to `{ error, status }` on failure instead of crashing the request.

The frontend adapter is `js/api.js` (`window.NexApi.serverXray(asin)` /
`window.NexApi.health()`); it times out after 1.5s and returns `null` when
the server is down so the dashboard falls back to demo data.

## Honest note about the sandbox

The SP-API **sandbox returns static, canned payloads**. It validates that
your auth + request wiring is correct — it does **not** return real market
data, and the numbers you get back are placeholders. Real production data
starts flowing once Amazon approves your developer registration and you
create a **production** app client — at that point the only change here is
`SPAPI_BASE=https://sellingpartnerapi-na.amazon.com` in `.env`.

### Sandbox test parameters

The static sandbox matches requests against the parameter patterns defined in
each API's OpenAPI model (`x-amzn-api-sandbox` blocks). In practice:

- **Catalog Items 2022-04-01** — the documented sandbox example uses ASIN
  `B07N4M94X4` with `marketplaceIds=ATVPDKIKX0DER`. Other ASINs may return a
  404/400 from the canned matcher.
- **Product Pricing v0 (`getItemOffers`)** — the sandbox model expects
  `MarketplaceId=ATVPDKIKX0DER` and `ItemCondition=New`; the ASIN itself is
  loosely matched, but stick to `B07N4M94X4` for a guaranteed hit.
- **Product Fees v0 (`getMyFeesEstimateForASIN`)** — the sandbox validates the
  `FeesEstimateRequest` shape (MarketplaceId, IsAmazonFulfilled,
  PriceToEstimateFees.ListingPrice, Identifier); this server always sends a
  conforming body (USD 29.99, identifier `nexlaunch-request`).

If a call comes back with `{ error, status: 400 }` in one section, it usually
means the canned sandbox rejected that parameter combination — retry with the
test ASIN `B07N4M94X4` before suspecting your credentials.

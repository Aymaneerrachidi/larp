# Larpitalism access

## Product rules

- First 3 successfully rendered cards are free, without wallet login.
- Holding at least **1,000,000 LARP on Robinhood Chain** unlocks exports while eligible.
- Isolated deployments with `ACCESS_TEST_MODE=true` use **15,000 tokens** for holder testing. The backend publishes the configured minimum so the displayed requirement always matches the balance check. Normal mode retains the 1,000,000-token launch requirement.
- Holder checks read the latest chain state before each export. Robinhood's public RPC may prune older state behind the `safe` tag; holder checks do not require historical state.
- A **$10 pass**, paid in native **ETH** or the **LARP ERC-20 token**, unlocks exports for **24 hours after verification**. It does not renew automatically.
- Download and Copy share one quota. Reusing the last rendered card in the same tab uses the cached image, not another credit. A render failure restores its reserved credit.
- Wallet login is a short-lived, domain-bound sign-in message. Payments are direct transfers; no approval, permit, custody, or private key is requested.

## Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`. Keep token, recipient and market addresses empty until they are known.
3. Run `npm run dev`. `APP_ORIGIN` must exactly match the browser URL, including its port. Vite uses a development-only, in-memory backend by default. Restarting it clears local usage, sessions, invoices and passes. For payment testing across restarts, configure `DATABASE_URL` with an isolated `ACCESS_NAMESPACE` in `.env.local`.
4. On macOS/Linux, set `CHROME_EXECUTABLE_PATH` to an installed Chrome/Chromium executable. Windows Chrome is detected automatically in the usual Program Files location.
5. Run `npm test` and `npm run build`.
6. With the local server running, `node tests/payment-ui.mjs` verifies automatic payment confirmation, reload/reconnect recovery, failed checks and wallet disconnects using mocked APIs/wallets. It sends no payments. Set `TEST_ORIGIN` for another local port and `CHROME_EXECUTABLE_PATH` if Chrome is not installed at the Windows default path.
7. `node tests/holder-ui.mjs` checks the holder confirmation popup, the 15,000-token test threshold, loss of access after selling below the minimum, balance-check failures and disconnects. It uses mocked holdings and sends no transactions. Holder confirmations appear after an eligible wallet sign-in or an explicit holding check; normal page refreshes do not repeat them.

The unconfigured UI displays the real membership terms but disables holding verification/payment. It never invents a token, recipient or exchange rate. Wallet login and the free trial can still be tested.

## Production deployment (Vercel)

This is no longer a static-only application. `api/studio.js` is a Node function; `render.html` is its export rendering entry. `vercel.json` bundles the serverless Chromium binary and allows a 60-second request. Check the deployment's bundle size and memory allowance before launch. Chromium works on the Linux server; the Windows executable path is local-only.

Required server environment:

- `APP_ORIGIN`: canonical HTTPS origin, e.g. `https://www.larpitalism.fun` (no trailing slash). Redirect alternate hostnames here.
- `SESSION_SECRET`: at least 32 cryptographically random characters. Generate locally with Node's `crypto.randomBytes(32).toString('hex')`; never expose it with a `VITE_` prefix.
- `DATABASE_URL`: pooled Neon Postgres connection. A dedicated `larpitalism-access` database was provisioned on the **free_v3** plan and connected to the Vercel production environment. The application stores usage, single-use challenges, wallet sessions, invoices, payment deduplication and pass expiry here. Production refuses to fall back to process memory. Free-plan compute/storage limits still apply; no paid upgrade was selected.
- `DATABASE_URL_UNPOOLED`: direct connection for migrations. Pull environment values to the ignored `.env.production.local`, then run `npm run db:setup` once or after schema changes. Runtime requests never create tables.
- `CRON_SECRET`: random secret for the daily maintenance job. It removes expired sessions, rate limits and quotes, while retaining usage and payment deduplication records.
- `ACCESS_NAMESPACE`: defaults to `production`. Use a separate database or namespace for staging. Do not copy production access data into public previews.
- `ACCESS_TEST_MODE=true`: adds a visible test-site notice and requires an explicit non-production namespace. Use a separate session secret and origin. Test passes, usage and wallet sessions are stored under the test namespace; maintenance only prunes its own namespace. The isolated `larpitalism-test` Vercel project uses this mode. A test site on chain 4663 still sends real mainnet transactions if the user approves payment.
- Alternatively, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` can run the same access service on Redis. `DATABASE_URL` takes precedence.
- `ROBINHOOD_CHAIN_ID`: `4663` mainnet or `46630` testnet. Only these two networks are accepted; the UI labels testnet explicitly.
- `ROBINHOOD_RPC_URL`: a dedicated RPC for the selected network. The public Robinhood RPC is the development fallback and may be rate-limited.

To enable holder access:

- `LARP_TOKEN_ADDRESS`: verified ERC-20 contract on the selected Robinhood network.

To enable ETH payments:

- `LARP_TREASURY_WALLET`: the intended receiving address on Robinhood Chain. No treasury private key is used by this app.
- Outbound HTTPS access to Coinbase's public ETH/USD spot-price endpoint.

To also enable LARP payments:

- `LARP_PRICE_DEX_CHAIN`: defaults to `robinhood` on mainnet. Testnet has no default dollar-priced market.
- After you set the CA, the backend queries DEX Screener's token-pairs endpoint and selects the highest-liquidity eligible pool for the **exact CA and chain**, with LARP as the base token and at least **$10,000 liquidity**. Matching symbols alone never qualify. No indexed eligible market means LARP quotes stay unavailable; ETH payments remain independent.
- `LARP_PRICE_PAIR_ADDRESS`: optional reviewed pair/pool pin. Supports both 20-byte addresses and 32-byte Uniswap V4 pool IDs. If pinned, no alternate pool is selected.
- `GMGN_API_KEY`: optional **server-only** read-only GMGN OpenAPI key. DEX Screener remains the primary source; HTTP errors, stale responses or no eligible market trigger a GMGN `/v1/token/info?chain=robinhood` lookup. GMGN must return the exact token/price addresses, an eligible main pool, at least $10,000 liquidity, and a positive USD price. A pinned pool is also respected by GMGN. This fallback only runs on chain 4663. The secret is never included in public configuration, quotes or frontend assets; redirects are rejected so the auth header cannot be forwarded to another host.
- Quotes retain market-cap and liquidity metadata. GMGN market cap is calculated as `price.price × circulating_supply` using decimal integers; the payment amount is always calculated from **unit USD price**, not market cap. HTTP freshness checks cannot independently establish the age or accuracy of an indexer's underlying market observations.
- Standard ERC-20 transfer behavior. Fee-on-transfer/no-op tokens are not supported; insufficient Transfer logs do not unlock a pass.

Quotes last 5 minutes and use integer arithmetic rounded up to the nearest smallest token unit. Users see the exact amount, recipient, source and deadline before payment. ETH gas is separate. Price services failing or returning stale HTTP responses disable quotes. DEX Screener is an indexed spot source, not a manipulation-resistant oracle: review the liquidity and trustworthiness of the approved market before enabling LARP payments. For an immature market, leave LARP payments disabled and use ETH.

Payment verification checks chain, sender, nonce, exact destination/calldata/value, successful receipt, ERC-20 Transfer logs where applicable, inclusion before the quote deadline, and matching transaction/receipt hashes in the current canonical block. Access opens on a successful Robinhood sequencer confirmation without waiting for Ethereum finality. This deliberately accepts the risk that a later chain reorganization could reverse a credited transfer; credited passes are not automatically revoked. The browser checks immediately after broadcast, retries pending payments automatically, and resumes a saved payment after reload/reconnecting the sending wallet. Temporary service failures back off and retry; invalid payments stop for review. Users can also retry verification using the saved transaction hash without paying again. One transaction/invoice can only credit access once, even across simultaneous requests. Payment references are retained for 7 days. Transactions included after a quote expires or failed broadcasts with uncertain status need operator review; retain the transaction hash and do not ask the user to pay twice.

The backend does not receive wallet keys, send transactions, or collect automatic recurring payments. A wallet must explicitly approve each payment.

## Scope and limits

- Browser wallets are discovered through EIP-6963/EIP-1193, with a legacy injected-provider fallback. On mobile, use a compatible wallet's in-app browser. No WalletConnect QR bridge is bundled.
- Message verification currently supports normal externally-owned accounts, not ERC-1271 smart-contract wallets.
- Unauthenticated trials are browser sessions, not unique humans. Signed cookies plus IP-based session/request limits deter simple abuse, but new devices/IPs can obtain another trial. Strict one-person trials require accounts and additional abuse controls.
- Official PNG downloads are produced behind the server gate. The editable preview remains visible and can be screenshotted or reproduced by technically skilled users. This is not DRM.
- Twelve render requests per minute are allowed per wallet/session to control compute abuse; membership has no daily export allowance.
- Uploaded images are limited to 800 KB each because the serverless request includes base64 image data. External image URLs and SVG uploads are rejected. Images are passed transiently to the renderer, not stored in the access database.
- Use a separate database or namespace for staging versus production. Mainnet and testnet paid access are isolated by chain ID.

## Validation before activating real payments

Automated tests cover signature expiry/replay, cookie tampering, atomic quotas, failure refunds, wallet linkage, holding loss, RPC failure, exact payment verification, payment idempotency, expiry, quote rounding, automatic market discovery, price-source validation, and cross-origin rejection. Blockchain payment tests use mocked responses and do not constitute a mainnet transfer. The dedicated Neon database has also passed a live integration test using two independent connections and isolated temporary records: concurrent quota reservations, refunds, single-use nonces, payment deduplication, expiry and rate limits. Run that test with `TEST_DATABASE_URL` supplied to `node --test tests/postgres.test.js`.

Before accepting real payments, set `LARP_TREASURY_WALLET` and, once launched, `LARP_TOKEN_ADDRESS` in the Vercel production environment. Redeploy to activate them. Run `npm run preflight -- --payments` with complete production environment values locally: it checks durable storage, network identity, token decimals and live pricing. Sensitive values may need to be supplied locally because Vercel does not return them on env pull. A passing preflight does not prove payment settlement: perform a controlled real payment and verify the resulting pass before announcing paid access. Keep the previous Vercel deployment available for rollback.

References:
- https://docs.robinhood.com/chain/transaction-finality/
- https://docs.robinhood.com/chain/connecting/
- https://docs.robinhood.com/chain/add-network-to-wallet/
- https://eips.ethereum.org/EIPS/eip-6963
- https://docs.cdp.coinbase.com/coinbase-app/track-apis/prices
- https://docs.dexscreener.com/api/reference
- https://github.com/GMGNAI/gmgn-skills (current Robinhood support, OpenAPI auth and token response schema)

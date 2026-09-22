# Production deployment checklist

AlgoVault has two deployable parts: the Spring Boot API and the Chrome extension. Deploy the API first, then build the extension against its final HTTPS URL.

## API

1. Provision PostgreSQL 16 and Redis 7 on a private network. Do not expose either database publicly.
2. Deploy `backend/Dockerfile` with these required environment variables:

   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   - `SPRING_REDIS_HOST`
   - `JWT_SECRET` (at least 32 random bytes)
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `CORS_ALLOWED_ORIGINS=chrome-extension://nglebofiomebgndkkdecnmolafjdphhf`

3. Put the API behind HTTPS and confirm `GET https://your-api.example/health` returns `200` with `status: UP`.
4. Configure the GitHub OAuth application callback URL as `https://nglebofiomebgndkkdecnmolafjdphhf.chromiumapp.org/`.

The manifest has a fixed key, so the extension ID and OAuth callback stay stable across release builds.

## Extension release

1. Copy `extension/.env.production.example` to `extension/.env` and set the final public HTTPS API URL and GitHub OAuth client ID.
2. From `extension/`, run `npm run package:release`.
3. Upload the resulting Chrome package to the Chrome Web Store, or load the `build/chrome-mv3-prod` folder for controlled testing.

`package:release` refuses to package a localhost/non-HTTPS API, validates the MAIN-world submission interceptor, and checks that the generated manifest contains only the configured production backend permission.

## Smoke test before publishing

1. Sign in with GitHub and reopen the side panel; verify the session remains connected.
2. Enable GitHub auto-sync and select a repository with Contents read/write permission.
3. Submit a known accepted LeetCode problem.
4. Verify the timer finishes, celebration appears, and a single GitHub commit is created.
5. Reopen a second LeetCode problem tab and ensure the first accepted result does not block it.

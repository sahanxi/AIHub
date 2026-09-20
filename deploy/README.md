# Production image deployment

Application source is built only by GitHub Actions. The Tokyo server pulls and runs the published image; it does not receive source files and does not build images.

## AIHub release flow

1. Push reviewed code to `main`.
2. Wait for the `Production image (GHCR)` workflow to succeed.
3. Copy the immutable image reference from the workflow summary. It has this form:

   ```text
   ghcr.io/sahanxi/ai-platform-newapi:sha-<full-40-character-git-sha>
   ```

4. If the GHCR package is private, authenticate the Tokyo server once with a read-only GitHub token:

   ```bash
   docker login ghcr.io -u <github-user>
   ```

   Enter a token limited to `read:packages`. Do not put the token in this repository, Compose, shell history, or `.env`.

5. Deploy the exact immutable image on Tokyo:

   ```bash
   sudo /opt/ai-platform/deploy/update-image.sh \
     ghcr.io/sahanxi/ai-platform-newapi:sha-<full-40-character-git-sha>
   ```

6. Verify:

   ```bash
   docker compose --env-file /opt/ai-platform/deploy/.env \
     -f /opt/ai-platform/deploy/docker-compose.yml ps
   curl --fail https://aihub.xzsmart.top/api/status
   ```

The update script validates the image revision label, serializes deployments with a lock, preserves the runtime `.env`, recreates only the application container, waits for health, and restores the prior image automatically when health validation fails. It deliberately does not prune the previous image.

## New applications

Every new production application must use the same pattern:

- GitHub Actions builds and pushes an immutable `sha-<full-git-sha>` image.
- The production Compose file references only a registry image and has no `build:` section.
- A healthcheck controls deployment success.
- The server-side updater pulls first, validates image provenance, updates atomically, and rolls back on failure.
- Application ports bind to `127.0.0.1` and are exposed through Nginx on `80/443` only.
- Persistent data and secrets remain outside the application image.

Do not deploy with `rsync`, `scp`, SFTP, source archives, `git pull`, or server-side `docker build`/`docker compose build`.

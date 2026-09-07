# Restore

This restores MySQL from a gzip dump. It does **not** run `down -v`.

## 1. Stop the application (keep volumes)

```bash
cd /opt/ai-platform/deploy
docker compose --env-file .env stop new-api
```

MySQL stays up so you can import.

## 2. Import SQL

```bash
DUMP=/opt/ai-platform/backups/mysql/newapi-YYYYMMDD-HHMMSS.sql.gz
# inspect the filename first
ls /opt/ai-platform/backups/mysql/

cd /opt/ai-platform/deploy
set -a && source .env && set +a
gunzip -c "${DUMP}" | docker compose --env-file .env exec -T mysql \
  mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}"
```

## 3. Restore compose if needed

```bash
cp /opt/ai-platform/backups/config/docker-compose-YYYYMMDD-HHMMSS.yml \
   /opt/ai-platform/deploy/docker-compose.yml
```

Do not restore `.env` from an untrusted backup location. Keep secret copies separately (mode 600).

## 4. Start and health-check

```bash
docker compose --env-file .env start new-api
# or: docker compose --env-file .env up -d
bash /opt/ai-platform/scripts/healthcheck.sh
curl -fsS http://127.0.0.1:3000/api/status
```

## 5. If the dump is the full previous day

Users created after that dump will be missing. Prefer rolling forward with a newer dump when possible.

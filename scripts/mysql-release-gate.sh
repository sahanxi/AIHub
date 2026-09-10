#!/usr/bin/env bash
set -euo pipefail

# Run Business Seat MySQL release-gate tests against the dedicated test database.
# Usage (on Tokyo host with RDS access):
#   export TEST_MYSQL_DSN='admin:***@tcp(host:3306)/aihub_business_seat_test?charset=utf8mb4&parseTime=True&loc=Local&tls=true'
#   bash scripts/mysql-release-gate.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if [[ -z "${TEST_MYSQL_DSN:-}" ]]; then
  echo "TEST_MYSQL_DSN is required" >&2
  exit 1
fi

export GOWORK=off
export TEST_MYSQL_CONCURRENCY_ROUNDS="${TEST_MYSQL_CONCURRENCY_ROUNDS:-50}"

echo "==> MySQL migration gate"
go test ./model/... -run TestBusinessSeatMigrationMySQL -count=1 -v

echo "==> MySQL business seat release gate"
go test ./service/businessseat/... -run 'TestMySQL' -count=1 -v

echo "==> MySQL release gate PASS"

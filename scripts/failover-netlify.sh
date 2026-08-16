#!/usr/bin/env bash
set -euo pipefail

TOKEN_FILE="$HOME/.mamascota_dns_failover_token"
ZONE_ID="12857ad9b8413f0d17444a542d798193"
RECORD_ID="afa128b7b3f32976da8b8165cd3ef8e3"

CF_TOKEN="$(cat "$TOKEN_FILE")"

echo "Checking Netlify reserve..."

if ! curl -fsSI --max-time 15 \
  --connect-to mamascota.com:443:apex-loadbalancer.netlify.com:443 \
  https://mamascota.com >/dev/null; then
  echo "ERROR: Netlify reserve is not ready. DNS was NOT changed." >&2
  unset CF_TOKEN
  exit 1
fi

echo "Netlify reserve is ready. Switching DNS..."

curl -sS \
  -X PATCH \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  --data '{
    "type": "CNAME",
    "name": "mamascota.com",
    "content": "apex-loadbalancer.netlify.com",
    "ttl": 1,
    "proxied": false
  }'

unset CF_TOKEN

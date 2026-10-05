#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

collect_lan_ips() {
  ifconfig | awk '/inet / && $2 != "127.0.0.1" { print $2 }' | sort -u
}

LAN_IPS=()
while IFS= read -r ip; do
  if [[ -n "${ip}" ]]; then
    LAN_IPS+=("${ip}")
  fi
done < <(collect_lan_ips)

# Prefer en0/en1 (Wi-Fi / Ethernet) as the address phones will open.
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [[ -z "${LAN_IP}" && ${#LAN_IPS[@]} -gt 0 ]]; then
  LAN_IP="${LAN_IPS[0]}"
fi
if [[ -z "${LAN_IP}" ]]; then
  echo "Could not determine any LAN IP from active interfaces."
  exit 1
fi
if [[ ${#LAN_IPS[@]} -eq 0 ]]; then
  LAN_IPS=("${LAN_IP}")
fi

LAN_ORIGINS="$(
  IFS=,
  echo "${LAN_IPS[*]}"
)"

touch "${ENV_FILE}"

# Writes exactly one KEY=value line: replaces the first match, drops
# duplicates, appends when missing.
upsert_env_var() {
  local key="$1"
  local value="$2"

  awk -v key="${key}" -v value="${value}" '
    BEGIN {
      seen = 0
      pattern = "^[[:space:]]*" key "[[:space:]]*="
    }
    $0 ~ pattern {
      if (seen == 0) {
        print key "=" value
        seen = 1
      }
      next
    }
    { print }
    END {
      if (seen == 0) {
        print key "=" value
      }
    }
  ' "${ENV_FILE}" > "${ENV_FILE}.tmp"

  mv "${ENV_FILE}.tmp" "${ENV_FILE}"
}

upsert_env_var "NEXT_DEV_LAN_HOST" "${LAN_IP}"
upsert_env_var "NEXT_ALLOWED_DEV_ORIGINS" "${LAN_ORIGINS}"

echo "Updated .env.local with primary LAN IP ${LAN_IP}"
echo "Allowed dev origins: ${LAN_ORIGINS}"
echo "On your phone, open http://${LAN_IP}:${PORT:-3100}"

#!/usr/bin/env bash
# APK intelligence harvest: per APK, extract the three detection signatures —
#   (1) signing certificate SHA-256 (apksigner V3 signer),
#   (2) notification channel IDs (dexdump disassembly around createNotificationChannel),
#   (3) deeplink schemes + App Link hosts (aapt2 manifest dump).
# Plus package id + version (aapt2 badging). Reads local APK files (no download).
#
# Requires: aapt2, apksigner, dexdump (Android build-tools), unzip, bash.
# Override tools with AAPT2=, APKSIGNER=, DEXDUMP=.
#
# Usage:   bash scripts/apk-intelligence-harvest.sh "/path/to/apk-dir"
# Output:  $HARVEST_DIR/intelligence.tsv  (apk, package, version, cert_sha256, channel_ids, schemes, applink_hosts)
#          and per-apk detail logs under $HARVEST_DIR/<apk>.txt
set -u

SDK_BT="${SDK_BT:-$LOCALAPPDATA/Android/Sdk/build-tools/37.0.0}"
AAPT2="${AAPT2:-$SDK_BT/aapt2.exe}"
APKSIGNER="${APKSIGNER:-$SDK_BT/apksigner.bat}"
DEXDUMP="${DEXDUMP:-$SDK_BT/dexdump.exe}"
DIR="${1:?usage: apk-intelligence-harvest.sh <apk-dir>}"
OUT="${HARVEST_DIR:-./.apk-research/intelligence}"
mkdir -p "$OUT"
TSV="$OUT/intelligence.tsv"
printf "apk\tpackage\tversion\tcert_sha256\tchannel_ids\tschemes\tapplink_hosts\n" > "$TSV"

STD_SCHEME='^(http|https|package|file|content|tel|sms|smsto|mailto|market|geo|android-app|intent|fido|otpauth|fbconnect|genericidp|recaptcha|smartech)$'

shopt -s nullglob
for apk in "$DIR"/*.apk "$DIR"/*.xapk; do
  [ -f "$apk" ] || continue
  base="$(basename "$apk")"
  log="$OUT/${base}.txt"
  echo "==== $base ====" | tee "$log"

  work="$apk"
  # XAPK: pull the base apk out first.
  if [[ "$apk" == *.xapk ]]; then
    pkg_guess="$(unzip -l "$apk" | grep -oE '[a-zA-Z0-9_.]+\.apk' | grep -vE 'config\.' | head -1)"
    unzip -o -q "$apk" "$pkg_guess" -d "$OUT" 2>/dev/null
    work="$OUT/$pkg_guess"
  fi

  badging="$("$AAPT2" dump badging "$work" 2>/dev/null)"
  package="$(printf '%s' "$badging" | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -1)"
  version="$(printf '%s' "$badging" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -1)"

  cert="$("$APKSIGNER" verify --print-certs "$work" 2>/dev/null | grep -iE 'certificate SHA-256' | grep -viE 'source stamp' | head -1 | grep -oE '[0-9a-f]{64}')"

  # Deeplinks from the manifest.
  xml="$("$AAPT2" dump xmltree "$work" --file AndroidManifest.xml 2>/dev/null)"
  schemes="$(printf '%s' "$xml" | grep -A2 'android:scheme' | grep -oE 'Raw: "[^"]+"' | sed 's/Raw: "//;s/"//' | sort -u | grep -viE "$STD_SCHEME" | paste -sd, -)"
  hosts="$(printf '%s' "$xml" | grep -A2 'android:host' | grep -oE 'Raw: "[^"]+"' | sed 's/Raw: "//;s/"//' | sort -u | paste -sd, -)"

  # Channel IDs (best-effort, fast): notification channels are often declared as
  # resource strings; harvest channel-ish string resources + dex string literals
  # containing 'channel'. Full -d disassembly is skipped (slow + R8 hides the
  # const-string); the device learning loop confirms real channel IDs in prod.
  res_channels="$("$AAPT2" dump strings "$work" 2>/dev/null \
    | grep -ioE '[a-z0-9_.]*(notification|channel|payment|transfer|money|deposit|incoming)[a-z0-9_.]*' \
    | grep -iE 'channel' | grep -ivE 'res/|drawable|\.xml' | sort -u | head -30 | paste -sd, -)"
  dex_channels=""
  tmpd="$OUT/.dex_$base"; mkdir -p "$tmpd"
  unzip -o -q "$work" 'classes.dex' -d "$tmpd" 2>/dev/null
  if [ -f "$tmpd/classes.dex" ]; then
    dex_channels="$(strings -n 4 "$tmpd/classes.dex" 2>/dev/null \
      | grep -iE '(notification|payment|transfer|money|deposit|incoming).{0,12}channel|channel.{0,12}(notification|payment|transfer|money|deposit|incoming)' \
      | grep -ivE 'res/|drawable|android\.|com\.google|\.xml|createNotificationChannel\(' | sort -u | head -20 | paste -sd, -)"
  fi
  rm -rf "$tmpd"
  channels="$(printf '%s|%s' "$res_channels" "$dex_channels" | sed 's/^|//;s/|$//')"

  {
    echo "package: $package"
    echo "version: $version"
    echo "cert_sha256: $cert"
    echo "channel_ids: $channels"
    echo "schemes: $schemes"
    echo "applink_hosts: $hosts"
  } | tee -a "$log"

  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$base" "$package" "$version" "$cert" "$channels" "$schemes" "$hosts" >> "$TSV"
  [[ "$apk" == *.xapk ]] && rm -f "$work"
done
echo "DONE -> $TSV"

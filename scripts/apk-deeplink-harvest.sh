#!/usr/bin/env bash
# Harvest deeplink schemes / App Link hosts / paths from app manifests.
#
# For each package id: downloads the APK from the apkpure XAPK CDN endpoint,
# decodes the (binary) AndroidManifest.xml with aapt2, extracts custom URI
# schemes, App Link hosts and deeplink path prefixes, then deletes the APK.
# This replaces tapping each app by hand to discover whether/how it opens.
#
# Requires: bash, curl, unzip, xxd, and aapt2 (Android build-tools).
# Override the aapt2 path with AAPT2=/path/to/aapt2 if not auto-found.
#
# Usage: AAPT2=... bash scripts/apk-deeplink-harvest.sh com.pkg.one com.pkg.two ...
# Output: ./.apk-research/results.tsv  (package, status, custom_schemes, applink_hosts, deeplink_paths)
#
# NOTE: APKs come from a third-party mirror (apkpure), not Google Play. For
# production trust, re-verify a harvested scheme against the on-device APK:
#   adb shell pm path <pkg> ; adb pull <path> base.apk ; aapt2 dump xmltree base.apk --file AndroidManifest.xml
set -u

AAPT2="${AAPT2:-}"
if [ -z "$AAPT2" ]; then
  for cand in \
    "$ANDROID_HOME/build-tools"/*/aapt2* \
    "$LOCALAPPDATA/Android/Sdk/build-tools"/*/aapt2* \
    "$HOME/Android/Sdk/build-tools"/*/aapt2*; do
    [ -x "$cand" ] && AAPT2="$cand" && break
  done
fi
[ -z "$AAPT2" ] && { echo "aapt2 not found; set AAPT2=/path/to/aapt2"; exit 1; }

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
DIR="${HARVEST_DIR:-./.apk-research}"
mkdir -p "$DIR"
RES="$DIR/results.tsv"
[ -f "$RES" ] || printf "package\tstatus\tcustom_schemes\tapplink_hosts\tdeeplink_paths\n" > "$RES"
# Standard/SDK schemes that are not app payment deeplinks.
STD="^(http|https|package|file|content|tel|sms|smsto|mailto|market|geo|android-app|intent|fido|otpauth|fbconnect|genericidp|recaptcha|smartech)$"

for pkg in "$@"; do
  f="$DIR/$pkg.apk"
  code=$(curl -sS -o "$f" -w "%{http_code}" --max-time 120 -L -A "$UA" \
    -H "Referer: https://apkpure.com/" "https://d.apkpure.com/b/XAPK/$pkg?version=latest" 2>/dev/null)
  if [ "$(xxd -p -l4 "$f" 2>/dev/null)" != "504b0304" ]; then
    printf "%s\tDOWNLOAD_FAIL(http=%s)\t-\t-\t-\n" "$pkg" "$code" >> "$RES"
    echo "[$pkg] download fail http=$code (not on this mirror -> use adb pull on device)"
    rm -f "$f"; continue
  fi
  target="$f"; tmpd=""
  if [ "$(unzip -l "$f" 2>/dev/null | grep -cE ' [^/]+\.apk$')" -gt 0 ]; then
    tmpd="$DIR/_x_$pkg"; rm -rf "$tmpd"; mkdir -p "$tmpd"; unzip -o "$f" -d "$tmpd" >/dev/null 2>&1
    target=$(ls -1 "$tmpd/$pkg.apk" "$tmpd/base.apk" 2>/dev/null | head -1)
    [ -z "$target" ] && target=$(ls -1S "$tmpd"/*.apk 2>/dev/null | head -1)
  fi
  dump=$("$AAPT2" dump xmltree "$target" --file AndroidManifest.xml 2>/dev/null)
  schemes=$(echo "$dump" | grep -oiE 'android:scheme[^"]*"[^"]+"' | grep -oE '"[^"]+"$' | tr -d '"' | sort -u | grep -viE "$STD" | grep -v '@0x' | paste -sd',' -)
  hosts=$(echo "$dump"   | grep -oiE 'android:host[^"]*"[^"]+"'   | grep -oE '"[^"]+"$' | tr -d '"' | sort -u | grep -v '@0x' | grep -E '\.' | paste -sd',' -)
  paths=$(echo "$dump"   | grep -oiE 'android:path[A-Za-z]*[^"]*"[^"]+"' | grep -oE '"[^"]+"$' | tr -d '"' | sort -u | grep -v '@0x' | head -20 | paste -sd',' -)
  printf "%s\tOK\t%s\t%s\t%s\n" "$pkg" "${schemes:--}" "${hosts:--}" "${paths:--}" >> "$RES"
  echo "[$pkg] schemes=[${schemes:--}] hosts=[${hosts:--}]"
  rm -f "$f"; [ -n "$tmpd" ] && rm -rf "$tmpd"
done

# Web Return Fallback Report

## Result

`return_url` remains supported as a browser/web fallback. `web_return_url` is now accepted as an explicit alias for the same safe stored fallback URL.

## Rules Preserved

- Web return is UX only.
- Native Android return has priority when supplied by the SDK.
- Fulfillment still depends only on the signed final webhook.
- Unsafe return URLs remain rejected by existing URL validation.

## API Contract

Order creation accepts:

- `return_url`
- `web_return_url`
- legacy aliases: `success_url`, `merchant_return_url`, `app_link_url`, `android_deep_link`

The stored value is still exposed as `return_url` to existing clients.

## Files Changed

- `apps/api/src/orders.ts`
- `apps/api/src/orders.test.ts`


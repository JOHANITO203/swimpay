# Receiving Method Delete Contract Audit

## Active Contracts Found

Android UI:

- `PremiumDashboardScreens.kt`
  - `PremiumReceivingMethodRow`
  - `ReceivingMethodDeleteDialog`
  - calls `onDelete()`

Android runtime:

- `PremiumMerchantApp.kt`
  - `onDeleteMethod` calls `activeRuntime.deleteReceivingMethod(routeId)`
  - reloads receiving methods from backend after mutation
- `PremiumMerchantRuntime.kt`
  - maps repository success to `Moyen supprimé`

Android API client:

- `AndroidMerchantApiWiring.kt`
  - sends `DELETE /v1/merchant/receiving-methods/{routeId}`
  - now requires explicit backend deletion proof before returning success

Backend API:

- `apps/api/src/server.ts`
  - `DELETE /v1/merchant/receiving-methods/:method_id`
  - returns `deleted: true`
  - now returns `deleted_method_id`
  - returns method `status: "deleted"` and `lifecycle_status: "deleted"`

Backend repository:

- `apps/api/src/orders.ts`
  - `deleteReceivingRoute`
  - sets `enabled = false`
  - sets `recommended = false`
  - sets `lifecycle_status = 'deleted'`
  - sets `deleted_at`
  - writes audit event `merchant_receiving_route.deleted`

Database/docs:

- `merchant_receiving_routes.deleted_at`
- `lifecycle_status = deleted`
- soft-delete preserves historical references while removing the route from active merchant and checkout surfaces.

## Root Cause

The backend already soft-deleted receiving methods correctly, but the contract between Android and API was weak:

- Android treated any `2xx` DELETE response as success.
- The DELETE response returned `deleted: true`, but did not include a matching `deleted_method_id`.
- The deleted method response still exposed `status: "inactive"` instead of `status: "deleted"`, which blurred the difference between disabled and deleted.

That made the app vulnerable to reporting success if a proxy, stale backend, or mismatched endpoint returned a generic successful mutation without actually deleting the selected method.

## Contract Hardened

Successful delete now requires:

```json
{
  "deleted": true,
  "deleted_method_id": "<requested_method_id>",
  "method": {
    "status": "deleted",
    "lifecycle_status": "deleted"
  },
  "official_bank_confirmation": false
}
```

Android rejects a `2xx` delete response without `deleted: true` and a matching `deleted_method_id`.

## Product Meaning

“Supprimer réellement” means:

- no longer visible in merchant receiving-method lists;
- no longer selectable in checkout;
- no longer usable for new receiving-route locks;
- still preserved as masked historical/audit data.

It does not mean physical row deletion, because physical deletion would break auditability and historical payment session references.

## Tests Added / Updated

- API delete contract now asserts:
  - `status: "deleted"`
  - `lifecycle_status: "deleted"`
  - `deleted: true`
  - `deleted_method_id`
  - hidden from merchant list
  - hidden from checkout receiver-bank/route availability
  - raw destination not exposed
  - audit event written

- Android delete contract now asserts:
  - successful delete response uses explicit deleted proof;
  - weak `2xx` delete response without deleted proof returns `ERROR`;
  - delete request stays on `DELETE /v1/merchant/receiving-methods/{routeId}`.

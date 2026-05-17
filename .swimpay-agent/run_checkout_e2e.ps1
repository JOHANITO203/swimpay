param(
  [Parameter(Mandatory=$true)][string]$ApiBase,
  [Parameter(Mandatory=$true)][string]$SecretKey
)
$ErrorActionPreference = 'Stop'
function Invoke-Json($Method, $Uri, $Body=$null, $Secret=$null) {
  $headers = @{ 'Accept'='application/json' }
  if ($Secret) { $headers['Authorization'] = "Bearer $Secret" }
  $params = @{ Method=$Method; Uri=$Uri; Headers=$headers; TimeoutSec=30; UseBasicParsing=$true }
  if ($null -ne $Body) { $params['ContentType']='application/json'; $params['Body']=($Body | ConvertTo-Json -Depth 8) }
  try {
    $r = Invoke-WebRequest @params
    $json = $r.Content | ConvertFrom-Json
    [pscustomobject]@{ Status=[int]$r.StatusCode; Json=$json; Body=$r.Content }
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $sr = [IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
      $bodyText = $sr.ReadToEnd()
      [pscustomobject]@{ Status=$status; Json=($bodyText | ConvertFrom-Json -ErrorAction SilentlyContinue); Body=$bodyText }
    } else { throw }
  }
}
$externalId = 'codex-e2e-' + (Get-Date -Format 'yyyyMMddHHmmss')
$orderPayload = @{
  external_id = $externalId
  amount = @{ value='137.00'; currency='RUB' }
  buyer = @{ bank_phone = '+79991234567' }
  expires_in_seconds = 900
}
$order = Invoke-Json POST "$ApiBase/v1/orders" $orderPayload $SecretKey
$result = [ordered]@{ api_base=$ApiBase; external_id=$externalId; create_order_status=$order.Status }
if ($order.Status -ne 201) {
  $result.error = $order.Body
  $result | ConvertTo-Json -Depth 8
  exit 0
}
$sessionId = $order.Json.payment_session_id
$result.order_id = $order.Json.order_id
$result.payment_session_id = $sessionId
$result.checkout_url = $order.Json.checkout_url
$status0 = Invoke-Json GET "$ApiBase/v1/checkout/$sessionId/status"
$result.checkout_initial_status = $status0.Status
$profile = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/expected-payment-profile" @{
  buyer_first_name = 'Ivan'
  buyer_last_name = 'Petrov'
  payment_method = 'card'
  sender_bank_id = 'sber_ru'
  sender_card_number = '4111111111111111'
}
$result.expected_profile_status = $profile.Status
$banks = Invoke-Json GET "$ApiBase/v1/checkout/$sessionId/receiver-banks"
$result.receiver_banks_status = $banks.Status
$result.receiver_bank_count = @($banks.Json.receiver_banks).Count
if (@($banks.Json.receiver_banks).Count -gt 0) {
  $bank = @($banks.Json.receiver_banks | Where-Object { $_.available_route_count -gt 0 } | Select-Object -First 1)
  if ($null -eq $bank) { $bank = @($banks.Json.receiver_banks | Select-Object -First 1) }
  $result.selected_receiver_bank = $bank.receiver_bank_id
  $selBank = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/receiver-bank" @{ receiver_bank_id=$bank.receiver_bank_id }
  $result.select_bank_status = $selBank.Status
  $routes = Invoke-Json GET "$ApiBase/v1/checkout/$sessionId/receiver-banks/$($bank.receiver_bank_id)/routes"
  $result.routes_status = $routes.Status
  $result.route_count = @($routes.Json.routes).Count
  if (@($routes.Json.routes).Count -gt 0) {
    $route = @($routes.Json.routes | Select-Object -First 1)
    $result.selected_route = $route.route_id
    $selRoute = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/receiving-route" @{ receiving_route_id=$route.route_id }
    $result.select_route_status = $selRoute.Status
    $launchers = Invoke-Json GET "$ApiBase/v1/checkout/$sessionId/payer-bank-launchers"
    $result.launchers_status = $launchers.Status
    $launcher = @($launchers.Json.payer_bank_launchers | Select-Object -First 1)
    if ($null -ne $launcher) {
      $result.selected_launcher = $launcher.payer_bank_launcher_id
      $selLauncher = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/payer-bank-launcher" @{ payer_bank_launcher_id=$launcher.payer_bank_launcher_id }
      $result.select_launcher_status = $selLauncher.Status
    }
    $instructions = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/payment-instructions-shown" @{}
    $result.instructions_status = $instructions.Status
    $armed = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/continue-to-bank" @{}
    $result.continue_to_bank_status = $armed.Status
    $claimed = Invoke-Json POST "$ApiBase/v1/checkout/$sessionId/claimed-paid" @{}
    $result.claimed_paid_status = $claimed.Status
    $result.claimed_paid_session_status = $claimed.Json.status
  }
}
$finalStatus = Invoke-Json GET "$ApiBase/v1/checkout/$sessionId/status"
$result.checkout_final_status = $finalStatus.Status
$result.checkout_session_status = $finalStatus.Json.status
$result | ConvertTo-Json -Depth 8



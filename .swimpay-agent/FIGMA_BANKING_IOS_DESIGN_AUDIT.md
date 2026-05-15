# Figma Banking iOS Design Audit

Date: 2026-05-15

Source:

- Figma file: `Zo91GXhTzhxQvV9rPsqiqH`
- Community URL title: `Banking mobile app for IOS (Community)`
- Figma API reported file name: `Document`

Scope: audit only. No code changed.

## Access note

The file was accessible through the Figma connector and the top-level structure was inspected.

The second extraction pass hit the Figma MCP Starter plan call limit before detailed color/typography/radius/effect tokens could be fully exported. This report therefore records:

- confirmed file structure;
- confirmed screen inventory;
- adaptation decisions;
- token categories to extract on the next Figma pass.

It does not invent exact colors or typography values that were not returned by the tool.

## File structure

One Figma page was found:

- `Page 1`

Top-level design/system areas:

- `About author` - 1920 x 1357
- `Design System` - section, 1365 x 1967
- `Widgets` - section, 2246 x 2300

Mobile screen frames are all sized:

- width: `393`
- height: `852`

This is a modern iPhone-sized design system, closer to iOS 14/15/16 mobile proportions than Android large mockup canvases.

## Screen inventory

Confirmed screens:

- `Log in`
- `Hello`
- `Home`
- `History`
- `Transaction`
- `Transaction detail`
- `Transaction receipt`
- `Payments and services`
- `Transfer by phone number`
- `Showcase product`
- `My cards`
- `Cashback and bonuses`
- `Support and chat`
- `Settings`
- `Investments`
- `Order a new card`
- `Map of branches and ATMs`
- `Mortgage application`
- `Promotion details`
- `Loan calculator`
- `Loyalty`
- `Policy Details`
- `Currency Exchange`
- `Family Banking`

The file also includes a dedicated `Design System` section and a `Widgets` section, which suggests the design has reusable component primitives rather than only isolated screens.

## Product direction observed from screen map

The app is a broad retail banking super-app:

- login/auth;
- account home;
- transaction history;
- payment/transfer flows;
- card management;
- cashback/bonuses;
- support chat;
- settings;
- investments;
- loans/mortgage;
- insurance/policy;
- currency exchange;
- family banking;
- branch/ATM map.

This is broader than SwimPay Merchant. It should not be copied as product scope.

## Confirmed structural tokens

### Screen size

- `screen.width`: `393dp`
- `screen.height`: `852dp`

### Information architecture

- Bottom-level merchant/home navigation likely exists in `Home`, `History`, `Payments and services`, `Settings`.
- Detail screens are separate and task-specific.
- Product/service modules are isolated into cards/screens instead of one overloaded settings area.

### Component categories

From screen and section names, the design likely includes:

- authentication form;
- account summary card;
- transaction rows;
- transaction details;
- receipt/card document layout;
- service grid;
- phone transfer form;
- card carousel/detail;
- support chat messages;
- settings rows;
- investment/product cards;
- map/branch search surfaces;
- calculator form controls;
- loyalty/promotion cards;
- currency exchange form rows.

## Visual token extraction pending

The following should be extracted in the next Figma connector window:

- background colors;
- surface/card colors;
- primary/accent colors;
- semantic colors for success/error/warning;
- typography family and scale;
- button sizes and radii;
- card radii;
- row heights;
- grid spacing;
- shadow/elevation values;
- icon sizes;
- bottom navigation height;
- input field height/radius;
- pill/chip style;
- chart/graph colors if present.

## Preliminary design read

Because the detailed token pass was rate-limited, this section is intentionally high-level.

The design appears to be:

- retail-bank oriented;
- iOS-native in screen size and likely spacing;
- broad-service dashboard driven;
- modular with reusable widgets;
- likely cleaner and more mature than a one-off visual mockup because it has `Design System` and `Widgets` sections.

## SwimPay relevance

Useful for SwimPay:

- simple mobile banking navigation structure;
- transaction list grammar;
- payment/transfer flow layout patterns;
- settings grouping;
- receipt/detail screen structure;
- support/chat entry pattern;
- service-grid model that can be adapted to merchant actions;
- currency exchange/form field discipline for structured financial inputs.

Needs adaptation:

- broad retail banking scope must be reduced;
- loans, mortgage, investments, family banking and card ordering are not SwimPay Merchant features;
- card/account ownership metaphors must not imply SwimPay stores funds;
- phone transfer UI can inform receiving-method orientation but must not imply SBP integration or payment initiation;
- iOS-specific measurements need Android Compose adaptation.

Reject for SwimPay:

- bank account ownership language;
- personal cards as default home object;
- investment/loan/insurance product surfaces;
- branch/ATM map;
- consumer loyalty/cashback product areas;
- any wording that makes SwimPay look like a bank or PSP.

## Audit status

Status: partial due Figma MCP rate limit.

Next safe step:

- rerun detailed token extraction when the Figma connector limit resets;
- then update this report with exact colors, typography, radii, shadows and component metrics.

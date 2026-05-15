# Figma Finance Management App Design Audit

Date: 2026-05-15

Source:

- Figma file: `Sg1Cok0n9bM405wEAtZ5mr`
- File name reported by Figma API: `Document`
- Public/community title from URL: `Finance Management App (Community)`

Scope: audit only. No app code changed.

## Figma structure

The file contains one page:

- `Page 1`

Main top-level nodes:

- `Dribble 1` - 1600 x 1200 frame
- `Dribbble 2` - 1600 x 1200 frame
- `iPhone 11 Pro / X - 5` - 445 x 964 component
- `Group 44` - 445.2 x 964 component
- `Ellipse 30`

The practical mobile screens are:

- onboarding/hero screen: `iPhone 11 Pro / X - 5`
- finance home/dashboard screen: `iPhone 11 Pro / X - 4` / `Group 44`

No local Figma variables, paint styles, text styles or effect styles were defined. Tokens below are inferred from actual node properties.

## Visual direction

Style:

- soft premium fintech
- light glassmorphism
- pastel gradient banking UI
- friendly consumer finance
- card-led mobile dashboard
- large rounded phone/screen silhouettes

Mood:

- optimistic
- lightweight
- approachable
- lifestyle/consumer finance
- less operational and less security-heavy than SwimPay

This design is visually polished but is consumer-personal-finance oriented, not merchant operations oriented.

## Color tokens extracted

Dominant fills:

- `#FFFFFF` - primary card/text surface
- `#233F78` - deep blue brand/card accent
- `#46639D` - muted blue text/icon accent
- `#535353` - primary dark text
- `#F3F3FE` - soft lavender surface
- `#B1B1F8` - lavender orb/accent
- `#C4C4C4` - neutral placeholder/mask
- `#7979FF` - saturated violet accent
- `#0E8A8E` - teal money value
- `#DA879A` - rose card accent
- `#FF6666` - red/negative value

Opacity/system colors:

- `#FFFFFF@0.80` - main frosted background overlay
- `#FFFFFF@0.72` - bottom navigation glass
- `#FFFFFF@0.47` - floating glass cards
- `#FFFFFF@0.45` - transaction row cards
- `#FFFFFF@0.36` - muted glass panels
- `#676767@0.30` - faint muted copy
- `#5B90FD@0.11` - pale blue wash

Key gradients:

- Hero background angular gradient:
  - `#EACEDF`
  - `#DBD2FC`
  - `#D9DFFD`
  - `#7B7EEC`
- Card gradient:
  - `#5278C7 -> #233F78`
- App background:
  - `#FFC7C7 -> #8271FB`
- Rose metric card:
  - `#FEB4C5 -> #DB869A`
- Violet metric card:
  - `#9B9CF8` family
- Positive small indicator:
  - `#5EFF6E -> #35CA44`
- Negative small indicator:
  - `#FFA39D -> #FF675E`

## Typography tokens extracted

Primary font families:

- `Nexa Bold / Regular`
- `Nexa Light / Regular`
- `Quicksand / Medium` for large currency icon
- `Roboto / Regular` only for footer/URL credit

Practical type scale:

- hero title: `36sp`, line height about `125%`, weight bold
- hero body: `18sp`, line height about `164%`, light
- CTA label: `18sp`, line height `28.48px`, bold
- screen/user title: `21.37sp`, line height about `164%`, bold
- section title: `21.37sp`, bold
- card label/value: `16.62sp`, line height about `164%`
- row title: `14.25sp`, bold
- metadata: `11.87sp`, light
- tiny chart/date labels: `7.12sp`
- decorative currency symbol: `42.74sp`, Quicksand medium

Letter spacing is `0`.

## Shape and radius tokens

Mobile frame:

- width: `445dp`
- height: `964dp`
- phone radius: about `64dp`

Core radius values:

- card radius: `14.25dp`
- row/button/nav radius: `14dp`
- small radius: `4.75dp`
- very large round avatar/action tiles: about `64dp`

Most raw vectors have `0` radius; the usable UI grammar is built around `14dp` cards plus circular/large-radius decorative shapes.

## Effects / glass tokens

Blur:

- ambient glass blur: `22dp`
- large frosted background blur: `261dp` to `310dp`
- card blur: about `124.66dp`
- chart/card vector blur: about `70dp` to `74dp`

Shadow:

- phone shadow:
  - `#000000`, opacity `0.13`, offset roughly `15x14` or `-24x14`, blur `45`
- primary blue card shadow:
  - `#233F78`, opacity `0.25`, offset `-4.75x30`, blur `30`
- soft card shadow:
  - `#000000`, opacity `0.08`, offset `0x4.75`, blur `17.8`
- colored glow:
  - rose `#F0A1B4`, opacity `0.40`, offset `0x4.75`, blur `17.8`
  - violet `#8688EF`, opacity `0.37`, offset `0x8.31`, blur `21.37`

## Component grammar

Hero/onboarding:

- large gradient/pastel background
- big friendly headline
- short explanatory body
- single full-width CTA
- large person illustration
- floating frosted decorative cards

Dashboard:

- top user profile row
- balance card with masked card number
- glass metric cards for income/expense
- horizontal bill/action tiles
- transaction list with date + merchant + amount
- frosted bottom navigation

Navigation:

- bottom glass bar around `90dp` high
- rounded/frosted surface, `#FFFFFF@0.72`
- icon-led tabs

## Fit for SwimPay

Reusable:

- soft glass layering
- friendly onboarding simplicity
- large single-action CTA pattern
- card-led dashboard hierarchy
- bottom glass navigation concept
- transaction/review list density
- soft metric cards

Needs adaptation:

- color palette is too pastel/consumer for SwimPay Merchant
- Nexa is not guaranteed in Android app; use project font/system fallback
- personal-finance vocabulary does not fit merchant operations
- illustration-led hero should not dominate operational merchant screens
- low-contrast white overlays are risky for dense operational data

Reject for SwimPay:

- fake personal banking card numbers as runtime pattern
- consumer finance spend/bill categories as product concept
- overly decorative person illustration on operational dashboard
- tiny `7sp` labels
- low contrast `#676767@0.30` metadata

## Token summary

Recommended extracted token names if adapted:

- `figmaFinance.bg.pastelGradient`
- `figmaFinance.surface.frosted`
- `figmaFinance.surface.cardWhiteGlass`
- `figmaFinance.brand.deepBlue`
- `figmaFinance.brand.softBlue`
- `figmaFinance.accent.violet`
- `figmaFinance.accent.teal`
- `figmaFinance.accent.rose`
- `figmaFinance.text.primaryDark`
- `figmaFinance.text.muted`
- `figmaFinance.radius.card14`
- `figmaFinance.radius.phone64`
- `figmaFinance.blur.glass22`
- `figmaFinance.blur.card125`
- `figmaFinance.shadow.phone`
- `figmaFinance.shadow.softCard`

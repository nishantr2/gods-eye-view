# Land OS — Auction Properties ≤ ₹50L

Status: local-first acquisition module
Data snapshot: 6 October 2026
Local route: http://localhost:4173/land-os/

## Purpose

Add a property-acquisition surface to Land OS without changing the existing property mission / terrain / Blender / Vastu ownership model.

The module answers:
- Which current Goa + Mumbai/MMR residential bank-auction properties are within a chosen reserve-price cap (default ₹50 lakh)?
- What is the reserve price, EMD, area in m², auction date, lender, possession status and source?
- Is there enough evidence to estimate a market value?
- What is the indicative discount/headroom versus that estimate?
- What feed-level risks need diligence before bidding?

## Valuation rule

Reserve price is never treated as market value.

The UI shows an estimated market value only when a source publishes a defensible market discount/estimate. If comparable evidence is insufficient, the UI shows Research needed instead of inventing a number.

All estimates are screening signals, not appraisals. Building-level comparables, registered sale evidence, condition, possession, dues, title/encumbrances and access remain diligence items.

## Area rule

Land OS displays property area only in square metres. Source data originally published in square feet is converted before display.

## Source hierarchy

- lender-linked: listing is directly attributed to the lender or exposes the lender notice through the listing surface.
- aggregator: discovery source; the original statutory sale notice still needs to be attached before bidding.

## Local-only behavior

- No server database is introduced.
- Shortlist state is kept in browser localStorage.
- Current auction rows are a dated source-backed seed in land-os/index.html.
- No background crawler runs from this page.
- Existing PROPERTY_MISSION_V1 remains the downstream property-analysis flow after human selection.

## Next safe extension

1. Add a bounded ingestion job that refreshes auction feeds and deduplicates by lender + asset + auction date.
2. Resolve and attach original BAANKNET/lender sale notices when possible.
3. Add building/locality comparable asking and registered-sale evidence with source date and confidence.
4. Add map coordinates only after property identity is verified.
5. Link a shortlisted acquisition candidate into PROPERTY_MISSION_V1 only after human selection.

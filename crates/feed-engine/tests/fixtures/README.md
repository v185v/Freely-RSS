# FreelyRSS Feed Fixtures

This directory holds fixed feed samples for parser, normalization, and regression tests.

The samples are intentionally test-only:

- They live under `crates/feed-engine/tests/fixtures/` instead of `src/`.
- `manifest.json` is the canonical inventory that declares scenario coverage.
- `fixture_catalog.rs` enforces that every required scenario stays covered.

Fixture inventory:

- `rss/rss-2-rich-media.xml`: RSS 2.0 sample with enclosure and media tags.
- `rss/rss-2-duplicates-and-missing-fields.xml`: RSS 2.0 sample with duplicate candidates and sparse article fields.
- `rss/rss-0.91-legacy.xml`: legacy RSS 0.91 sample kept for future parser compatibility work.
- `atom/atom-longform-multilingual.xml`: Atom 1.0 sample for longform and multilingual content.
- `json-feed/json-feed-podcast.json`: JSON Feed 1.1 sample with rich-media attachments.
- `html/html-single-feed.html`: HTML page with exactly one discoverable RSS feed.
- `html/html-multiple-feeds.html`: HTML page with multiple discoverable RSS / Atom / JSON Feed candidates.
- `html/html-no-feed.html`: HTML page without any discoverable feed links.
- `invalid/malformed-rss.xml`: malformed XML sample that must stay a parser error.
- `invalid/unsupported-opml-root.xml`: XML sample with an unsupported root element.
- `invalid/unsupported-json-feed-version.json`: JSON Feed-like sample with an unsupported spec version.
- `invalid/invalid-json-feed.json`: syntactically invalid JSON sample for parse-error regression.

When later steps add parser assertions, reuse these files directly instead of inventing ad hoc inline samples.

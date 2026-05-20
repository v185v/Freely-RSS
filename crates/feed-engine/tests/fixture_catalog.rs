use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FixtureManifest {
    version: u32,
    required_scenarios: Vec<String>,
    fixtures: Vec<FixtureEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FixtureEntry {
    id: String,
    format: String,
    path: String,
    expected_outcome: String,
    expected_error_kind: Option<String>,
    expected_message_fragment: Option<String>,
    article_count: usize,
    scenarios: Vec<String>,
    markers: Vec<String>,
}

#[test]
fn fixture_catalog_covers_required_scenarios() {
    let manifest = load_manifest();
    let covered_scenarios = manifest
        .fixtures
        .iter()
        .flat_map(|fixture| fixture.scenarios.iter().cloned())
        .collect::<BTreeSet<_>>();

    assert_eq!(manifest.version, 1);

    for scenario in &manifest.required_scenarios {
        assert!(
            covered_scenarios.contains(scenario),
            "required scenario {scenario} should be covered by at least one fixed fixture"
        );
    }
}

#[test]
fn fixture_catalog_entries_point_to_existing_files_with_expected_signatures() {
    let manifest = load_manifest();
    let fixtures_root = fixtures_root();

    for fixture in manifest.fixtures {
        let file_path = fixture_file_path(&fixture.path);
        assert!(
            file_path.exists(),
            "fixture {} should exist at {}",
            fixture.id,
            file_path.display()
        );
        assert!(
            file_path.starts_with(&fixtures_root),
            "fixture {} should stay under the test-only fixtures directory",
            fixture.id
        );

        let content = fs::read_to_string(&file_path).unwrap_or_else(|error| {
            panic!(
                "fixture {} should be readable as UTF-8: {error}",
                fixture.id
            )
        });

        assert!(
            !content.trim().is_empty(),
            "fixture {} should not be empty",
            fixture.id
        );

        match fixture.format.as_str() {
            "rss" => {
                assert!(
                    content.contains("<rss"),
                    "RSS fixture {} should expose an <rss> root element",
                    fixture.id
                );
                assert_eq!(
                    content.matches("<item>").count(),
                    fixture.article_count,
                    "RSS fixture {} should expose the declared number of items",
                    fixture.id
                );
            }
            "atom" => {
                assert!(
                    content.contains("<feed xmlns=\"http://www.w3.org/2005/Atom\""),
                    "Atom fixture {} should expose an Atom feed root",
                    fixture.id
                );
                assert_eq!(
                    content.matches("<entry>").count(),
                    fixture.article_count,
                    "Atom fixture {} should expose the declared number of entries",
                    fixture.id
                );
            }
            "json-feed" => {
                assert!(
                    content.trim_start().starts_with('{'),
                    "JSON Feed fixture {} should start with a JSON object",
                    fixture.id
                );
                assert!(
                    content.contains("\"version\": \"https://jsonfeed.org/version/1.1\""),
                    "JSON Feed fixture {} should declare the expected spec version",
                    fixture.id
                );
                assert_eq!(
                    content.matches("\"id\":").count(),
                    fixture.article_count,
                    "JSON Feed fixture {} should expose the declared number of items",
                    fixture.id
                );
            }
            "json" => {
                assert!(
                    content.trim_start().starts_with('{'),
                    "JSON regression fixture {} should start with a JSON object",
                    fixture.id
                );
            }
            "xml" => {
                let trimmed = content.trim_start();
                assert!(
                    trimmed.starts_with("<?xml") || trimmed.starts_with('<'),
                    "XML regression fixture {} should start with an XML document",
                    fixture.id
                );
            }
            "html" => {
                let trimmed = content.trim_start().to_ascii_lowercase();
                assert!(
                    trimmed.starts_with("<!doctype html") || trimmed.starts_with("<html"),
                    "HTML fixture {} should start with an HTML document root",
                    fixture.id
                );
                assert_eq!(
                    content.matches("<link").count(),
                    fixture.article_count,
                    "HTML fixture {} should expose the declared number of discoverable link elements",
                    fixture.id
                );
            }
            other => panic!("unsupported fixture format {other}"),
        }

        match fixture.expected_outcome.as_str() {
            "parsed-feed" | "feed-discovery" => {
                assert!(
                    fixture.expected_error_kind.is_none(),
                    "fixture {} should not declare an error kind for successful outcome {}",
                    fixture.id,
                    fixture.expected_outcome
                );
                assert!(
                    fixture.expected_message_fragment.is_none(),
                    "fixture {} should not declare an error fragment for successful outcome {}",
                    fixture.id,
                    fixture.expected_outcome
                );
            }
            "parse-error" => {
                assert_eq!(
                    fixture.expected_error_kind.as_deref(),
                    Some("parse"),
                    "fixture {} should declare the expected parse error kind",
                    fixture.id
                );
                assert!(
                    fixture
                        .expected_message_fragment
                        .as_deref()
                        .is_some_and(|fragment| !fragment.trim().is_empty()),
                    "fixture {} should declare a non-empty parse error message fragment",
                    fixture.id
                );
            }
            other => panic!(
                "fixture {} has unsupported expected outcome {other}",
                fixture.id
            ),
        }

        for marker in fixture.markers {
            assert!(
                content.contains(&marker),
                "fixture {} should retain marker {:?}",
                fixture.id,
                marker
            );
        }
    }
}

#[test]
fn fixture_catalog_uses_unique_ids_and_relative_paths() {
    let manifest = load_manifest();
    let mut seen_ids = BTreeSet::new();
    let mut seen_paths = BTreeSet::new();

    for fixture in manifest.fixtures {
        assert!(
            seen_ids.insert(fixture.id.clone()),
            "fixture id {} should be unique",
            fixture.id
        );
        assert!(
            seen_paths.insert(fixture.path.clone()),
            "fixture path {} should be unique",
            fixture.path
        );

        let path = Path::new(&fixture.path);
        assert!(
            !path.is_absolute(),
            "fixture path {} should stay relative",
            fixture.path
        );
        assert!(
            !fixture.path.contains(".."),
            "fixture path {} should not escape the fixture root",
            fixture.path
        );
    }
}

fn load_manifest() -> FixtureManifest {
    let manifest_path = fixture_file_path("manifest.json");
    let content = fs::read_to_string(&manifest_path).unwrap_or_else(|error| {
        panic!(
            "fixture manifest should be readable at {}: {error}",
            manifest_path.display()
        )
    });

    serde_json::from_str(&content).unwrap_or_else(|error| {
        panic!(
            "fixture manifest should be valid JSON at {}: {error}",
            manifest_path.display()
        )
    })
}

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
}

fn fixture_file_path(relative_path: &str) -> PathBuf {
    fixtures_root().join(relative_path)
}

//! Performance baseline thresholds for FreelyRSS stability testing.

pub const LARGE_LIBRARY_FEED_COUNT: usize = 100;
pub const LARGE_LIBRARY_ARTICLE_COUNT: usize = 10_000;
pub const QUEUE_WINDOW_ARTICLE_COUNT: usize = 120;
pub const BULK_UPDATE_ARTICLE_COUNT: usize = 1_000;
pub const CONTENT_EXTRACTION_DOCUMENT_COUNT: usize = 25;

pub const STARTUP_BUDGET_MS: u128 = 1_500;
pub const QUEUE_WINDOW_BUDGET_MS: u128 = 500;
pub const SEARCH_BUDGET_MS: u128 = 500;
pub const BULK_UPDATE_BUDGET_MS: u128 = 2_000;
pub const CONTENT_EXTRACTION_BUDGET_MS: u128 = 1_500;
pub const COLD_FETCH_100_FEEDS_BUDGET_MS: u128 = 30_000;
pub const LARGE_LIBRARY_PAYLOAD_BUDGET_BYTES: u128 = 64 * 1024 * 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BaselineUnit {
    Milliseconds,
    Bytes,
}

impl BaselineUnit {
    const fn label(self) -> &'static str {
        match self {
            Self::Milliseconds => "ms",
            Self::Bytes => "bytes",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BaselineObservation {
    pub name: &'static str,
    pub measured: u128,
    pub budget: u128,
    pub unit: BaselineUnit,
    pub sample_count: usize,
}

impl BaselineObservation {
    pub const fn milliseconds(
        name: &'static str,
        measured: u128,
        budget: u128,
        sample_count: usize,
    ) -> Self {
        Self {
            name,
            measured,
            budget,
            unit: BaselineUnit::Milliseconds,
            sample_count,
        }
    }

    pub const fn bytes(
        name: &'static str,
        measured: u128,
        budget: u128,
        sample_count: usize,
    ) -> Self {
        Self {
            name,
            measured,
            budget,
            unit: BaselineUnit::Bytes,
            sample_count,
        }
    }

    pub fn assert_within_budget(&self) {
        assert!(
            self.measured <= self.budget,
            "{} measured {} {} for {} samples, above budget {} {}",
            self.name,
            self.measured,
            self.unit.label(),
            self.sample_count,
            self.budget,
            self.unit.label()
        );
    }

    pub fn summary(&self) -> String {
        format!(
            "{}={}{} budget={}{} samples={}",
            self.name,
            self.measured,
            self.unit.label(),
            self.budget,
            self.unit.label(),
            self.sample_count
        )
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetryPolicy {
    pub max_attempts: u32,
}

impl RetryPolicy {
    pub const fn new(max_attempts: u32) -> Self {
        Self { max_attempts }
    }
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self { max_attempts: 3 }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RetryState {
    pub attempts: u32,
    pub last_error: Option<String>,
    pub exhausted: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RetryDisposition {
    Retry { attempt: u32, remaining: u32 },
    Exhausted { attempts: u32 },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetryFailureReport {
    pub state: RetryState,
    pub disposition: RetryDisposition,
}

pub fn record_sync_failure(
    policy: &RetryPolicy,
    current_state: &RetryState,
    error: impl Into<String>,
) -> RetryFailureReport {
    let attempts = current_state.attempts.saturating_add(1);
    let exhausted = attempts >= policy.max_attempts;
    let state = RetryState {
        attempts,
        last_error: Some(error.into()),
        exhausted,
    };
    let disposition = if exhausted {
        RetryDisposition::Exhausted { attempts }
    } else {
        RetryDisposition::Retry {
            attempt: attempts,
            remaining: policy.max_attempts - attempts,
        }
    };

    RetryFailureReport { state, disposition }
}

pub fn record_sync_success() -> RetryState {
    RetryState::default()
}

#[cfg(test)]
mod tests {
    use super::{
        RetryDisposition, RetryPolicy, RetryState, record_sync_failure, record_sync_success,
    };

    #[test]
    fn retry_state_records_failures_until_exhausted() {
        let policy = RetryPolicy::new(3);
        let first = record_sync_failure(&policy, &RetryState::default(), "network timeout");

        assert_eq!(
            first.disposition,
            RetryDisposition::Retry {
                attempt: 1,
                remaining: 2
            }
        );
        assert_eq!(first.state.last_error.as_deref(), Some("network timeout"));
        assert!(!first.state.exhausted);

        let second = record_sync_failure(&policy, &first.state, "network timeout");
        let third = record_sync_failure(&policy, &second.state, "network timeout");

        assert_eq!(
            third.disposition,
            RetryDisposition::Exhausted { attempts: 3 }
        );
        assert!(third.state.exhausted);
    }

    #[test]
    fn successful_sync_resets_retry_state() {
        assert_eq!(record_sync_success(), RetryState::default());
    }
}

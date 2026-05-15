use std::time::Duration;

use crate::AiAdapterError;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AiExecutionPolicy {
    pub timeout: Duration,
    pub retry: AiRetryPolicy,
}

impl AiExecutionPolicy {
    pub fn validate(self) -> Result<(), AiAdapterError> {
        if self.timeout.is_zero() {
            return Err(AiAdapterError::InvalidExecutionPolicy {
                reason: "timeout must be greater than zero",
            });
        }

        self.retry.validate()
    }
}

impl Default for AiExecutionPolicy {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(30),
            retry: AiRetryPolicy::disabled(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AiRetryPolicy {
    pub max_attempts: u8,
    pub retry_delay: Duration,
}

impl AiRetryPolicy {
    pub const fn disabled() -> Self {
        Self {
            max_attempts: 1,
            retry_delay: Duration::ZERO,
        }
    }

    pub const fn fixed(max_attempts: u8, retry_delay: Duration) -> Self {
        Self {
            max_attempts,
            retry_delay,
        }
    }

    pub fn validate(self) -> Result<(), AiAdapterError> {
        if self.max_attempts == 0 {
            return Err(AiAdapterError::InvalidExecutionPolicy {
                reason: "retry max attempts must be at least one",
            });
        }

        if self.max_attempts > 1 && self.retry_delay.is_zero() {
            return Err(AiAdapterError::InvalidExecutionPolicy {
                reason: "retry delay must be greater than zero when retries are enabled",
            });
        }

        Ok(())
    }

    pub fn next_delay_after_failure(self, failed_attempt: u8) -> Option<Duration> {
        if failed_attempt == 0 || failed_attempt >= self.max_attempts {
            None
        } else {
            Some(self.retry_delay)
        }
    }
}

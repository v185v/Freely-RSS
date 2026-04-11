use std::fmt;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::ModelError;

macro_rules! text_value {
    ($name:ident) => {
        #[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Result<Self, ModelError> {
                let value = value.into();

                if value.trim().is_empty() {
                    return Err(ModelError::EmptyValue {
                        kind: stringify!($name),
                    });
                }

                Ok(Self(value))
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }

            pub fn into_inner(self) -> String {
                self.0
            }
        }

        impl TryFrom<String> for $name {
            type Error = ModelError;

            fn try_from(value: String) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        impl TryFrom<&str> for $name {
            type Error = ModelError;

            fn try_from(value: &str) -> Result<Self, Self::Error> {
                Self::new(value)
            }
        }

        impl AsRef<str> for $name {
            fn as_ref(&self) -> &str {
                self.as_str()
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                self.0.fmt(f)
            }
        }

        impl From<$name> for String {
            fn from(value: $name) -> Self {
                value.0
            }
        }
    };
}

text_value!(IsoDateTime);
text_value!(UrlString);
text_value!(LanguageCode);
text_value!(HexColor);
text_value!(CachePath);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct JsonBlob(Value);

impl JsonBlob {
    pub fn new(value: Value) -> Self {
        Self(value)
    }

    pub fn parse(field: &'static str, value: &str) -> Result<Self, ModelError> {
        serde_json::from_str(value)
            .map(Self)
            .map_err(|source| ModelError::InvalidJson { field, source })
    }

    pub fn as_value(&self) -> &Value {
        &self.0
    }

    pub fn to_compact_string(&self) -> String {
        self.0.to_string()
    }

    pub fn into_inner(self) -> Value {
        self.0
    }
}

impl From<Value> for JsonBlob {
    fn from(value: Value) -> Self {
        Self::new(value)
    }
}

impl From<JsonBlob> for Value {
    fn from(value: JsonBlob) -> Self {
        value.0
    }
}

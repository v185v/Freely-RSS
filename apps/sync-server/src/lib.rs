//! Minimal remote synchronization API for FreelyRSS.
//!
//! The service boundary is intentionally smaller than the desktop SQLite schema:
//! it stores account/device metadata, encrypted sync event envelopes, and
//! encrypted blob indexes only.

mod error;
mod model;
mod routes;
mod state;

use axum::Router;

pub use state::SyncServerState;

pub fn app(state: SyncServerState) -> Router {
    routes::router(state)
}

use std::collections::HashMap;

use axum::http::{Method, StatusCode};
use uuid::Uuid;

use crate::models::{Class, Course, UserProfile};
use crate::types::{AppState, ErrorResponse};
use axum::Json;

pub struct EnrichCache {
    courses: HashMap<Uuid, Course>,
    classes: HashMap<Uuid, Class>,
    users: HashMap<Uuid, String>,
}

impl EnrichCache {
    pub fn new() -> Self {
        Self {
            courses: HashMap::new(),
            classes: HashMap::new(),
            users: HashMap::new(),
        }
    }

    pub async fn course_name(
        &mut self,
        state: &AppState,
        id: Uuid,
    ) -> Result<Option<String>, (StatusCode, Json<ErrorResponse>)> {
        if let Some(c) = self.courses.get(&id) {
            return Ok(Some(c.name.clone()));
        }
        let r = state
            .client
            .request(Method::GET, format!("{}/course/{}", state.data_source_url, id))
            .send()
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "enrichment service unavailable".into(),
                    }),
                )
            })?;
        if r.status() != StatusCode::OK {
            return Ok(None);
        }
        let c: Course = r.json().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "failed to parse course".into(),
                }),
            )
        })?;
        let name = c.name.clone();
        self.courses.insert(id, c);
        Ok(Some(name))
    }

    pub async fn course_row(
        &mut self,
        state: &AppState,
        id: Uuid,
    ) -> Result<(Option<String>, Option<String>), (StatusCode, Json<ErrorResponse>)> {
        if let Some(c) = self.courses.get(&id) {
            return Ok((Some(c.course_id.clone()), Some(c.name.clone())));
        }
        let r = state
            .client
            .request(Method::GET, format!("{}/course/{}", state.data_source_url, id))
            .send()
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "enrichment service unavailable".into(),
                    }),
                )
            })?;
        if r.status() != StatusCode::OK {
            return Ok((None, None));
        }
        let c: Course = r.json().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "failed to parse course".into(),
                }),
            )
        })?;
        let code = c.course_id.clone();
        let name = c.name.clone();
        self.courses.insert(id, c);
        Ok((Some(code), Some(name)))
    }

    pub async fn class_year(
        &mut self,
        state: &AppState,
        id: Uuid,
    ) -> Result<Option<i32>, (StatusCode, Json<ErrorResponse>)> {
        if let Some(cl) = self.classes.get(&id) {
            return Ok(Some(cl.year));
        }
        let r = state
            .client
            .request(Method::GET, format!("{}/class/{}", state.data_source_url, id))
            .send()
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "enrichment service unavailable".into(),
                    }),
                )
            })?;
        if r.status() != StatusCode::OK {
            return Ok(None);
        }
        let cl: Class = r.json().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "failed to parse class".into(),
                }),
            )
        })?;
        let y = cl.year;
        self.classes.insert(id, cl);
        Ok(Some(y))
    }

    pub async fn class_label(
        &mut self,
        state: &AppState,
        id: Uuid,
    ) -> Result<Option<String>, (StatusCode, Json<ErrorResponse>)> {
        if let Some(cl) = self.classes.get(&id) {
            return Ok(Some(format!("Year {} · Sec {}", cl.year, cl.section)));
        }
        let r = state
            .client
            .request(Method::GET, format!("{}/class/{}", state.data_source_url, id))
            .send()
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "enrichment service unavailable".into(),
                    }),
                )
            })?;
        if r.status() != StatusCode::OK {
            return Ok(None);
        }
        let cl: Class = r.json().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "failed to parse class".into(),
                }),
            )
        })?;
        let label = format!("Year {} · Sec {}", cl.year, cl.section);
        self.classes.insert(id, cl);
        Ok(Some(label))
    }

    pub async fn user_display_name(
        &mut self,
        state: &AppState,
        id: Uuid,
    ) -> Result<Option<String>, (StatusCode, Json<ErrorResponse>)> {
        if let Some(n) = self.users.get(&id) {
            return Ok(Some(n.clone()));
        }
        let r = state
            .client
            .request(Method::GET, format!("{}/user/{}", state.data_source_url, id))
            .send()
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "enrichment service unavailable".into(),
                    }),
                )
            })?;
        if r.status() != StatusCode::OK {
            return Ok(None);
        }
        let u: UserProfile = r.json().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "failed to parse user".into(),
                }),
            )
        })?;
        let name = format!(
            "{} {}",
            u.first_name,
            u.last_name.unwrap_or_default()
        )
        .trim()
        .to_string();
        self.users.insert(id, name.clone());
        Ok(Some(name))
    }
}

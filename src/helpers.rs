use axum::{http::StatusCode, Json};
use crate::types::ErrorResponse;

pub fn internal_error<E>(err: E) -> (StatusCode, Json<ErrorResponse>)
where
    E: std::error::Error,
{
    log::error!("Error: {}", err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            message: "internal server error".to_string(),
        }),
    )
}

/// Fetch course + class details from the data-source service and build a
/// human-readable context line suitable for notification messages.
///
/// Example output: `"Computer Science 101 — Year 2, Section A"`
///
/// Falls back gracefully ("Your course") if either service call fails so that
/// the notification is still delivered.
pub async fn course_context(
    client: &reqwest::Client,
    course_id: uuid::Uuid,
    class_id: uuid::Uuid,
) -> String {
    let course_name = async {
        let r = client
            .get(format!("http://127.0.0.1:3000/course/{}", course_id))
            .send()
            .await
            .ok()?;
        if !r.status().is_success() {
            return None;
        }
        r.json::<crate::models::Course>().await.ok().map(|c| c.name)
    }
    .await
    .unwrap_or_else(|| "Your course".to_string());

    let class_label = async {
        let r = client
            .get(format!("http://127.0.0.1:3000/class/{}", class_id))
            .send()
            .await
            .ok()?;
        if !r.status().is_success() {
            return None;
        }
        r.json::<crate::models::Class>()
            .await
            .ok()
            .map(|c| format!("Year {}, Section {}", c.year, c.section))
    }
    .await
    .unwrap_or_default();

    if class_label.is_empty() {
        course_name
    } else {
        format!("{} — {}", course_name, class_label)
    }
}

/// Insert a single notification row into the DB.
///
/// Errors are logged but **never** propagated — a failed notification must
/// never block or roll back the primary operation.
pub async fn fire_notification(
    pool: &crate::types::Pool,
    user_id: uuid::Uuid,
    title: impl Into<String>,
    message: impl Into<String>,
    notification_type: impl Into<String>,
    action_url: Option<String>,
) {
    use diesel_async::RunQueryDsl;

    let notif = crate::models::NewNotification {
        user_id,
        title: title.into(),
        message: message.into(),
        notification_type: notification_type.into(),
        action_url,
    };

    match pool.get().await {
        Ok(mut conn) => {
            if let Err(e) = diesel::insert_into(crate::schema::notifications::table)
                .values(&notif)
                .execute(&mut conn)
                .await
            {
                log::warn!("notification insert failed for user {}: {}", user_id, e);
            }
        }
        Err(e) => log::warn!("notification: DB pool exhausted for user {}: {}", user_id, e),
    }
}

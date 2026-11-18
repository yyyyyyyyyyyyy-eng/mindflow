// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// 示例命令：前端通过 window.__TAURI__.core.invoke("ping") 调用
#[tauri::command]
fn ping() -> String {
    "pong".into()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

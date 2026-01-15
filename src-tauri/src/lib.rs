use base64::{engine::general_purpose::STANDARD, Engine};
use futures_util::{SinkExt, StreamExt};
use image::codecs::jpeg::JpegEncoder;
use screenshots::Screen;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, connect_async, tungstenite::Message};

static IS_SHARING: AtomicBool = AtomicBool::new(false);
static IS_CONNECTED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Serialize, Deserialize)]
struct ScreenFrame {
    data: String, // base64 encoded JPEG
    width: u32,
    height: u32,
}

fn capture_screen() -> Option<ScreenFrame> {
    let screens = Screen::all().ok()?;
    let screen = screens.first()?;
    let image = screen.capture().ok()?;
    
    let width = image.width();
    let height = image.height();
    
    // Convert to JPEG with quality 50 for better performance
    let mut jpeg_data = Cursor::new(Vec::new());
    let encoder = JpegEncoder::new_with_quality(&mut jpeg_data, 50);
    
    image::DynamicImage::ImageRgba8(
        image::RgbaImage::from_raw(width, height, image.into_raw())?
    )
    .write_with_encoder(encoder)
    .ok()?;
    
    let base64_data = STANDARD.encode(jpeg_data.into_inner());
    
    Some(ScreenFrame {
        data: base64_data,
        width,
        height,
    })
}

#[tauri::command]
fn get_local_ip() -> Result<String, String> {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn is_sharing() -> bool {
    IS_SHARING.load(Ordering::SeqCst)
}

#[tauri::command]
fn is_connected() -> bool {
    IS_CONNECTED.load(Ordering::SeqCst)
}


#[tauri::command]
async fn start_teacher_server(app: tauri::AppHandle, port: u16, fps: u32) -> Result<String, String> {
    if IS_SHARING.load(Ordering::SeqCst) {
        return Err("Already sharing".to_string());
    }
    
    let addr = format!("0.0.0.0:{}", port);
    println!("[Teacher] Binding to {}", addr);
    
    let listener = TcpListener::bind(&addr).await.map_err(|e| {
        println!("[Teacher] Failed to bind: {}", e);
        e.to_string()
    })?;
    
    println!("[Teacher] Server started on port {}", port);
    
    IS_SHARING.store(true, Ordering::SeqCst);
    
    let (tx, _) = broadcast::channel::<String>(16);
    let tx_clone = tx.clone();
    
    // Screen capture task
    let app_clone = app.clone();
    tokio::spawn(async move {
        let frame_delay = std::time::Duration::from_millis(1000 / fps as u64);
        
        while IS_SHARING.load(Ordering::SeqCst) {
            if let Some(frame) = capture_screen() {
                if let Ok(json) = serde_json::to_string(&frame) {
                    let _ = tx_clone.send(json);
                }
            }
            tokio::time::sleep(frame_delay).await;
        }
        let _ = app_clone.emit("sharing-stopped", ());
    });
    
    // Connection handler task
    tokio::spawn(async move {
        println!("[Teacher] Waiting for connections...");
        while IS_SHARING.load(Ordering::SeqCst) {
            if let Ok((stream, addr)) = listener.accept().await {
                println!("[Teacher] Client connected: {}", addr);
                let _ = app.emit("client-connected", addr.to_string());
                let mut rx = tx.subscribe();
                
                tokio::spawn(async move {
                    if let Ok(ws_stream) = accept_async(stream).await {
                        let (mut write, _) = ws_stream.split();
                        
                        while IS_SHARING.load(Ordering::SeqCst) {
                            if let Ok(msg) = rx.recv().await {
                                if write.send(Message::Text(msg)).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        }
    });
    
    let ip = get_local_ip().unwrap_or_else(|_| "unknown".to_string());
    Ok(format!("{}:{}", ip, port))
}

#[tauri::command]
fn stop_teacher_server() {
    IS_SHARING.store(false, Ordering::SeqCst);
}

#[tauri::command]
async fn connect_to_teacher(app: tauri::AppHandle, address: String) -> Result<(), String> {
    if IS_CONNECTED.load(Ordering::SeqCst) {
        return Err("Already connected".to_string());
    }
    
    let url = format!("ws://{}", address);
    println!("[Student] Connecting to {}", url);
    
    let (ws_stream, _) = connect_async(&url).await.map_err(|e| {
        println!("[Student] Connection failed: {}", e);
        format!("Không thể kết nối đến {}: {}", address, e)
    })?;
    
    println!("[Student] Connected successfully!");
    
    IS_CONNECTED.store(true, Ordering::SeqCst);
    let _ = app.emit("connection-status", "connected");
    
    let (_, mut read) = ws_stream.split();
    
    tokio::spawn(async move {
        while IS_CONNECTED.load(Ordering::SeqCst) {
            match read.next().await {
                Some(Ok(Message::Text(text))) => {
                    if let Ok(frame) = serde_json::from_str::<ScreenFrame>(&text) {
                        let _ = app.emit("screen-frame", frame);
                    }
                }
                Some(Err(_)) | None => {
                    break;
                }
                _ => {}
            }
        }
        IS_CONNECTED.store(false, Ordering::SeqCst);
        let _ = app.emit("connection-status", "disconnected");
    });
    
    Ok(())
}

#[tauri::command]
fn disconnect_from_teacher() {
    IS_CONNECTED.store(false, Ordering::SeqCst);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_local_ip,
            is_sharing,
            is_connected,
            start_teacher_server,
            stop_teacher_server,
            connect_to_teacher,
            disconnect_from_teacher,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

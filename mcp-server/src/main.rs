mod bridge;
mod tools;

use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use tokio::sync::mpsc;

struct AppConnection {
    tx: mpsc::Sender<String>,
    rx: mpsc::Receiver<String>,
}

fn make_response(id: Value, result: Value) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    })
}

fn make_error(id: Value, code: i64, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": {
            "code": code,
            "message": message
        }
    })
}

#[tokio::main]
async fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();

    let mut app_connection: Option<AppConnection> = None;

    // Try to connect to the app on startup
    match bridge::connect_to_app(9876).await {
        Ok((tx, rx)) => {
            app_connection = Some(AppConnection { tx, rx });
            eprintln!("Connected to MockupStudio app on port 9876");
        }
        Err(e) => {
            eprintln!("Warning: Could not connect to MockupStudio app: {}", e);
            eprintln!("tools/call requests will return errors until the app is running.");
        }
    }

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                let err = make_error(Value::Null, -32700, &format!("Parse error: {}", e));
                let mut out = stdout.lock();
                let _ = writeln!(out, "{}", err);
                let _ = out.flush();
                continue;
            }
        };

        let method = request.get("method").and_then(|m| m.as_str()).unwrap_or("");
        let id = request.get("id").cloned().unwrap_or(Value::Null);

        // Notifications (no id) don't need a response
        if method == "notifications/initialized" {
            continue;
        }

        let response = match method {
            "initialize" => {
                make_response(id, json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "mockup-studio-mcp",
                        "version": "0.1.0"
                    }
                }))
            }
            "tools/list" => {
                let tools_result = tools::list_tools();
                make_response(id, tools_result)
            }
            "tools/call" => {
                let params = request.get("params").cloned().unwrap_or(json!({}));
                let tool_name = params.get("name").and_then(|n| n.as_str()).unwrap_or("unknown");
                let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

                match &mut app_connection {
                    Some(conn) => {
                        let call_msg = json!({
                            "type": "tool_call",
                            "tool": tool_name,
                            "arguments": arguments
                        });

                        if let Err(e) = conn.tx.send(call_msg.to_string()).await {
                            make_error(id, -32603, &format!("Failed to send to app: {}", e))
                        } else {
                            // Wait for response from app with a timeout
                            match tokio::time::timeout(
                                std::time::Duration::from_secs(30),
                                conn.rx.recv()
                            ).await {
                                Ok(Some(response_str)) => {
                                    let result: Value = serde_json::from_str(&response_str)
                                        .unwrap_or(json!({ "content": [{ "type": "text", "text": response_str }] }));
                                    make_response(id, result)
                                }
                                Ok(None) => {
                                    make_error(id, -32603, "App connection closed")
                                }
                                Err(_) => {
                                    make_error(id, -32603, "Timeout waiting for app response")
                                }
                            }
                        }
                    }
                    None => {
                        make_error(id, -32603, "Not connected to MockupStudio app. Please start the app first.")
                    }
                }
            }
            _ => {
                make_error(id, -32601, &format!("Method not found: {}", method))
            }
        };

        let mut out = stdout.lock();
        let _ = writeln!(out, "{}", response);
        let _ = out.flush();
    }
}

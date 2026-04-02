use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{StreamExt, SinkExt};

pub async fn connect_to_app(port: u16) -> Result<(mpsc::Sender<String>, mpsc::Receiver<String>), String> {
    let url = format!("ws://127.0.0.1:{}", port);
    let (ws_stream, _) = connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect to {}: {}", url, e))?;

    let (mut ws_write, mut ws_read) = ws_stream.split();

    // Channel for sending messages TO the app
    let (send_tx, mut send_rx) = mpsc::channel::<String>(100);
    // Channel for receiving messages FROM the app
    let (recv_tx, recv_rx) = mpsc::channel::<String>(100);

    // Write task: forward messages from send channel to WebSocket
    tokio::spawn(async move {
        while let Some(msg) = send_rx.recv().await {
            if ws_write.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Read task: forward messages from WebSocket to receive channel
    tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_read.next().await {
            if let Message::Text(text) = msg {
                if recv_tx.send(text.to_string()).await.is_err() {
                    break;
                }
            }
        }
    });

    Ok((send_tx, recv_rx))
}

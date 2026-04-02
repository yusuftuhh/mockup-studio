use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{StreamExt, SinkExt};

pub type WsSender = broadcast::Sender<String>;

pub async fn start_ws_server(port: u16) -> WsSender {
    let (tx, _) = broadcast::channel::<String>(100);
    let tx_clone = tx.clone();

    tokio::spawn(async move {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .expect("Failed to bind WebSocket server");

        println!("MockupStudio WS server listening on port {}", port);

        while let Ok((stream, _)) = listener.accept().await {
            let tx = tx_clone.clone();
            let mut rx = tx_clone.subscribe();

            tokio::spawn(async move {
                if let Ok(ws_stream) = accept_async(stream).await {
                    let (mut write, mut read) = ws_stream.split();

                    let tx2 = tx.clone();
                    let read_task = tokio::spawn(async move {
                        while let Some(Ok(msg)) = read.next().await {
                            if let Message::Text(text) = msg {
                                let _ = tx2.send(text.to_string());
                            }
                        }
                    });

                    let write_task = tokio::spawn(async move {
                        while let Ok(msg) = rx.recv().await {
                            if write.send(Message::Text(msg.into())).await.is_err() {
                                break;
                            }
                        }
                    });

                    let _ = tokio::join!(read_task, write_task);
                }
            });
        }
    });

    tx
}

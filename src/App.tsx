import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

type Mode = "select" | "teacher" | "student";

interface ScreenFrame {
  data: number[]; // JPEG bytes array
  width: number;
  height: number;
}

function App() {
  const [mode, setMode] = useState<Mode>("select");
  const [localIp, setLocalIp] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [teacherAddress, setTeacherAddress] = useState("");
  const [port, setPort] = useState("9000");
  const [fps, setFps] = useState("10");
  const [connectedClients, setConnectedClients] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRenderingRef = useRef(false);
  const frameQueueRef = useRef<ScreenFrame[]>([]);

  useEffect(() => {
    invoke<string>("get_local_ip").then(setLocalIp).catch(console.error);
  }, []);

  useEffect(() => {
    const renderFrame = async (frame: ScreenFrame) => {
      if (isRenderingRef.current) {
        // Skip if already rendering, keep only latest frame
        frameQueueRef.current = [frame];
        return;
      }

      isRenderingRef.current = true;
      const canvas = canvasRef.current;
      if (!canvas) {
        isRenderingRef.current = false;
        return;
      }

      try {
        const ctx = canvas.getContext("2d", { 
          alpha: false,
          desynchronized: true 
        });
        if (!ctx) return;

        // Convert number array to Uint8Array
        const bytes = new Uint8Array(frame.data);
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        
        // Create ImageBitmap directly from blob (async decode)
        const bitmap = await createImageBitmap(blob);
        
        // Resize canvas only if needed
        if (canvas.width !== frame.width || canvas.height !== frame.height) {
          canvas.width = frame.width;
          canvas.height = frame.height;
        }
        
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      } catch (e) {
        console.error("Render error:", e);
      } finally {
        isRenderingRef.current = false;
        
        // Process next frame if queued
        const nextFrame = frameQueueRef.current.pop();
        if (nextFrame) {
          frameQueueRef.current = [];
          renderFrame(nextFrame);
        }
      }
    };

    const unlistenFrame = listen<ScreenFrame>("screen-frame", (event) => {
      renderFrame(event.payload);
    });

    const unlistenStatus = listen<string>("connection-status", (event) => {
      setIsConnected(event.payload === "connected");
      setStatus(event.payload === "connected" ? "Đã kết nối" : "Đã ngắt kết nối");
    });

    const unlistenClient = listen<string>("client-connected", (event) => {
      setConnectedClients((prev) => [...prev, event.payload]);
    });

    const unlistenStopped = listen("sharing-stopped", () => {
      setIsSharing(false);
      setStatus("Đã dừng chia sẻ");
    });

    return () => {
      unlistenFrame.then((f) => f());
      unlistenStatus.then((f) => f());
      unlistenClient.then((f) => f());
      unlistenStopped.then((f) => f());
    };
  }, []);

  const startSharing = async () => {
    try {
      const address = await invoke<string>("start_teacher_server", {
        port: parseInt(port),
        fps: parseInt(fps),
      });
      setIsSharing(true);
      setStatus(`Đang chia sẻ tại ${address}`);
    } catch (e) {
      setStatus(`Lỗi: ${e}`);
    }
  };

  const stopSharing = async () => {
    await invoke("stop_teacher_server");
    setIsSharing(false);
    setConnectedClients([]);
    setStatus("Đã dừng chia sẻ");
  };

  const connectToTeacher = async () => {
    try {
      setStatus("Đang kết nối...");
      await invoke("connect_to_teacher", { address: teacherAddress });
    } catch (e) {
      setStatus(`Lỗi kết nối: ${e}`);
    }
  };

  const disconnect = async () => {
    await invoke("disconnect_from_teacher");
    setIsConnected(false);
    setStatus("Đã ngắt kết nối");
  };

  if (mode === "select") {
    return (
      <main className="container">
        <h1>🖥️ Screen Sharing LAN</h1>
        <p className="subtitle">Chia sẻ màn hình qua mạng LAN</p>
        <div className="mode-select">
          <button className="mode-btn teacher" onClick={() => setMode("teacher")}>
            👨‍🏫 Giáo viên
            <span>Chia sẻ màn hình</span>
          </button>
          <button className="mode-btn student" onClick={() => setMode("student")}>
            👨‍🎓 Học sinh
            <span>Xem màn hình</span>
          </button>
        </div>
        <p className="ip-info">IP của bạn: <strong>{localIp || "Đang tải..."}</strong></p>
      </main>
    );
  }


  if (mode === "teacher") {
    return (
      <main className="container">
        <button className="back-btn" onClick={() => setMode("select")}>← Quay lại</button>
        <h1>👨‍🏫 Chế độ Giáo viên</h1>
        
        <div className="settings">
          <div className="setting-row">
            <label>Port:</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isSharing}
            />
          </div>
          <div className="setting-row">
            <label>FPS:</label>
            <input
              type="number"
              value={fps}
              onChange={(e) => setFps(e.target.value)}
              disabled={isSharing}
              min="1"
              max="30"
            />
            <span style={{fontSize: '0.85rem', color: '#888', marginLeft: '0.5rem'}}>
              (Khuyến nghị: 8-12)
            </span>
          </div>
        </div>

        <div className="controls">
          {!isSharing ? (
            <button className="start-btn" onClick={startSharing}>
              ▶️ Bắt đầu chia sẻ
            </button>
          ) : (
            <button className="stop-btn" onClick={stopSharing}>
              ⏹️ Dừng chia sẻ
            </button>
          )}
        </div>

        <div className="info-box">
          <p><strong>IP:</strong> {localIp}</p>
          <p><strong>Địa chỉ kết nối:</strong> {localIp}:{port}</p>
          <p><strong>Trạng thái:</strong> {status || (isSharing ? "Đang chia sẻ" : "Chưa chia sẻ")}</p>
        </div>

        {connectedClients.length > 0 && (
          <div className="clients-box">
            <h3>Học sinh đã kết nối ({connectedClients.length}):</h3>
            <ul>
              {connectedClients.map((client, i) => (
                <li key={i}>{client}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    );
  }

  // Student mode
  return (
    <main className="container student-view">
      <div className="header-bar">
        <button className="back-btn" onClick={() => setMode("select")}>← Quay lại</button>
        <h2>👨‍🎓 Chế độ Học sinh</h2>
      </div>

      {!isConnected ? (
        <div className="connect-form">
          <div className="setting-row">
            <label>Địa chỉ giáo viên:</label>
            <input
              type="text"
              value={teacherAddress}
              onChange={(e) => setTeacherAddress(e.target.value)}
              placeholder="192.168.1.100:9000"
            />
          </div>
          <button className="connect-btn" onClick={connectToTeacher}>
            🔗 Kết nối
          </button>
          <p className="status">{status}</p>
        </div>
      ) : (
        <div className="screen-view">
          <div className="toolbar">
            <span className="connected-badge">🟢 Đã kết nối: {teacherAddress}</span>
            <button className="disconnect-btn" onClick={disconnect}>
              Ngắt kết nối
            </button>
          </div>
          <canvas ref={canvasRef} className="screen-canvas" />
        </div>
      )}
    </main>
  );
}

export default App;

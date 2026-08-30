# YouTube Music Desktop Client

A modern, ultra-lightweight desktop client for **YouTube Music** (`music.youtube.com`) built with **Tauri v2** and **Rust**, leveraging Windows native **Microsoft Edge WebView2**.

---

## ⚡ Features

- **Blazing Fast & Low Memory**: Built with Rust & native WebView2 (~40–60 MB RAM vs 500+ MB on Electron).
- **System Tray Integration**: Minimize to tray on close to keep audio playing seamlessly in the background.
- **Persistent Session**: Keeps your Google login and preferences across app restarts.
- **Optimized Release Binary**: Configured with LTO, abort panics, symbol stripping, and size optimization (`opt-level = "z"`).

---

## 🚀 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (`cargo`)
- [Node.js](https://nodejs.org/) (optional, for Tauri CLI scripts)

### Running in Development
Double-click [`run.bat`](file:///d:/Projects/yt-music/run.bat) or run:

```powershell
cd src-tauri
cargo run
```
*(or `npm run dev` from the project root)*

### Building Production Release
```powershell
cd src-tauri
cargo build --release
```
*(or `npm run build` from the project root to create the installer package)*

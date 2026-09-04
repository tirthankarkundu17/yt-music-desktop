# 🎵 YouTube Music Desktop Client

<p align="center">
  <a href="https://github.com/tirthankarkundu17/yt-music-desktop/actions/workflows/release.yml">
    <img src="https://github.com/tirthankarkundu17/yt-music-desktop/actions/workflows/release.yml/badge.svg" alt="CI / Release Build" />
  </a>
  <a href="https://github.com/tirthankarkundu17/yt-music-desktop/releases/latest">
    <img src="https://img.shields.io/github/v/release/tirthankarkundu17/yt-music-desktop?color=FF0000&logo=youtube&logoColor=white&label=Release" alt="Latest Release" />
  </a>
  <a href="https://github.com/tirthankarkundu17/yt-music-desktop/releases">
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-2ea44f?logo=github" alt="Supported Platforms" />
  </a>
  <a href="https://tauri.app/">
    <img src="https://img.shields.io/badge/Tauri-v2-24C8D8?logo=tauri&logoColor=white" alt="Tauri v2" />
  </a>
  <a href="https://www.rust-lang.org/">
    <img src="https://img.shields.io/badge/Rust-2021-DEA584?logo=rust&logoColor=white" alt="Rust" />
  </a>
  <a href="https://github.com/tirthankarkundu17/yt-music-desktop/stargazers">
    <img src="https://img.shields.io/github/stars/tirthankarkundu17/yt-music-desktop?style=flat&color=yellow&logo=github" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/tirthankarkundu17/yt-music-desktop/issues">
    <img src="https://img.shields.io/github/issues/tirthankarkundu17/yt-music-desktop?color=0088cc&logo=github" alt="Issues" />
  </a>
</p>

<p align="center">
  A modern, ultra-lightweight desktop client for <strong>YouTube Music</strong> (<code>music.youtube.com</code>) powered by <strong>Tauri v2</strong> and <strong>Rust</strong>, using native web engines for minimal resource usage.
</p>

---

## ⚡ Features

- **🚀 Blazing Fast & Ultra-Low Memory**: Built with Rust and native webview engines (~40–60 MB RAM vs 500+ MB on Electron).
- **🎧 System Tray Integration**: Minimizes cleanly to tray on close to keep playback uninterrupted in the background.
- **🔒 Persistent Login & Settings**: Saves your Google authentication state, playlists, and settings across sessions.
- **📦 Multi-Platform Support**: Ready for Windows (WebView2), macOS (WebKit), and Linux (WebKitGTK).
- **🛡️ Optimized Binary**: Built with LTO (Link-Time Optimization), symbol stripping, and size-optimized profile (`opt-level = "z"`).

---

## 📥 Downloads

Grab the latest prebuilt binaries from [Releases](https://github.com/tirthankarkundu17/yt-music-desktop/releases/latest):

| Platform | Formats / Installers |
| :--- | :--- |
| **Windows (x86_64 & ARM64)** | `.exe` (NSIS Installer), `.msi` (x86_64), standalone `.exe` |
| **macOS** | `.dmg`, `.app` (Universal Apple Silicon `arm64` & Intel `x86_64`) |
| **Linux (x86_64 & ARM64)** | `.AppImage`, `.deb` (Debian / Ubuntu), standalone executable |

---

## 🚀 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (`cargo` 1.77+)
- [Node.js](https://nodejs.org/) (optional, for Tauri CLI scripts)

### Running in Development
- **Windows**: Double-click [`run.bat`](file:///d:/Projects/yt-music/run.bat) or run `run.bat` in command prompt.
- **macOS / Linux**: Run `./run.sh` (or `bash run.sh`) in terminal.

Or manually:
```bash
cd src-tauri
cargo run
```
*(or `npm run dev` from the project root)*

### Building Production Release
```bash
cd src-tauri
cargo build --release
```
*(or `npm run build` from the project root to generate platform installers in `src-tauri/target/release/bundle`)*

---

## 📦 Automated Multi-Platform Releases (GitHub Actions)

A full CI/CD release workflow is configured in [`.github/workflows/release.yml`](.github/workflows/release.yml).

* **Manual Trigger**: Go to **Actions** → **Release & Build Artifacts** → **Run workflow**.
* **Automatic Tagged Release**: Push a version tag:
  ```bash
  git tag v0.1.0
  git push origin v0.1.0
  ```
The workflow will compile and draft a release with artifacts for Windows, Linux, and macOS.

---

## 📄 License

Distributed under the [MIT License](LICENSE).


<p align="center">
  <img src="build/icon.png" alt="Mermaid AI" width="128" height="128">
</p>

<h1 align="center">Mermaid AI</h1>

<p align="center">
  <strong>A beautiful desktop app for live-previewing Mermaid diagrams</strong>
</p>

<p align="center">
  <a href="https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest">
    <img src="https://img.shields.io/github/v/release/MerzoukeMansouri/mermaid-ai?style=flat-square&label=Download&color=blue" alt="Latest Release">
  </a>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#features">Features</a> •
  <a href="#download">Download</a>
</p>

---

## Installation

```bash
npm install
npm start
```

## Usage

1. **Select a directory** containing `.mmd` or `.mermaid` files
2. **Click any file** to preview the diagram
3. **Edit files** in your editor — changes update live

## Features

| Feature              | Description                    |
| -------------------- | ------------------------------ |
| 🔍 **Fuzzy Search**  | Find files instantly           |
| 👁️ **Live Preview**  | Real-time diagram updates      |
| 🔄 **File Watching** | Auto-reload on save            |
| 🎯 **Focus Mode**    | Distraction-free viewing (F11) |
| 🔎 **Zoom Controls** | Pan and zoom diagrams          |
| 🤖 **AI Editing**    | Edit diagrams with Ollama      |

## Download

Download the [latest release](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest) for your platform:

| Platform | Intel/AMD | Apple Silicon |
| -------- | --------- | ------------- |
| macOS    | [.dmg](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-x64.dmg) | [.dmg](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-arm64.dmg) |
| Windows  | [.exe](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-Setup.exe) | — |
| Linux    | [.AppImage](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-x64.AppImage) / [.deb](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-x64.deb) | [.AppImage](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-arm64.AppImage) / [.deb](https://github.com/MerzoukeMansouri/mermaid-ai/releases/latest/download/Mermaid.AI-arm64.deb) |

### macOS Installation

The app is not signed with an Apple Developer certificate. On first launch:

1. **Right-click** the app and select **Open**
2. Click **Open** in the dialog

Or run this command in Terminal:
```bash
xattr -cr /Applications/Mermaid\ AI.app
```

## License

MIT

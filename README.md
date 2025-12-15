# Mermaid Live Visualizer

A modern Electron application for viewing and live-previewing Mermaid diagrams with fuzzy search capabilities.

## Features

- **Directory Selection**: Choose any directory to scan for Mermaid files
- **Auto-detection**: Automatically finds `.mmd` and `.mermaid` files
- **Live Preview**: Real-time updates when files change - edit in your favorite editor and see changes instantly
- **Fuzzy Search**: Quick file finding with fuzzy search powered by Fuse.js
- **Dark Theme**: Modern dark interface optimized for diagram viewing
- **File Watching**: Automatic reload when files are modified externally

## Installation

```bash
# Install dependencies using pnpm
pnpm install

# If you encounter Electron installation issues, you may need to:
pnpm rebuild electron --config.ignore-scripts=false
# or manually install Electron's binary:
cd node_modules/.pnpm/electron@*/node_modules/electron && node install.js
```

## Usage

```bash
# Run the application
pnpm start

# Run in development mode (with DevTools)
pnpm run dev
```

### How to Use

1. **Launch the app** using `pnpm start`
2. **Click "Select Directory"** to choose a folder containing Mermaid files
3. **Browse files** in the sidebar - the app automatically finds all Mermaid files
4. **Use fuzzy search** to quickly find specific files by typing in the search box
5. **Click any file** to preview it - the diagram renders instantly
6. **Edit files** in your favorite editor - changes appear automatically in the preview
7. **Live updates** - the app watches for file changes and updates the preview in real-time

## Supported File Types

- `.mmd` - Mermaid diagram files
- `.mermaid` - Alternative Mermaid file extension

## Project Structure

```
mermaid-live-visualizer/
├── main.js           # Main Electron process
├── preload.js        # Secure IPC bridge
├── renderer.js       # UI logic and Mermaid rendering
├── index.html        # Application UI
├── styles.css        # Dark theme styling
├── package.json      # Dependencies and scripts
└── test-diagrams/    # Sample Mermaid files for testing
```

## Technology Stack

- **Electron** (v39) - Cross-platform desktop application framework
- **Mermaid.js** (v10.6.1) - Diagram rendering engine
- **Fuse.js** (v7.0.0) - Fuzzy search library
- **Chokidar** (v3.5.3) - File watching library

## Sample Files

The `test-diagrams/` directory contains sample files for testing:
- `flowchart.mmd` - Basic flowchart example
- `sequence.mermaid` - Sequence diagram example

## License

MIT

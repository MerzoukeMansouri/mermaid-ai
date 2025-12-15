/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    primaryColor: '#6366f1',
    primaryTextColor: '#fff',
    primaryBorderColor: '#4f46e5',
    lineColor: '#a78bfa',
    secondaryColor: '#7c3aed',
    tertiaryColor: '#8b5cf6'
  }
});

// Global variables
let currentDirectory = null;
let allFiles = [];
let fuse = null;
let currentFile = null;
let currentZoom = 1;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panOffset = { x: 0, y: 0 };

// DOM Elements
const selectDirBtn = document.getElementById('selectDirBtn');
const currentPathDiv = document.getElementById('currentPath');
const fileListDiv = document.getElementById('fileList');
const searchInput = document.getElementById('searchInput');
const previewArea = document.getElementById('previewArea');
const previewHeader = document.getElementById('previewHeader');
const fileName = document.getElementById('fileName');
const zoomControls = document.getElementById('zoomControls');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const fitBtn = document.getElementById('fitBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const zoomLevel = document.getElementById('zoomLevel');

// Event Listeners
selectDirBtn.addEventListener('click', selectDirectory);
searchInput.addEventListener('input', handleSearch);
zoomInBtn.addEventListener('click', () => adjustZoom(0.2));
zoomOutBtn.addEventListener('click', () => adjustZoom(-0.2));
zoomResetBtn.addEventListener('click', resetZoom);
fitBtn.addEventListener('click', fitToScreen);
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Select directory
async function selectDirectory() {
  const dirPath = await window.electronAPI.selectDirectory();

  if (dirPath) {
    currentDirectory = dirPath;
    currentPathDiv.textContent = dirPath;
    await loadMermaidFiles();
  }
}

// Load mermaid files from directory
async function loadMermaidFiles() {
  const files = await window.electronAPI.getMermaidFiles(currentDirectory);
  allFiles = files;

  // Initialize Fuse for fuzzy search
  fuse = new Fuse(allFiles, {
    keys: ['name', 'relativePath'],
    threshold: 0.3,
    includeScore: true
  });

  displayFiles(allFiles);
}

// Display files in sidebar
function displayFiles(files) {
  if (files.length === 0) {
    fileListDiv.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p>No Mermaid files found</p>
        <p class="hint">Create .mmd or .mermaid files</p>
      </div>
    `;
    return;
  }

  fileListDiv.innerHTML = files.map(file => `
    <div class="file-item" data-path="${file.path}">
      <div class="file-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div class="file-info">
        <div class="file-name-text">${file.name}</div>
        <div class="file-path">${file.relativePath}</div>
      </div>
    </div>
  `).join('');

  // Add click listeners to file items
  document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => selectFile(item.dataset.path));
  });
}

// Handle fuzzy search
function handleSearch(e) {
  const query = e.target.value.trim();

  if (!query) {
    displayFiles(allFiles);
    return;
  }

  const results = fuse.search(query);
  const filteredFiles = results.map(result => result.item);
  displayFiles(filteredFiles);
}

// Select and preview file
async function selectFile(filePath) {
  currentFile = filePath;
  window.currentFile = filePath; // Make globally accessible for AI

  // Update UI
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.toggle('active', item.dataset.path === filePath);
  });

  // Show preview header and zoom controls
  previewHeader.classList.remove('hidden');
  zoomControls.classList.remove('hidden');
  fileName.textContent = filePath.split('/').pop();

  // Reset zoom when selecting new file
  resetZoom();

  // Load and render file
  const content = await window.electronAPI.readFile(filePath);
  await renderMermaid(content);

  // Set up file watching
  await window.electronAPI.watchFile(filePath);
}

// Render Mermaid diagram
async function renderMermaid(content) {
  // Render as single mermaid diagram
  previewArea.innerHTML = '<div id="mermaid-preview" class="mermaid-diagram"></div>';

  try {
    const { svg } = await mermaid.render('mermaid-graph', content);
    document.getElementById('mermaid-preview').innerHTML = svg;
  } catch (error) {
    previewArea.innerHTML = `
      <div class="error-state">
        <p>Error rendering diagram:</p>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}

// Listen for file changes
window.electronAPI.onFileChanged(async (content) => {
  await renderMermaid(content);
  // Reapply zoom after render
  applyZoom();
});

// Zoom Functions
function adjustZoom(delta) {
  currentZoom = Math.max(0.1, Math.min(5, currentZoom + delta));
  applyZoom();
}

function resetZoom() {
  currentZoom = 1;
  panOffset = { x: 0, y: 0 };
  applyZoom();
}

function applyZoom() {
  const diagram = document.querySelector('.mermaid-diagram');
  if (!diagram) return;

  // Update zoom level display
  zoomLevel.textContent = Math.round(currentZoom * 100) + '%';

  // Apply transform
  diagram.style.transform = `scale(${currentZoom}) translate(${panOffset.x}px, ${panOffset.y}px)`;
  diagram.classList.add('zoom-transition');

  // Toggle zoomed class for overflow handling
  if (currentZoom > 1) {
    previewArea.classList.add('zoomed');
  } else {
    previewArea.classList.remove('zoomed');
    panOffset = { x: 0, y: 0 };
  }
}

function fitToScreen() {
  const diagram = document.querySelector('.mermaid-diagram svg');
  if (!diagram) return;

  const previewRect = previewArea.getBoundingClientRect();
  const diagramRect = diagram.getBoundingClientRect();

  // Calculate scale to fit both width and height
  const scaleX = (previewRect.width - 100) / diagramRect.width;
  const scaleY = (previewRect.height - 100) / diagramRect.height;

  currentZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 100%
  panOffset = { x: 0, y: 0 };
  applyZoom();
}

// Toggle focus mode (hide sidebar and header)
let isFocusMode = false;

function toggleFullscreen() {
  const sidebar = document.querySelector('.sidebar');
  const header = document.querySelector('.header');
  const mainContainer = document.querySelector('.main-container');
  const previewContainer = document.querySelector('.preview-container');
  const app = document.querySelector('#app');

  isFocusMode = !isFocusMode;

  if (isFocusMode) {
    // Enter focus mode - hide sidebar and header
    sidebar.style.display = 'none';
    header.style.display = 'none';
    mainContainer.style.display = 'block';
    mainContainer.style.height = '100vh';
    previewContainer.style.width = '100%';
    previewContainer.style.height = '100vh';
    app.style.height = '100vh';

    // Update button icon for exit focus mode
    fullscreenBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
      </svg>
    `;
    fullscreenBtn.title = 'Exit Focus Mode';

    // Add focus class for any additional styling
    document.body.classList.add('focus-mode');
  } else {
    // Exit focus mode - show sidebar and header
    sidebar.style.display = 'flex';
    header.style.display = 'block';
    mainContainer.style.display = 'flex';
    mainContainer.style.height = '';
    previewContainer.style.width = '';
    previewContainer.style.height = '';
    app.style.height = '';

    // Update button icon for enter focus mode
    fullscreenBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"></path>
        <path d="M4 4l4 4m12-4l-4 4m4 12l-4-4m-12 4l4-4"></path>
      </svg>
    `;
    fullscreenBtn.title = 'Enter Focus Mode';

    // Remove focus class
    document.body.classList.remove('focus-mode');
  }

  // Recalculate zoom if fit to screen was active
  if (currentFile) {
    setTimeout(() => {
      const diagram = document.querySelector('.mermaid-diagram');
      if (diagram) {
        applyZoom();
      }
    }, 100);
  }
}

// Pan functionality when zoomed
previewArea.addEventListener('mousedown', (e) => {
  if (currentZoom > 1 && e.target.closest('.mermaid-diagram')) {
    isPanning = true;
    panStart.x = e.clientX - panOffset.x * currentZoom;
    panStart.y = e.clientY - panOffset.y * currentZoom;
    e.preventDefault();
  }
});

previewArea.addEventListener('mousemove', (e) => {
  if (isPanning) {
    panOffset.x = (e.clientX - panStart.x) / currentZoom;
    panOffset.y = (e.clientY - panStart.y) / currentZoom;

    const diagram = document.querySelector('.mermaid-diagram');
    if (diagram) {
      diagram.classList.remove('zoom-transition');
      diagram.style.transform = `scale(${currentZoom}) translate(${panOffset.x}px, ${panOffset.y}px)`;
    }
  }
});

document.addEventListener('mouseup', () => {
  isPanning = false;
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // F11 for fullscreen (works even without file selected)
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  if (!currentFile) return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      adjustZoom(0.2);
    } else if (e.key === '-') {
      e.preventDefault();
      adjustZoom(-0.2);
    } else if (e.key === '0') {
      e.preventDefault();
      resetZoom();
    }
  }
});

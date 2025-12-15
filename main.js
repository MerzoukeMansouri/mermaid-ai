// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs').promises
const { watch } = require('chokidar')

let mainWindow;
let fileWatcher = null;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1e1e1e'
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Handle directory selection
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Get mermaid files from directory
ipcMain.handle('get-mermaid-files', async (event, dirPath) => {
  try {
    const files = await scanDirectory(dirPath);
    return files;
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }
});

// Read file content
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
});

// Watch file for changes
ipcMain.handle('watch-file', (event, filePath) => {
  // Close existing watcher if any
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = watch(filePath, {
    persistent: true,
    ignoreInitial: true
  });

  fileWatcher.on('change', async () => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      mainWindow.webContents.send('file-changed', content);
    } catch (error) {
      console.error('Error reading changed file:', error);
    }
  });

  return true;
});

// Recursive scan for mermaid files
async function scanDirectory(dirPath, baseDir = dirPath) {
  const mermaidFiles = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await scanDirectory(fullPath, baseDir);
        mermaidFiles.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.mmd' || ext === '.mermaid') {
          mermaidFiles.push({
            name: entry.name,
            path: fullPath,
            relativePath: path.relative(baseDir, fullPath)
          });
        }
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', dirPath, error);
  }

  return mermaidFiles;
}

// ========== OLLAMA AI INTEGRATION ==========
// Keep version history for rollback
const fileHistory = new Map();
const MAX_HISTORY_SIZE = 10;

// Ollama configuration for maximum safety
const OLLAMA_CONFIG = {
  host: 'http://localhost:11434',
  model: 'codellama:7b-instruct',
  temperature: 0.1, // Very low for consistency
  top_k: 40,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_predict: 2000, // Max tokens
  system: `You are a Mermaid diagram syntax editor.
STRICT RULES:
- ONLY output valid Mermaid diagram syntax
- NEVER add explanations, comments, or markdown
- NEVER create content not explicitly requested
- If unsure about a change, output the original unchanged
- Follow the exact instruction given, nothing more`
};

// Call Ollama API
async function callOllama(prompt, config = {}) {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || OLLAMA_CONFIG.model,
        prompt: prompt,
        system: OLLAMA_CONFIG.system,
        temperature: config.temperature || OLLAMA_CONFIG.temperature,
        top_k: config.top_k || OLLAMA_CONFIG.top_k,
        top_p: config.top_p || OLLAMA_CONFIG.top_p,
        repeat_penalty: config.repeat_penalty || OLLAMA_CONFIG.repeat_penalty,
        num_predict: config.num_predict || OLLAMA_CONFIG.num_predict,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error('Ollama API call failed:', error);
    throw error;
  }
}

// Validate Mermaid output from AI
function validateMermaidOutput(aiOutput, originalContent) {
  if (!aiOutput || typeof aiOutput !== 'string') {
    return { valid: false, error: 'Invalid output from AI' };
  }

  // Remove any markdown code blocks if AI added them despite instructions
  aiOutput = aiOutput.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();

  // Check 1: Ensure it contains Mermaid keywords
  const mermaidKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie'];
  const hasMermaidSyntax = mermaidKeywords.some(keyword => aiOutput.includes(keyword));

  if (!hasMermaidSyntax) {
    return { valid: false, error: 'No valid Mermaid syntax detected' };
  }

  // Check 2: Ensure no dangerous content
  const dangerous = ['fs.', 'require(', 'import ', 'eval(', 'exec(', 'process.', '__dirname', '__filename'];
  if (dangerous.some(d => aiOutput.includes(d))) {
    return { valid: false, error: 'Potentially dangerous content detected' };
  }

  // Check 3: Size sanity check
  if (aiOutput.length > originalContent.length * 5) {
    return { valid: false, error: 'Output is unreasonably large compared to original' };
  }

  // Check 4: Ensure it's actually different
  if (aiOutput === originalContent) {
    return { valid: false, error: 'No changes were made' };
  }

  return { valid: true, content: aiOutput };
}

// Save version for rollback
function saveVersion(filePath, content) {
  if (!fileHistory.has(filePath)) {
    fileHistory.set(filePath, []);
  }

  const versions = fileHistory.get(filePath);
  versions.push({
    content,
    timestamp: Date.now()
  });

  // Keep only last MAX_HISTORY_SIZE versions
  if (versions.length > MAX_HISTORY_SIZE) {
    versions.shift();
  }
}

// IPC: AI edit Mermaid file
ipcMain.handle('ai-edit-mermaid', async (event, filePath, instruction) => {
  try {
    // Read current file content
    const originalContent = await fs.readFile(filePath, 'utf-8');

    // Save original version for rollback
    saveVersion(filePath, originalContent);

    // Build constrained prompt
    const prompt = `CURRENT MERMAID DIAGRAM:
${originalContent}

INSTRUCTION: ${instruction}

OUTPUT ONLY THE MODIFIED MERMAID DIAGRAM (no explanations):`;

    // Call Ollama
    const aiOutput = await callOllama(prompt);

    // Validate the output
    const validation = validateMermaidOutput(aiOutput, originalContent);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        original: originalContent
      };
    }

    return {
      success: true,
      original: originalContent,
      modified: validation.content,
      instruction: instruction
    };
  } catch (error) {
    console.error('AI edit error:', error);
    return {
      success: false,
      error: error.message || 'Failed to edit with AI',
      original: await fs.readFile(filePath, 'utf-8').catch(() => '')
    };
  }
});

// IPC: Apply AI changes after user confirmation
ipcMain.handle('apply-ai-changes', async (event, filePath, newContent) => {
  try {
    // Create a backup file
    const backupPath = `${filePath}.backup-${Date.now()}`;
    const originalContent = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(backupPath, originalContent, 'utf-8');

    // Apply the changes
    await fs.writeFile(filePath, newContent, 'utf-8');

    return {
      success: true,
      backupPath: backupPath
    };
  } catch (error) {
    console.error('Failed to apply AI changes:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC: Rollback file to previous version
ipcMain.handle('rollback-file', async (event, filePath, versionIndex) => {
  try {
    const versions = fileHistory.get(filePath);

    if (!versions || !versions[versionIndex]) {
      throw new Error('No version history available');
    }

    const version = versions[versionIndex];
    await fs.writeFile(filePath, version.content, 'utf-8');

    return {
      success: true,
      timestamp: version.timestamp
    };
  } catch (error) {
    console.error('Rollback failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC: Get file history
ipcMain.handle('get-file-history', async (event, filePath) => {
  const versions = fileHistory.get(filePath) || [];
  return versions.map((v, index) => ({
    index,
    timestamp: v.timestamp,
    preview: v.content.substring(0, 100) + '...'
  }));
});

// IPC: Check Ollama status
ipcMain.handle('check-ollama-status', async () => {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.host}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return {
        connected: false,
        error: 'Ollama server not responding'
      };
    }

    const data = await response.json();
    const models = data.models || [];
    const hasCodeModel = models.some(m =>
      m.name.includes('codellama') ||
      m.name.includes('deepseek-coder') ||
      m.name.includes('qwen') ||
      m.name.includes('coder')
    );

    return {
      connected: true,
      models: models.map(m => m.name),
      hasCodeModel: hasCodeModel,
      currentModel: OLLAMA_CONFIG.model
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message || 'Cannot connect to Ollama'
    };
  }
});

// ========== AI OLLAMA INTEGRATION ==========

// AI DOM elements
const aiPanel = document.getElementById('aiPanel');
const aiToggleBtn = document.getElementById('aiToggleBtn');
const closeAiPanel = document.getElementById('closeAiPanel');
const aiEditBtn = document.getElementById('aiEditBtn');
const aiApplyBtn = document.getElementById('aiApplyBtn');
const aiCancelBtn = document.getElementById('aiCancelBtn');
const aiInstruction = document.getElementById('aiInstruction');
const aiPreview = document.getElementById('aiPreview');
const aiDiffContent = document.getElementById('aiDiffContent');
const aiPreviewContent = document.getElementById('aiPreviewContent');
const aiHistoryList = document.getElementById('aiHistoryList');
const ollamaStatus = document.getElementById('ollamaStatus');
const statusText = document.getElementById('statusText');
const codeViewBtn = document.getElementById('codeViewBtn');
const previewViewBtn = document.getElementById('previewViewBtn');

// AI state
let aiPanelOpen = false;
let pendingAiChanges = null;

// Initialize AI features
async function initAI() {
  // Check Ollama status
  checkOllamaStatus();

  // Check status periodically
  setInterval(checkOllamaStatus, 30000); // Every 30 seconds
}

// Check Ollama connection status
async function checkOllamaStatus() {
  try {
    const status = await window.electronAPI.checkOllamaStatus();

    if (status.connected) {
      ollamaStatus.classList.add('connected');
      ollamaStatus.classList.remove('disconnected');
      statusText.textContent = `Connected (${status.currentModel})`;

      if (!status.hasCodeModel) {
        statusText.textContent += ' - No code model found';
      }
    } else {
      ollamaStatus.classList.add('disconnected');
      ollamaStatus.classList.remove('connected');
      statusText.textContent = status.error || 'Disconnected';
    }
  } catch (error) {
    ollamaStatus.classList.add('disconnected');
    ollamaStatus.classList.remove('connected');
    statusText.textContent = 'Cannot connect to Ollama';
  }
}

// Toggle AI panel
aiToggleBtn.addEventListener('click', () => {
  aiPanelOpen = !aiPanelOpen;
  if (aiPanelOpen) {
    aiPanel.classList.remove('hidden');
    aiToggleBtn.classList.add('active');
    loadFileHistory();
  } else {
    aiPanel.classList.add('hidden');
    aiToggleBtn.classList.remove('active');
  }
});

// Close AI panel
closeAiPanel.addEventListener('click', () => {
  aiPanelOpen = false;
  aiPanel.classList.add('hidden');
  aiToggleBtn.classList.remove('active');
});

// View toggle buttons
codeViewBtn.addEventListener('click', () => {
  codeViewBtn.classList.add('active');
  previewViewBtn.classList.remove('active');
  aiDiffContent.classList.remove('hidden');
  aiPreviewContent.classList.add('hidden');
});

previewViewBtn.addEventListener('click', () => {
  previewViewBtn.classList.add('active');
  codeViewBtn.classList.remove('active');
  aiDiffContent.classList.add('hidden');
  aiPreviewContent.classList.remove('hidden');

  // Render the preview if we have pending changes
  if (pendingAiChanges) {
    renderPreview(pendingAiChanges.modified);
  }
});

// Generate AI edit
aiEditBtn.addEventListener('click', async () => {
  if (!window.currentFile) {
    alert('Please select a file first');
    return;
  }

  const instruction = aiInstruction.value.trim();
  if (!instruction) {
    alert('Please enter an instruction for the AI');
    return;
  }

  // Show loading state
  aiEditBtn.disabled = true;
  aiEditBtn.innerHTML = `
    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 11-6.219-8.56"></path>
    </svg>
    Processing...
  `;

  try {
    // Call AI to edit the file
    const result = await window.electronAPI.aiEditMermaid(window.currentFile, instruction);

    if (result.success) {
      // Store pending changes
      pendingAiChanges = {
        filePath: window.currentFile,
        original: result.original,
        modified: result.modified,
        instruction: result.instruction
      };

      // Show diff preview
      showDiffPreview(result.original, result.modified);

      // Show preview panel
      aiPreview.classList.remove('hidden');
    } else {
      alert(`AI Edit Failed: ${result.error}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    // Reset button
    aiEditBtn.disabled = false;
    aiEditBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
      Generate Edit
    `;
  }
});

// Show diff preview
function showDiffPreview(original, modified) {
  // Show code diff
  let diffHTML = '<div class="diff-container">';
  diffHTML += '<div class="diff-side"><h5>Original</h5><pre class="diff-original">';
  diffHTML += escapeHtml(original);
  diffHTML += '</pre></div>';
  diffHTML += '<div class="diff-side"><h5>Modified</h5><pre class="diff-modified">';
  diffHTML += escapeHtml(modified);
  diffHTML += '</pre></div>';
  diffHTML += '</div>';

  aiDiffContent.innerHTML = diffHTML;

  // Ensure code view is active by default
  codeViewBtn.classList.add('active');
  previewViewBtn.classList.remove('active');
  aiDiffContent.classList.remove('hidden');
  aiPreviewContent.classList.add('hidden');
}

// Render preview of the modified diagram
async function renderPreview(modifiedContent) {
  aiPreviewContent.innerHTML = '<div class="preview-loading">Rendering preview...</div>';

  try {
    // Create a unique ID for this preview
    const previewId = 'ai-preview-' + Date.now();

    // Use Mermaid to render the modified content
    const { svg } = await mermaid.render(previewId, modifiedContent);

    aiPreviewContent.innerHTML = '<div class="ai-mermaid-preview">' + svg + '</div>';
  } catch (error) {
    aiPreviewContent.innerHTML = `
      <div class="preview-error">
        <p>Error rendering preview:</p>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}

// Apply AI changes
aiApplyBtn.addEventListener('click', async () => {
  if (!pendingAiChanges) return;

  try {
    const result = await window.electronAPI.applyAiChanges(
      pendingAiChanges.filePath,
      pendingAiChanges.modified
    );

    if (result.success) {
      // Clear pending changes
      pendingAiChanges = null;
      aiPreview.classList.add('hidden');
      aiInstruction.value = '';

      // Reload history
      loadFileHistory();

      // Show success message
      showNotification('Changes applied successfully!', 'success');
    } else {
      alert(`Failed to apply changes: ${result.error}`);
    }
  } catch (error) {
    alert(`Error applying changes: ${error.message}`);
  }
});

// Cancel AI changes
aiCancelBtn.addEventListener('click', () => {
  pendingAiChanges = null;
  aiPreview.classList.add('hidden');
});

// Load file history
async function loadFileHistory() {
  if (!window.currentFile) return;

  try {
    const history = await window.electronAPI.getFileHistory(window.currentFile);

    if (history.length === 0) {
      aiHistoryList.innerHTML = '<p class="no-history">No history available</p>';
      return;
    }

    aiHistoryList.innerHTML = history.map(item => `
      <div class="history-item">
        <span class="history-time">${new Date(item.timestamp).toLocaleString()}</span>
        <button class="history-rollback-btn" data-index="${item.index}">Rollback</button>
      </div>
    `).join('');

    // Add rollback event listeners
    document.querySelectorAll('.history-rollback-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to rollback to this version?')) {
          const index = parseInt(btn.dataset.index);
          await rollbackToVersion(index);
        }
      });
    });
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

// Rollback to specific version
async function rollbackToVersion(versionIndex) {
  if (!window.currentFile) return;

  try {
    const result = await window.electronAPI.rollbackFile(window.currentFile, versionIndex);

    if (result.success) {
      // Reload the file
      const content = await window.electronAPI.readFile(window.currentFile);
      window.renderMermaid(content);

      showNotification('Rolled back successfully!', 'success');
      loadFileHistory();
    } else {
      alert(`Rollback failed: ${result.error}`);
    }
  } catch (error) {
    alert(`Error during rollback: ${error.message}`);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Escape HTML for safe display
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize AI features on load
document.addEventListener('DOMContentLoaded', () => {
  initAI();

  // Show AI button when a file is selected
  const checkForFile = setInterval(() => {
    if (window.currentFile) {
      aiToggleBtn.classList.remove('hidden');
      clearInterval(checkForFile);
    }
  }, 1000);
});
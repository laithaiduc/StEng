// ============================================
// DATA MANAGEMENT
// ============================================

const STORAGE_KEYS = {
  FOLDERS: 'vm_folders',
  REVIEW: 'vm_review',
  SETTINGS: 'vm_settings'
};

class DataManager {
  constructor() {
    if (!localStorage.getItem(STORAGE_KEYS.FOLDERS)) {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEW)) {
      localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ theme: 'dark' }));
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getFolders() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLDERS)) || [];
  }

  saveFolder(folder) {
    const folders = this.getFolders();
    const index = folders.findIndex(f => f.id === folder.id);
    if (index !== -1) {
      folders[index] = folder;
    } else {
      folders.push(folder);
    }
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }

  deleteFolder(id) {
    let folders = this.getFolders();
    folders = folders.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    
    // Clean up review items for this folder
    let reviews = this.getReviewList();
    reviews = reviews.filter(r => r.folderId !== id);
    localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
  }

  getFolder(id) {
    const folders = this.getFolders();
    return folders.find(f => f.id === id);
  }

  addWord(folderId, word) {
    const folder = this.getFolder(folderId);
    if (folder) {
      word.id = this.generateId();
      word.createdAt = Date.now();
      if (!folder.words) folder.words = [];
      folder.words.push(word);
      this.saveFolder(folder);
      return word;
    }
    return null;
  }

  updateWord(folderId, wordId, data) {
    const folder = this.getFolder(folderId);
    if (folder && folder.words) {
      const wordIndex = folder.words.findIndex(w => w.id === wordId);
      if (wordIndex !== -1) {
        folder.words[wordIndex] = { ...folder.words[wordIndex], ...data };
        this.saveFolder(folder);
        
        // Update in review list if exists
        let reviews = this.getReviewList();
        const reviewIndex = reviews.findIndex(r => r.wordId === wordId);
        if (reviewIndex !== -1) {
          reviews[reviewIndex] = { ...reviews[reviewIndex], ...data };
          localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
        }
        return true;
      }
    }
    return false;
  }

  deleteWord(folderId, wordId) {
    const folder = this.getFolder(folderId);
    if (folder && folder.words) {
      folder.words = folder.words.filter(w => w.id !== wordId);
      this.saveFolder(folder);
      this.removeFromReview(wordId);
      return true;
    }
    return false;
  }

  getReviewList() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEW)) || [];
  }

  addToReview(item) {
    const reviews = this.getReviewList();
    const exists = reviews.find(r => r.wordId === item.wordId);
    if (!exists) {
      item.wrongCount = 1;
      item.correctStreak = 0;
      reviews.push(item);
      localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
    } else {
      exists.wrongCount = (exists.wrongCount || 0) + 1;
      exists.correctStreak = 0;
      localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
    }
  }

  removeFromReview(wordId) {
    let reviews = this.getReviewList();
    reviews = reviews.filter(r => r.wordId !== wordId);
    localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
  }

  updateReviewItem(wordId, isCorrect) {
    const reviews = this.getReviewList();
    const item = reviews.find(r => r.wordId === wordId);
    if (item) {
      if (isCorrect) {
        item.correctStreak = (item.correctStreak || 0) + 1;
      } else {
        item.correctStreak = 0;
        item.wrongCount = (item.wrongCount || 0) + 1;
      }
      localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
    }
  }

  getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || { theme: 'dark' };
  }

  saveSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}

// ============================================
// ROUTER / SCREEN MANAGER
// ============================================

class Router {
  constructor(app) {
    this.app = app;
    this.currentScreen = 'home';
  }

  navigate(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });
    
    const target = document.querySelector(`.screen[data-screen="${screenName}"]`);
    if (target) {
      target.classList.add('active');
      target.classList.remove('hidden');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.nav === screenName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.currentScreen = screenName;
    
    if (screenName === 'home') {
      this.app.folderManager.renderFolders();
    } else if (screenName === 'review') {
      this.app.reviewManager.renderReviewScreen();
    }
  }

  getCurrentScreen() {
    return this.currentScreen;
  }
}

// ============================================
// UI HELPERS
// ============================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  const overlay = document.getElementById('modal-overlay');
  if (modal && overlay) {
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  const overlay = document.getElementById('modal-overlay');
  if (modal && overlay) {
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
  }
}

function confirmAction(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    const overlay = document.getElementById('modal-overlay');
    
    if (!modal || !msgEl || !okBtn || !cancelBtn) {
      resolve(window.confirm(message));
      return;
    }
    
    msgEl.textContent = message;
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    
    const handleOk = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.classList.add('hidden');
      overlay.classList.add('hidden');
    };
    
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

function pronounceWord(word, rate = 1) {
  if (!window.speechSynthesis) {
    showToast('Trình duyệt không hỗ trợ phát âm', 'error');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function triggerConfetti() {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
    confetti.style.opacity = Math.random();
    document.body.appendChild(confetti);
    
    setTimeout(() => {
      if (document.body.contains(confetti)) {
        document.body.removeChild(confetti);
      }
    }, 5000);
  }
}

// ============================================
// FOLDER MANAGER
// ============================================

class FolderManager {
  constructor(app) {
    this.app = app;
    this.editingFolderId = null;
  }

  renderFolders(filter = '') {
    const container = document.getElementById('folder-grid');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;

    let folders = this.app.dataManager.getFolders();
    
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      folders = folders.filter(f => f.name.toLowerCase().includes(lowerFilter) || (f.desc && f.desc.toLowerCase().includes(lowerFilter)));
    }

    container.innerHTML = '';
    
    if (folders.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      folders.forEach(folder => {
        container.insertAdjacentHTML('beforeend', this.createFolderCard(folder));
      });
      
      // Bind events for cards
      container.querySelectorAll('.folder-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.closest('.folder-actions')) {
            this.openFolder(card.dataset.folderId);
          }
        });
      });
      
      container.querySelectorAll('.edit-folder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const folderId = e.target.closest('.folder-card').dataset.folderId;
          this.openEditModal(folderId);
        });
      });
      
      container.querySelectorAll('.delete-folder-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const folderId = e.target.closest('.folder-card').dataset.folderId;
          await this.deleteFolder(folderId);
        });
      });
    }
  }

  createFolderCard(folder) {
    const wordCount = folder.words ? folder.words.length : 0;
    return `
      <div class="folder-card" data-folder-id="${folder.id}" style="border-top: 4px solid ${folder.color || '#4facfe'}">
        <div class="folder-header">
          <span class="folder-icon">${folder.emoji || '📁'}</span>
          <div class="folder-actions">
            <button class="edit-folder-btn">✏️</button>
            <button class="delete-folder-btn">🗑️</button>
          </div>
        </div>
        <h3 class="folder-name">${folder.name}</h3>
        <p class="folder-desc">${folder.desc || ''}</p>
        <div class="folder-meta">
          <span class="word-count">${wordCount} từ</span>
        </div>
      </div>
    `;
  }

  openCreateModal() {
    this.editingFolderId = null;
    document.getElementById('folder-modal-title').textContent = 'Tạo thư mục mới';
    document.getElementById('folder-form').reset();
    document.querySelector('#folder-form [id="folder-emoji"]').value = '📁';
    document.getElementById('folder-color').value = '#4facfe';
    showModal('folder-modal');
  }

  openEditModal(folderId) {
    this.editingFolderId = folderId;
    const folder = this.app.dataManager.getFolder(folderId);
    if (folder) {
      document.getElementById('folder-modal-title').textContent = 'Chỉnh sửa thư mục';
      document.getElementById('folder-name').value = folder.name;
      document.getElementById('folder-desc').value = folder.desc || '';
      document.querySelector('#folder-form [id="folder-emoji"]').value = folder.emoji || '📁';
      document.getElementById('folder-color').value = folder.color || '#4facfe';
      showModal('folder-modal');
    }
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('folder-name').value.trim();
    if (!name) {
      showToast('Tên thư mục không được để trống', 'error');
      return;
    }
    
    const desc = document.getElementById('folder-desc').value.trim();
    const emoji = document.querySelector('#folder-form [id="folder-emoji"]').value.trim() || '📁';
    const color = document.getElementById('folder-color').value;
    
    if (this.editingFolderId) {
      const folder = this.app.dataManager.getFolder(this.editingFolderId);
      if (folder) {
        folder.name = name;
        folder.desc = desc;
        folder.emoji = emoji;
        folder.color = color;
        this.app.dataManager.saveFolder(folder);
        showToast('Đã cập nhật thư mục');
        
        // If we are in folder detail view for this folder, update the header
        if (this.app.currentFolderId === this.editingFolderId && this.app.router.getCurrentScreen() === 'folder') {
          this.updateFolderHeader(folder);
        }
      }
    } else {
      const newFolder = {
        id: this.app.dataManager.generateId(),
        name,
        desc,
        emoji,
        color,
        words: [],
        createdAt: Date.now()
      };
      this.app.dataManager.saveFolder(newFolder);
      showToast('Đã tạo thư mục');
    }
    
    closeModal('folder-modal');
    if (this.app.router.getCurrentScreen() === 'home') {
      this.renderFolders(document.getElementById('search-input').value);
    }
  }

  async deleteFolder(folderId) {
    const confirm = await confirmAction('Bạn có chắc muốn xóa thư mục này? Tất cả từ vựng trong thư mục sẽ bị xóa.');
    if (confirm) {
      this.app.dataManager.deleteFolder(folderId);
      showToast('Đã xóa thư mục');
      if (this.app.router.getCurrentScreen() === 'folder' && this.app.currentFolderId === folderId) {
        this.app.router.navigate('home');
      } else if (this.app.router.getCurrentScreen() === 'home') {
        this.renderFolders(document.getElementById('search-input').value);
      }
    }
  }

  openFolder(folderId) {
    const folder = this.app.dataManager.getFolder(folderId);
    if (!folder) return;
    
    this.app.currentFolderId = folderId;
    this.updateFolderHeader(folder);
    this.app.vocabManager.renderWords(folderId);
    this.app.vocabManager.updateGameButtons();
    this.app.router.navigate('folder');
  }

  updateFolderHeader(folder) {
    const emojiDisplay = document.querySelector('.folder-emoji-display');
    if (emojiDisplay) emojiDisplay.textContent = folder.emoji || '📁';
    document.getElementById('folder-title').textContent = folder.name;
    document.getElementById('folder-word-count').textContent = `${folder.words ? folder.words.length : 0} từ`;
  }
}

// ============================================
// VOCABULARY MANAGER  
// ============================================

class VocabManager {
  constructor(app) {
    this.app = app;
    this.editingWordId = null;
  }

  renderWords(folderId) {
    const container = document.getElementById('word-list');
    const emptyState = document.getElementById('empty-words');
    if (!container) return;

    const folder = this.app.dataManager.getFolder(folderId);
    if (!folder) return;
    
    const words = folder.words || [];
    container.innerHTML = '';
    
    if (words.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      words.forEach(word => {
        container.insertAdjacentHTML('beforeend', this.createWordCard(word));
      });
      
      // Bind events
      container.querySelectorAll('.pronounce-word-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const word = e.currentTarget.dataset.word;
          pronounceWord(word);
        });
      });
      
      container.querySelectorAll('.edit-word-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const wordId = e.currentTarget.dataset.id;
          this.openEditModal(wordId);
        });
      });
      
      container.querySelectorAll('.delete-word-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const wordId = e.currentTarget.dataset.id;
          await this.deleteWord(wordId);
        });
      });
    }
    
    const countEl = document.getElementById('folder-word-count');
    if (countEl) countEl.textContent = `${words.length} từ`;
  }

  createWordCard(word) {
    const typeClass = word.type ? `pos-${word.type}` : '';
    const posViMap = {
      'noun': 'Danh từ', 'verb': 'Động từ', 'adjective': 'Tính từ',
      'adverb': 'Trạng từ', 'preposition': 'Giới từ', 'conjunction': 'Liên từ',
      'pronoun': 'Đại từ', 'interjection': 'Thán từ', 'phrase': 'Cụm từ'
    };
    const typeLabel = word.type ? `${word.type} (${posViMap[word.type] || word.type})` : '';
    return `
      <div class="word-card" data-id="${word.id}">
        <div class="word-card-content">
          <div class="word-header">
            <span class="word-english">${word.english}</span>
            ${word.phonetic ? `<span class="word-phonetic">${word.phonetic}</span>` : ''}
            <button class="pronounce-word-btn" data-word="${word.english}">🔊</button>
            <div class="word-actions">
              <button class="edit-word-btn" data-id="${word.id}">✏️</button>
              <button class="delete-word-btn" data-id="${word.id}">🗑️</button>
            </div>
          </div>
          <div class="word-meaning-container">
            ${word.type ? `<span class="word-type badge ${typeClass}">${typeLabel}</span>` : ''}
            <span class="word-meaning">${word.meaning}</span>
          </div>
          ${word.example ? `<div class="word-example">"${word.example}"</div>` : ''}
          ${word.note ? `<div class="word-note">📝 ${word.note}</div>` : ''}
        </div>
      </div>
    `;
  }

  openAddModal() {
    this.editingWordId = null;
    document.getElementById('word-modal-title').textContent = 'Thêm từ vựng mới';
    document.getElementById('word-form').reset();
    document.getElementById('suggest-results').innerHTML = '';
    document.getElementById('auto-suggest-panel').classList.add('hidden');
    showModal('word-modal');
    setTimeout(() => document.getElementById('word-english').focus(), 100);
  }

  openEditModal(wordId) {
    const folder = this.app.dataManager.getFolder(this.app.currentFolderId);
    if (!folder || !folder.words) return;
    
    const word = folder.words.find(w => w.id === wordId);
    if (!word) return;
    
    this.editingWordId = wordId;
    document.getElementById('word-modal-title').textContent = 'Chỉnh sửa từ vựng';
    document.getElementById('word-english').value = word.english;
    document.getElementById('word-meaning').value = word.meaning;
    document.getElementById('word-type').value = word.type || '';
    document.getElementById('word-phonetic').value = word.phonetic || '';
    document.getElementById('word-example').value = word.example || '';
    document.getElementById('word-note').value = word.note || '';
    
    document.getElementById('suggest-results').innerHTML = '';
    document.getElementById('auto-suggest-panel').classList.add('hidden');
    
    showModal('word-modal');
  }

  handleFormSubmit(e) {
    e.preventDefault();
    if (!this.app.currentFolderId) return;
    
    const english = document.getElementById('word-english').value.trim();
    const meaning = document.getElementById('word-meaning').value.trim();
    const type = document.getElementById('word-type').value;
    const phonetic = document.getElementById('word-phonetic').value.trim();
    const example = document.getElementById('word-example').value.trim();
    const note = document.getElementById('word-note').value.trim();
    
    if (!english || !meaning) {
      showToast('Từ tiếng Anh và nghĩa không được để trống', 'error');
      return;
    }
    
    const wordData = { english, meaning, type, phonetic, example, note };
    
    if (this.editingWordId) {
      this.app.dataManager.updateWord(this.app.currentFolderId, this.editingWordId, wordData);
      showToast('Đã cập nhật từ vựng');
    } else {
      this.app.dataManager.addWord(this.app.currentFolderId, wordData);
      showToast('Đã thêm từ vựng');
    }
    
    closeModal('word-modal');
    this.renderWords(this.app.currentFolderId);
    this.updateGameButtons();
  }

  async deleteWord(wordId) {
    const confirm = await confirmAction('Bạn có chắc muốn xóa từ này?');
    if (confirm) {
      this.app.dataManager.deleteWord(this.app.currentFolderId, wordId);
      showToast('Đã xóa từ vựng');
      this.renderWords(this.app.currentFolderId);
      this.updateGameButtons();
    }
  }

  updateGameButtons() {
    const folder = this.app.dataManager.getFolder(this.app.currentFolderId);
    if (!folder) return;
    
    const wordCount = folder.words ? folder.words.length : 0;
    
    const quizBtn = document.getElementById('play-quiz-btn');
    const matchBtn = document.getElementById('play-match-btn');
    const flashcardBtn = document.getElementById('play-flashcard-btn');
    const listenBtn = document.getElementById('play-listening-btn');
    
    if (flashcardBtn) flashcardBtn.disabled = wordCount < 1;
    if (listenBtn) listenBtn.disabled = wordCount < 1;
    if (quizBtn) quizBtn.disabled = wordCount < 4;
    if (matchBtn) matchBtn.disabled = wordCount < 4;
  }

  handleImportSubmit(e) {
    e.preventDefault();
    if (!this.app.currentFolderId) return;
    
    const text = document.getElementById('import-text').value.trim();
    if (!text) return;
    
    const lines = text.split('\n');
    let imported = 0;
    
    lines.forEach(line => {
      // Try to split by " - " or tab or "-"
      let parts = line.split(/\s+-\s+|\t|-/);
      if (parts.length >= 2) {
        const english = parts[0].trim();
        const meaning = parts.slice(1).join(' - ').trim();
        if (english && meaning) {
          this.app.dataManager.addWord(this.app.currentFolderId, {
            english,
            meaning,
            type: '',
            phonetic: '',
            example: '',
            note: ''
          });
          imported++;
        }
      }
    });
    
    if (imported > 0) {
      showToast(`Đã nhập thành công ${imported} từ`);
      closeModal('import-modal');
      this.renderWords(this.app.currentFolderId);
      this.updateGameButtons();
      document.getElementById('import-form').reset();
    } else {
      showToast('Không tìm thấy từ hợp lệ để nhập. Vui lòng kiểm tra định dạng.', 'error');
    }
  }
}

// ============================================
// AUTO-SUGGEST (Free Dictionary API)
// ============================================

class AutoSuggest {
  constructor(app) {
    this.app = app;
    this.debounceTimer = null;
    this.posVietnamese = {
      'noun': 'Danh từ',
      'verb': 'Động từ',
      'adjective': 'Tính từ',
      'adverb': 'Trạng từ',
      'preposition': 'Giới từ',
      'conjunction': 'Liên từ',
      'pronoun': 'Đại từ',
      'interjection': 'Thán từ',
      'exclamation': 'Thán từ',
      'determiner': 'Mạo từ',
      'abbreviation': 'Viết tắt',
      'phrase': 'Cụm từ'
    };
    this.bindEvents();
  }

  bindEvents() {
    const input = document.getElementById('word-english');
    if (input) {
      input.addEventListener('input', (e) => {
        clearTimeout(this.debounceTimer);
        const val = e.target.value.trim();
        
        if (val.length < 2) {
          this.hidePanel();
          return;
        }
        
        this.debounceTimer = setTimeout(() => {
          this.fetchSuggestions(val);
        }, 500);
      });

      // Close panel on click outside
      document.addEventListener('click', (e) => {
        const panel = document.getElementById('auto-suggest-panel');
        const inputArea = document.querySelector('.input-with-suggest');
        if (panel && inputArea && !inputArea.contains(e.target) && !panel.contains(e.target)) {
          this.hidePanel();
        }
      });

      // Close panel on Escape
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.hidePanel();
        }
      });
    }
  }

  hidePanel() {
    const panel = document.getElementById('auto-suggest-panel');
    if (panel) panel.classList.add('hidden');
  }

  async fetchSuggestions(word) {
    this.showLoading();
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!response.ok) {
        this.hideLoading();
        this.showNotFound(word);
        return;
      }
      const data = await response.json();
      this.renderSuggestions(data);
    } catch (error) {
      this.hideLoading();
      this.hidePanel();
    }
  }

  showLoading() {
    document.getElementById('auto-suggest-panel').classList.remove('hidden');
    document.getElementById('suggest-loading').classList.remove('hidden');
    document.getElementById('suggest-results').innerHTML = '';
  }

  hideLoading() {
    document.getElementById('suggest-loading').classList.add('hidden');
  }

  showNotFound(word) {
    const panel = document.getElementById('auto-suggest-panel');
    const results = document.getElementById('suggest-results');
    panel.classList.remove('hidden');
    results.innerHTML = `
      <div class="suggest-not-found">
        <span>😕</span> Không tìm thấy "<strong>${word}</strong>" trong từ điển. Bạn có thể nhập thủ công.
      </div>
    `;
  }

  renderSuggestions(data) {
    this.hideLoading();
    const resultsContainer = document.getElementById('suggest-results');
    resultsContainer.innerHTML = '';
    
    if (!data || data.length === 0) {
      this.hidePanel();
      return;
    }

    const entry = data[0];
    
    // Extract phonetic
    let phonetic = entry.phonetic || '';
    if (!phonetic && entry.phonetics && entry.phonetics.length > 0) {
      const ph = entry.phonetics.find(p => p.text);
      if (ph) phonetic = ph.text;
    }

    // Header with word and phonetic
    if (phonetic) {
      const header = document.createElement('div');
      header.className = 'suggest-header';
      header.innerHTML = `
        <span class="suggest-word">${entry.word}</span>
        <span class="suggest-phonetic">${phonetic}</span>
        <button type="button" class="suggest-pronounce-btn" title="Phát âm">🔊</button>
      `;
      header.querySelector('.suggest-pronounce-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        pronounceWord(entry.word);
      });
      resultsContainer.appendChild(header);
    }

    // Meanings grouped by POS
    entry.meanings.forEach(meaning => {
      const pos = meaning.partOfSpeech;
      const posVi = this.posVietnamese[pos.toLowerCase()] || pos;

      // POS group header
      const posHeader = document.createElement('div');
      posHeader.className = 'suggest-pos-header';
      posHeader.innerHTML = `
        <span class="badge pos-${pos.toLowerCase()}">${pos}</span>
        <span class="suggest-pos-vi">${posVi}</span>
      `;
      resultsContainer.appendChild(posHeader);

      // Definitions (max 3 per POS)
      meaning.definitions.slice(0, 3).forEach((def, i) => {
        const item = document.createElement('div');
        item.className = 'suggest-item';
        
        let html = `
          <div class="suggest-item-num">${i + 1}</div>
          <div class="suggest-item-content">
            <div class="suggest-def">${def.definition}</div>
            ${def.example ? `<div class="suggest-ex">📝 "${def.example}"</div>` : ''}
          </div>
          <div class="suggest-select-btn" title="Chọn nghĩa này">✓</div>
        `;
        
        item.innerHTML = html;
        item.addEventListener('click', () => {
          this.applySuggestion(def.definition, pos, phonetic, def.example || '', meaning.synonyms || [], meaning.antonyms || []);
        });
        
        resultsContainer.appendChild(item);
      });

      // Synonyms / Antonyms
      if ((meaning.synonyms && meaning.synonyms.length > 0) || (meaning.antonyms && meaning.antonyms.length > 0)) {
        const relatedDiv = document.createElement('div');
        relatedDiv.className = 'suggest-related';
        let relatedHtml = '';
        if (meaning.synonyms && meaning.synonyms.length > 0) {
          relatedHtml += `<span class="suggest-label">Đồng nghĩa:</span> ${meaning.synonyms.slice(0, 5).join(', ')}`;
        }
        if (meaning.antonyms && meaning.antonyms.length > 0) {
          relatedHtml += `${meaning.synonyms && meaning.synonyms.length > 0 ? ' | ' : ''}<span class="suggest-label">Trái nghĩa:</span> ${meaning.antonyms.slice(0, 5).join(', ')}`;
        }
        relatedDiv.innerHTML = relatedHtml;
        resultsContainer.appendChild(relatedDiv);
      }
    });
  }

  applySuggestion(definition, posFromApi, phonetic, example, synonyms, antonyms) {
    // Set English definition into NOTE field (not meaning) 
    // so user can translate to Vietnamese themselves
    const noteInput = document.getElementById('word-note');
    let noteText = `📖 English: ${definition}`;
    if (synonyms && synonyms.length > 0) {
      noteText += `\n🔗 Synonyms: ${synonyms.slice(0, 5).join(', ')}`;
    }
    if (antonyms && antonyms.length > 0) {
      noteText += `\n🔀 Antonyms: ${antonyms.slice(0, 5).join(', ')}`;
    }
    noteInput.value = noteText;
    
    // Focus on meaning field so user can type Vietnamese meaning
    const meaningInput = document.getElementById('word-meaning');
    if (!meaningInput.value) {
      // Highlight that user needs to enter Vietnamese meaning
      meaningInput.focus();
      meaningInput.setAttribute('placeholder', 'Nhập nghĩa tiếng Việt cho từ này...');
    }
    
    // Map API POS to HTML select values (exact match)
    const typeSelect = document.getElementById('word-type');
    const posLower = posFromApi.toLowerCase();
    
    // Direct mapping - API returns same values as our select options
    const posMap = {
      'noun': 'noun',
      'verb': 'verb', 
      'adjective': 'adjective',
      'adverb': 'adverb',
      'preposition': 'preposition',
      'conjunction': 'conjunction',
      'pronoun': 'pronoun',
      'interjection': 'interjection',
      'exclamation': 'interjection'
    };
    
    const mappedValue = posMap[posLower];
    if (mappedValue) {
      typeSelect.value = mappedValue;
    }
    
    // Set phonetic
    if (phonetic) document.getElementById('word-phonetic').value = phonetic;
    
    // Set example
    if (example) document.getElementById('word-example').value = example;
    
    // Close panel
    this.hidePanel();
    
    showToast(`Đã chọn nghĩa "${posFromApi}". Hãy nhập nghĩa tiếng Việt!`, 'info');
  }
}

// ============================================
// FLASHCARD GAME
// ============================================

class FlashcardGame {
  constructor(app, words, isReview = false) {
    this.app = app;
    this.words = [...words];
    // Shuffle words
    this.words.sort(() => Math.random() - 0.5);
    this.isReview = isReview;
    this.currentIndex = 0;
    this.knownWords = [];
    this.unknownWords = [];
  }

  start() {
    this.app.router.navigate('flashcard');
    this.updateProgress();
    this.showCard(this.currentIndex);
    
    const card = document.getElementById('flashcard-card');
    card.classList.remove('flipped');
    
    // Clear old listeners by cloning
    const oldCard = document.getElementById('flashcard-card');
    const newCard = oldCard.cloneNode(true);
    oldCard.parentNode.replaceChild(newCard, oldCard);
    
    newCard.addEventListener('click', () => this.flipCard());
    
    const knowBtn = document.getElementById('know-btn');
    const newKnowBtn = knowBtn.cloneNode(true);
    knowBtn.parentNode.replaceChild(newKnowBtn, knowBtn);
    newKnowBtn.addEventListener('click', () => this.markKnown());
    
    const dontKnowBtn = document.getElementById('dont-know-btn');
    const newDontKnowBtn = dontKnowBtn.cloneNode(true);
    dontKnowBtn.parentNode.replaceChild(newDontKnowBtn, dontKnowBtn);
    newDontKnowBtn.addEventListener('click', () => this.markUnknown());
  }

  showCard(index) {
    const word = this.words[index];
    const card = document.getElementById('flashcard-card');
    card.classList.remove('flipped');
    
    document.querySelector('.flashcard-front .flashcard-word').textContent = word.english;
    document.querySelector('.flashcard-front .flashcard-phonetic').textContent = word.phonetic || '';
    
    const pronounceBtn = document.querySelector('.flashcard-front .flashcard-pronounce');
    const newPronounceBtn = pronounceBtn.cloneNode(true);
    pronounceBtn.parentNode.replaceChild(newPronounceBtn, pronounceBtn);
    newPronounceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pronounceWord(word.english);
    });
    
    const posEl = document.querySelector('.flashcard-back .flashcard-pos');
    if (word.type) {
      posEl.textContent = word.type;
      posEl.style.display = 'inline-block';
    } else {
      posEl.style.display = 'none';
    }
    
    document.querySelector('.flashcard-back .flashcard-meaning').textContent = word.meaning;
    document.querySelector('.flashcard-back .flashcard-example').textContent = word.example ? `"${word.example}"` : '';
  }

  flipCard() {
    document.getElementById('flashcard-card').classList.toggle('flipped');
  }

  markKnown() {
    const word = this.words[this.currentIndex];
    this.knownWords.push(word);
    
    if (this.isReview) {
      this.app.dataManager.updateReviewItem(word.id || word.wordId, true);
    }
    
    this.nextCard();
  }

  markUnknown() {
    const word = this.words[this.currentIndex];
    this.unknownWords.push(word);
    
    // Add to review
    this.app.dataManager.addToReview({
      wordId: word.id || word.wordId,
      folderId: this.app.currentFolderId || word.folderId,
      english: word.english,
      meaning: word.meaning,
      type: word.type,
      phonetic: word.phonetic,
      example: word.example
    });
    
    if (this.isReview) {
      this.app.dataManager.updateReviewItem(word.id || word.wordId, false);
    }
    
    this.nextCard();
  }

  nextCard() {
    this.currentIndex++;
    this.updateProgress();
    
    if (this.currentIndex < this.words.length) {
      this.showCard(this.currentIndex);
    } else {
      this.finish();
    }
  }

  updateProgress() {
    const progressFill = document.querySelector('#flashcard-progress .progress-fill');
    const counter = document.getElementById('flashcard-counter');
    
    const percent = ((this.currentIndex) / this.words.length) * 100;
    progressFill.style.width = `${percent}%`;
    counter.textContent = `${Math.min(this.currentIndex + 1, this.words.length)}/${this.words.length}`;
  }

  finish() {
    this.app.reviewManager.updateBadge();
    const percent = Math.round((this.knownWords.length / this.words.length) * 100);
    
    let msg = `Bạn đã hoàn thành bộ thẻ!\nNhớ: ${this.knownWords.length}\nChưa nhớ: ${this.unknownWords.length}\n\n`;
    if (this.unknownWords.length > 0) {
      msg += 'Các từ chưa nhớ đã được thêm vào danh sách ôn tập.';
    }
    
    if (percent >= 80) triggerConfetti();
    
    setTimeout(() => {
      alert(msg);
      if (this.isReview) {
        this.app.router.navigate('review');
      } else {
        this.app.router.navigate('folder');
      }
    }, 500);
  }
}

// ============================================
// QUIZ GAME
// ============================================

class QuizGame {
  constructor(app, words, isReview = false) {
    this.app = app;
    this.allWords = [...words]; // All available words to pick wrong options from
    this.questions = [];
    this.isReview = isReview;
    this.currentIndex = 0;
    this.score = 0;
    this.timer = null;
    this.timeLeft = 15;
    
    // Select words for questions (up to 20 or all)
    let quizWords = [...words].sort(() => Math.random() - 0.5).slice(0, 20);
    
    quizWords.forEach(word => {
      this.questions.push(this.generateQuestion(word));
    });
  }

  generateQuestion(targetWord) {
    const options = [{ text: targetWord.meaning, isCorrect: true }];
    const wrongWords = this.allWords.filter(w => w.id !== targetWord.id && w.meaning !== targetWord.meaning);
    const shuffledWrong = wrongWords.sort(() => Math.random() - 0.5).slice(0, 3);
    
    shuffledWrong.forEach(w => {
      options.push({ text: w.meaning, isCorrect: false });
    });
    
    // If not enough wrong options in folder, generate dummy ones
    while (options.length < 4) {
      options.push({ text: `Lựa chọn ngẫu nhiên ${options.length}`, isCorrect: false });
    }
    
    return {
      word: targetWord,
      options: options.sort(() => Math.random() - 0.5)
    };
  }

  start() {
    this.app.router.navigate('quiz');
    document.getElementById('quiz-result').classList.add('hidden');
    this.showQuestion(this.currentIndex);
    
    const replayBtn = document.querySelector('#quiz-result .replay-btn');
    const newReplayBtn = replayBtn.cloneNode(true);
    replayBtn.parentNode.replaceChild(newReplayBtn, replayBtn);
    newReplayBtn.addEventListener('click', () => {
      if (this.isReview) {
        this.app.reviewManager.startReviewGame('quiz');
      } else {
        const game = new QuizGame(this.app, this.allWords, this.isReview);
        this.app.currentGame = game;
        game.start();
      }
    });
  }

  showQuestion(index) {
    const q = this.questions[index];
    document.getElementById('quiz-question').textContent = q.word.english;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      btn.dataset.index = i;
      btn.addEventListener('click', () => this.selectAnswer(opt.text, btn));
      optionsContainer.appendChild(btn);
    });
    
    this.updateProgress();
    this.startTimer();
  }

  startTimer() {
    clearInterval(this.timer);
    this.timeLeft = 15;
    const timerEl = document.getElementById('quiz-timer');
    timerEl.textContent = this.timeLeft;
    
    this.timer = setInterval(() => {
      this.timeLeft--;
      timerEl.textContent = this.timeLeft;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.handleTimeout();
      }
    }, 1000);
  }

  handleTimeout() {
    const optionsContainer = document.getElementById('quiz-options');
    const buttons = Array.from(optionsContainer.querySelectorAll('.quiz-option'));
    
    buttons.forEach(btn => btn.disabled = true);
    
    const q = this.questions[this.currentIndex];
    
    // Highlight correct
    buttons.forEach(btn => {
      if (btn.textContent === q.word.meaning) {
        btn.classList.add('correct');
      }
    });
    
    this.recordWrongAnswer(q.word);
    
    setTimeout(() => this.nextQuestion(), 1500);
  }

  selectAnswer(selectedText, btnEl) {
    clearInterval(this.timer);
    const optionsContainer = document.getElementById('quiz-options');
    const buttons = Array.from(optionsContainer.querySelectorAll('.quiz-option'));
    buttons.forEach(btn => btn.disabled = true);
    
    const q = this.questions[this.currentIndex];
    const isCorrect = selectedText === q.word.meaning;
    
    if (isCorrect) {
      btnEl.classList.add('correct');
      this.score++;
      if (this.isReview) {
        this.app.dataManager.updateReviewItem(q.word.id || q.word.wordId, true);
      }
    } else {
      btnEl.classList.add('wrong');
      // Find correct and highlight
      buttons.forEach(btn => {
        if (btn.textContent === q.word.meaning) {
          btn.classList.add('correct');
        }
      });
      this.recordWrongAnswer(q.word);
    }
    
    setTimeout(() => this.nextQuestion(), 1500);
  }

  recordWrongAnswer(word) {
    this.app.dataManager.addToReview({
      wordId: word.id || word.wordId,
      folderId: this.app.currentFolderId || word.folderId,
      english: word.english,
      meaning: word.meaning,
      type: word.type,
      phonetic: word.phonetic,
      example: word.example
    });
    if (this.isReview) {
      this.app.dataManager.updateReviewItem(word.id || word.wordId, false);
    }
  }

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex < this.questions.length) {
      this.showQuestion(this.currentIndex);
    } else {
      this.finish();
    }
  }

  updateProgress() {
    const progressFill = document.querySelector('#quiz-progress .progress-fill');
    const scoreEl = document.getElementById('quiz-score');
    
    const percent = (this.currentIndex / this.questions.length) * 100;
    progressFill.style.width = `${percent}%`;
    scoreEl.textContent = `Điểm: ${this.score}`;
  }

  finish() {
    this.app.reviewManager.updateBadge();
    const resultScreen = document.getElementById('quiz-result');
    const resultScore = resultScreen.querySelector('.result-score');
    const resultDetails = resultScreen.querySelector('.result-details');
    
    const percent = Math.round((this.score / this.questions.length) * 100);
    
    resultScore.textContent = `${this.score} / ${this.questions.length}`;
    
    let comment = '';
    if (percent === 100) comment = 'Tuyệt hảo! Bạn đã nắm vững các từ này.';
    else if (percent >= 80) comment = 'Rất tốt! Chỉ sai một vài từ nhỏ.';
    else if (percent >= 50) comment = 'Khá tốt! Hãy ôn tập thêm để cải thiện.';
    else comment = 'Đừng nản chí! Hãy sử dụng tính năng ôn tập để học lại các từ chưa thuộc.';
    
    resultDetails.textContent = comment;
    resultScreen.classList.remove('hidden');
    
    if (percent >= 80) triggerConfetti();
  }
}

// ============================================
// MATCH GAME
// ============================================

class MatchGame {
  constructor(app, words) {
    this.app = app;
    // Take up to 6 words
    this.words = [...words].sort(() => Math.random() - 0.5).slice(0, 6);
    this.tiles = [];
    this.selectedTile = null;
    this.matchedPairs = 0;
    this.timeElapsed = 0;
    this.timerInterval = null;
  }

  start() {
    this.app.router.navigate('match');
    document.getElementById('match-result').classList.add('hidden');
    
    const grid = document.getElementById('match-grid');
    grid.innerHTML = '';
    
    this.words.forEach(word => {
      this.tiles.push({ text: word.english, type: 'english', wordId: word.id || word.wordId });
      this.tiles.push({ text: word.meaning, type: 'vietnamese', wordId: word.id || word.wordId });
    });
    
    this.tiles.sort(() => Math.random() - 0.5);
    
    this.tiles.forEach(tile => {
      const el = document.createElement('div');
      el.className = 'match-tile';
      el.textContent = tile.text;
      el.dataset.type = tile.type;
      el.dataset.wordId = tile.wordId;
      el.addEventListener('click', () => this.selectTile(el));
      grid.appendChild(el);
    });
    
    document.getElementById('match-pairs').textContent = `0/${this.words.length}`;
    this.startTimer();
  }

  startTimer() {
    this.timeElapsed = 0;
    const timerEl = document.getElementById('match-timer');
    timerEl.textContent = '0.0s';
    
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeElapsed += 0.1;
      timerEl.textContent = `${this.timeElapsed.toFixed(1)}s`;
    }, 100);
  }

  selectTile(tileEl) {
    if (tileEl.classList.contains('matched') || tileEl.classList.contains('wrong') || tileEl === this.selectedTile) {
      return;
    }
    
    if (!this.selectedTile) {
      // First selection
      this.selectedTile = tileEl;
      tileEl.classList.add('selected');
    } else {
      // Second selection
      if (this.selectedTile.dataset.type === tileEl.dataset.type) {
        // Selected same type, just switch selection
        this.selectedTile.classList.remove('selected');
        this.selectedTile = tileEl;
        tileEl.classList.add('selected');
      } else {
        // Different types, check match
        const isMatch = this.selectedTile.dataset.wordId === tileEl.dataset.wordId;
        const tile1 = this.selectedTile;
        const tile2 = tileEl;
        
        tile1.classList.remove('selected');
        
        if (isMatch) {
          tile1.classList.add('matched');
          tile2.classList.add('matched');
          this.matchedPairs++;
          document.getElementById('match-pairs').textContent = `${this.matchedPairs}/${this.words.length}`;
          this.checkComplete();
        } else {
          tile1.classList.add('wrong');
          tile2.classList.add('wrong');
          setTimeout(() => {
            tile1.classList.remove('wrong');
            tile2.classList.remove('wrong');
          }, 500);
        }
        this.selectedTile = null;
      }
    }
  }

  checkComplete() {
    if (this.matchedPairs === this.words.length) {
      clearInterval(this.timerInterval);
      setTimeout(() => this.finish(), 500);
    }
  }

  finish() {
    const resultScreen = document.getElementById('match-result');
    const resultScore = resultScreen.querySelector('.result-score');
    resultScore.textContent = `${this.timeElapsed.toFixed(1)} giây`;
    resultScreen.classList.remove('hidden');
    triggerConfetti();
    
    const replayBtn = resultScreen.querySelector('.replay-btn');
    if (!replayBtn.dataset.bound) {
      replayBtn.addEventListener('click', () => {
        const folder = this.app.dataManager.getFolder(this.app.currentFolderId);
        if (folder) {
          const game = new MatchGame(this.app, folder.words);
          this.app.currentGame = game;
          game.start();
        }
      });
      replayBtn.dataset.bound = "true";
    }
  }
}

// ============================================
// LISTENING GAME
// ============================================

class ListeningGame {
  constructor(app, words, isReview = false) {
    this.app = app;
    this.words = [...words].sort(() => Math.random() - 0.5).slice(0, 20);
    this.isReview = isReview;
    this.currentIndex = 0;
    this.score = 0;
    this.hintUsed = false;
  }

  start() {
    this.app.router.navigate('listening');
    document.getElementById('listening-result').classList.add('hidden');
    
    // Bind buttons if not already bound
    const playBtn = document.getElementById('listening-play-btn');
    const slowBtn = document.getElementById('listening-slow-btn');
    const submitBtn = document.getElementById('listening-submit-btn');
    const hintBtn = document.getElementById('listening-hint-btn');
    const inputEl = document.getElementById('listening-input');
    
    // Clone to remove old listeners
    const newPlay = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newPlay, playBtn);
    const newSlow = slowBtn.cloneNode(true);
    slowBtn.parentNode.replaceChild(newSlow, slowBtn);
    const newSubmit = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
    const newHint = hintBtn.cloneNode(true);
    hintBtn.parentNode.replaceChild(newHint, hintBtn);
    const newInput = inputEl.cloneNode(true);
    inputEl.parentNode.replaceChild(newInput, inputEl);
    
    newPlay.addEventListener('click', () => this.playAudio(1));
    newSlow.addEventListener('click', () => this.playAudio(0.6));
    newSubmit.addEventListener('click', () => this.checkAnswer());
    newHint.addEventListener('click', () => this.showHint());
    newInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.checkAnswer();
    });
    
    this.showWord(this.currentIndex);
  }

  showWord(index) {
    this.hintUsed = false;
    const inputEl = document.getElementById('listening-input');
    inputEl.value = '';
    inputEl.disabled = false;
    inputEl.focus();
    
    const feedback = document.getElementById('listening-feedback');
    feedback.textContent = '';
    feedback.className = 'feedback';
    
    this.updateProgress();
    this.playAudio(1);
  }

  playAudio(rate) {
    const word = this.words[this.currentIndex];
    pronounceWord(word.english, rate);
  }

  showHint() {
    this.hintUsed = true;
    const word = this.words[this.currentIndex].english;
    const feedback = document.getElementById('listening-feedback');
    feedback.className = 'feedback info';
    feedback.textContent = `Gợi ý: ${word.charAt(0)}${'_'.repeat(word.length - 1)} (${word.length} chữ cái)`;
  }

  checkAnswer() {
    const inputEl = document.getElementById('listening-input');
    const val = inputEl.value.trim().toLowerCase();
    const word = this.words[this.currentIndex];
    const target = word.english.toLowerCase();
    
    if (!val) return;
    
    inputEl.disabled = true;
    const feedback = document.getElementById('listening-feedback');
    
    if (val === target) {
      feedback.className = 'feedback success';
      feedback.textContent = 'Chính xác! ✅';
      this.score++;
      if (this.isReview) {
        this.app.dataManager.updateReviewItem(word.id || word.wordId, true);
      }
      setTimeout(() => this.nextWord(), 1500);
    } else {
      feedback.className = 'feedback error';
      feedback.textContent = `Sai rồi. Đáp án đúng là: ${word.english}`;
      
      this.app.dataManager.addToReview({
        wordId: word.id || word.wordId,
        folderId: this.app.currentFolderId || word.folderId,
        english: word.english,
        meaning: word.meaning,
        type: word.type,
        phonetic: word.phonetic,
        example: word.example
      });
      if (this.isReview) {
        this.app.dataManager.updateReviewItem(word.id || word.wordId, false);
      }
      
      setTimeout(() => this.nextWord(), 2500);
    }
  }

  nextWord() {
    this.currentIndex++;
    if (this.currentIndex < this.words.length) {
      this.showWord(this.currentIndex);
    } else {
      this.finish();
    }
  }

  updateProgress() {
    const progressFill = document.querySelector('#listening-progress .progress-fill');
    const counter = document.getElementById('listening-counter');
    
    const percent = (this.currentIndex / this.words.length) * 100;
    progressFill.style.width = `${percent}%`;
    counter.textContent = `${this.currentIndex + 1}/${this.words.length}`;
  }

  finish() {
    this.app.reviewManager.updateBadge();
    const resultScreen = document.getElementById('listening-result');
    const resultScore = resultScreen.querySelector('.result-score');
    
    const percent = Math.round((this.score / this.words.length) * 100);
    resultScore.textContent = `${this.score} / ${this.words.length}`;
    
    resultScreen.classList.remove('hidden');
    
    if (percent >= 80) triggerConfetti();
    
    const replayBtn = resultScreen.querySelector('.replay-btn');
    const newReplay = replayBtn.cloneNode(true);
    replayBtn.parentNode.replaceChild(newReplay, replayBtn);
    newReplay.addEventListener('click', () => {
      if (this.isReview) {
        this.app.reviewManager.startReviewGame('listening');
      } else {
        const game = new ListeningGame(this.app, this.words, this.isReview);
        this.app.currentGame = game;
        game.start();
      }
    });
  }
}

// ============================================
// REVIEW MANAGER
// ============================================

class ReviewManager {
  constructor(app) {
    this.app = app;
  }

  updateBadge() {
    this.clearMastered();
    const reviews = this.app.dataManager.getReviewList();
    const badge = document.getElementById('review-badge');
    if (badge) {
      if (reviews.length > 0) {
        badge.textContent = reviews.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  clearMastered() {
    let reviews = this.app.dataManager.getReviewList();
    const initialLength = reviews.length;
    reviews = reviews.filter(r => (r.correctStreak || 0) < 3);
    if (reviews.length !== initialLength) {
      localStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviews));
    }
  }

  renderReviewScreen() {
    this.clearMastered();
    const reviews = this.app.dataManager.getReviewList();
    
    document.getElementById('review-total').textContent = reviews.length;
    // For simplicity, we just show 0 for mastered here since they are removed
    document.getElementById('review-mastered').textContent = '0'; 
    
    const container = document.getElementById('review-list');
    const emptyState = document.getElementById('empty-review');
    
    const flashcardBtn = document.getElementById('review-flashcard-btn');
    const quizBtn = document.getElementById('review-quiz-btn');
    
    if (reviews.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      if (flashcardBtn) flashcardBtn.disabled = true;
      if (quizBtn) quizBtn.disabled = true;
    } else {
      emptyState.classList.add('hidden');
      if (flashcardBtn) flashcardBtn.disabled = false;
      if (quizBtn) quizBtn.disabled = reviews.length < 4;
      
      container.innerHTML = reviews.map(word => `
        <div class="word-card">
          <div class="word-card-content">
            <div class="word-header">
              <span class="word-english">${word.english}</span>
              ${word.phonetic ? `<span class="word-phonetic">${word.phonetic}</span>` : ''}
              <span class="badge" style="background-color: var(--danger)">Sai ${word.wrongCount || 0} lần</span>
              <span class="badge" style="background-color: var(--success)">Đúng ${word.correctStreak || 0}/3</span>
            </div>
            <div class="word-meaning-container">
              ${word.type ? `<span class="word-type badge pos-${word.type}">${word.type}</span>` : ''}
              <span class="word-meaning">${word.meaning}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  startReviewGame(gameType) {
    const reviews = this.app.dataManager.getReviewList();
    if (reviews.length === 0) return;
    
    if (gameType === 'flashcard') {
      const game = new FlashcardGame(this.app, reviews, true);
      this.app.currentGame = game;
      game.start();
    } else if (gameType === 'quiz') {
      if (reviews.length < 4) {
        showToast('Cần ít nhất 4 từ để chơi Quiz', 'error');
        return;
      }
      const game = new QuizGame(this.app, reviews, true);
      this.app.currentGame = game;
      game.start();
    } else if (gameType === 'listening') {
      const game = new ListeningGame(this.app, reviews, true);
      this.app.currentGame = game;
      game.start();
    }
  }
}

// ============================================
// APP INITIALIZATION
// ============================================

class App {
  constructor() {
    this.dataManager = new DataManager();
    this.router = new Router(this);
    this.folderManager = new FolderManager(this);
    this.vocabManager = new VocabManager(this);
    this.autoSuggest = new AutoSuggest(this);
    this.reviewManager = new ReviewManager(this);
    this.currentFolderId = null;
    this.currentGame = null;
  }
  
  init() {
    this.bindEvents();
    this.loadTheme();
    this.folderManager.renderFolders();
    this.reviewManager.updateBadge();
  }
  
  bindEvents() {
    // Nav links
    document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = item.dataset.nav;
        this.router.navigate(screen);
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Folder search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.folderManager.renderFolders(e.target.value);
      });
    }

    // Buttons opening modals
    const createFolderBtn = document.getElementById('create-folder-btn');
    if (createFolderBtn) {
      createFolderBtn.addEventListener('click', () => this.folderManager.openCreateModal());
    }
    
    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) {
      addWordBtn.addEventListener('click', () => this.vocabManager.openAddModal());
    }

    const importBtn = document.getElementById('import-words-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        document.getElementById('import-form').reset();
        showModal('import-modal');
      });
    }

    // Forms
    const folderForm = document.getElementById('folder-form');
    if (folderForm) {
      folderForm.addEventListener('submit', (e) => this.folderManager.handleFormSubmit(e));
    }

    const wordForm = document.getElementById('word-form');
    if (wordForm) {
      wordForm.addEventListener('submit', (e) => this.vocabManager.handleFormSubmit(e));
    }

    const importForm = document.getElementById('import-form');
    if (importForm) {
      importForm.addEventListener('submit', (e) => this.vocabManager.handleImportSubmit(e));
    }

    // Modals close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Prevent default in case it's a form button
        e.preventDefault();
        closeModal(btn.dataset.closeModal);
      });
    });

    // Overlay click to close
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(m => {
          if (!m.classList.contains('hidden')) {
            closeModal(m.id);
          }
        });
      });
    }
    
    // Stop propagation inside modals
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', e => e.stopPropagation());
    });

    // Back to home from folder
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.router.navigate('home'));
    }

    // Back to folder from games
    document.querySelectorAll('.back-to-folder').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentGame && this.currentGame.isReview) {
          this.router.navigate('review');
        } else {
          this.router.navigate('folder');
        }
      });
    });

    // Folder actions in detail screen
    const editFolderBtn = document.getElementById('edit-folder-btn');
    if (editFolderBtn) {
      editFolderBtn.addEventListener('click', () => {
        if (this.currentFolderId) this.folderManager.openEditModal(this.currentFolderId);
      });
    }

    const delFolderBtn = document.getElementById('delete-folder-btn');
    if (delFolderBtn) {
      delFolderBtn.addEventListener('click', () => {
        if (this.currentFolderId) this.folderManager.deleteFolder(this.currentFolderId);
      });
    }

    // Play games buttons in folder
    const setupGameBtn = (id, GameClass, minWords = 1) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          const folder = this.dataManager.getFolder(this.currentFolderId);
          if (folder && folder.words && folder.words.length >= minWords) {
            const game = new GameClass(this, folder.words);
            this.currentGame = game;
            game.start();
          } else {
            showToast(`Cần ít nhất ${minWords} từ để chơi game này`, 'error');
          }
        });
      }
    };

    setupGameBtn('play-flashcard-btn', FlashcardGame, 1);
    setupGameBtn('play-quiz-btn', QuizGame, 4);
    setupGameBtn('play-match-btn', MatchGame, 4);
    setupGameBtn('play-listening-btn', ListeningGame, 1);

    // Review games
    const reviewFlashcard = document.getElementById('review-flashcard-btn');
    if (reviewFlashcard) {
      reviewFlashcard.addEventListener('click', () => this.reviewManager.startReviewGame('flashcard'));
    }
    const reviewQuiz = document.getElementById('review-quiz-btn');
    if (reviewQuiz) {
      reviewQuiz.addEventListener('click', () => this.reviewManager.startReviewGame('quiz'));
    }
    
    // Pronounce preview in add word modal
    const previewBtn = document.getElementById('word-pronounce-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const word = document.getElementById('word-english').value.trim();
        if (word) pronounceWord(word);
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => {
          if (!m.classList.contains('hidden')) closeModal(m.id);
        });
      }
    });
  }
  
  loadTheme() {
    const theme = this.dataManager.getSettings().theme || 'dark';
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.textContent = theme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }
  
  toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';
    document.body.className = `${newTheme}-theme`;
    this.dataManager.saveSetting('theme', newTheme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.textContent = newTheme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }
}

// Start the app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

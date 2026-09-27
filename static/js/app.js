let currentFilter = 'all';
let currentImageBase64 = null;

// DOM要素の参照
const navTimeline = document.getElementById('nav-timeline');
const navPost = document.getElementById('nav-post');
const viewTimeline = document.getElementById('view-timeline');
const viewPost = document.getElementById('view-post');

const postForm = document.getElementById('post-form');
const postTitle = document.getElementById('post-title');
const postMemo = document.getElementById('post-memo');
const postAnonymous = document.getElementById('post-anonymous');
const charCounter = document.getElementById('char-counter');

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const dropPrompt = document.getElementById('drop-prompt');
const previewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const btnRemoveImage = document.getElementById('btn-remove-image');

const timelineList = document.getElementById('timeline-list');
const filterTabs = document.querySelectorAll('.filter-tab');

const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const btnCloseModal = document.getElementById('btn-close-modal');

// 画面切り替え
function switchView(toView) {
  if (toView === 'timeline') {
    viewTimeline.classList.remove('hidden');
    viewPost.classList.add('hidden');
    navTimeline.className = 'nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition bg-white text-indigo-700 shadow';
    navPost.className = 'nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition text-indigo-100 hover:bg-indigo-500';
    loadPosts();
  } else {
    viewPost.classList.remove('hidden');
    viewTimeline.classList.add('hidden');
    navPost.className = 'nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition bg-white text-indigo-700 shadow';
    navTimeline.className = 'nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition text-indigo-100 hover:bg-indigo-500';
  }
}

navTimeline.addEventListener('click', () => switchView('timeline'));
navPost.addEventListener('click', () => switchView('post'));

// 文字数カウント
postMemo.addEventListener('input', (e) => {
  charCounter.textContent = `${e.target.value.length} / 100文字`;
});

// 画像プレビュー設定
function setImagePreview(base64Data) {
  currentImageBase64 = base64Data;
  imagePreview.src = base64Data;
  previewContainer.classList.remove('hidden');
  dropPrompt.classList.add('hidden');
}

function clearImagePreview() {
  currentImageBase64 = null;
  imagePreview.src = '';
  fileInput.value = '';
  previewContainer.classList.add('hidden');
  dropPrompt.classList.remove('hidden');
}

btnRemoveImage.addEventListener('click', (e) => {
  e.stopPropagation();
  clearImagePreview();
});

dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target.result);
    reader.readAsDataURL(file);
  }
});

// ドラッグ＆ドロップ対応
dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});
['dragleave', 'drop'].forEach(type => {
  dropArea.addEventListener(type, () => dropArea.classList.remove('dragover'));
});
dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target.result);
    reader.readAsDataURL(e.dataTransfer.files[0]);
  }
});

// クリップボード貼り付け (Ctrl + V) 対応
window.addEventListener('paste', (e) => {
  const items = (e.clipboardData || window.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
        if (viewPost.classList.contains('hidden')) {
          switchView('post');
        }
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
});

// 投稿送信
postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: postTitle.value,
    memo: postMemo.value,
    image: currentImageBase64,
    is_anonymous: postAnonymous.checked,
    author_name: postAnonymous.checked ? '匿名メンバー' : '社内エンジニア'
  };

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      postForm.reset();
      clearImagePreview();
      charCounter.textContent = '0 / 100文字';
      switchView('timeline');
    }
  } catch (err) {
    alert('投稿に失敗しました');
  }
});

// タイムライン描画
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    renderTimeline(posts);
  } catch (err) {
    timelineList.innerHTML = '<p class="text-sm text-red-500">投稿の取得に失敗しました</p>';
  }
}

function renderTimeline(posts) {
  timelineList.innerHTML = '';

  const filtered = posts.filter(post => {
    if (currentFilter === 'unresolved') return !post.is_resolved;
    if (currentFilter === 'resolved') return post.is_resolved;
    if (currentFilter === 'anonymous') return post.is_anonymous;
    return true;
  });

  if (filtered.length === 0) {
    timelineList.innerHTML = `
      <div class="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
        <span class="text-4xl block mb-2">📭</span>
        <p class="text-sm">該当する投稿がまだありません</p>
      </div>`;
    return;
  }

  filtered.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3';

    // 解決バッジ
    const statusBadge = post.is_resolved
      ? '<span class="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">✓ 解決済み</span>'
      : '<span class="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">❓ 回答募集中</span>';

    // 匿名バッジ
    const authorBadge = post.is_anonymous
      ? '<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">🕶️ 匿名メンバー</span>'
      : `<span class="text-xs text-slate-500">👤 ${escapeHtml(post.author_name)}</span>`;

    // コメントリストHTML
    const commentsHtml = (post.comments || []).map(c => `
      <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
        <div class="flex justify-between text-slate-400">
          <span class="font-semibold text-slate-600">${c.is_anonymous ? '🕶️ 匿名' : escapeHtml(c.author_name)}</span>
          <span>${c.created_at}</span>
        </div>
        <p class="text-slate-700 whitespace-pre-wrap">${escapeHtml(c.text)}</p>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            ${statusBadge}
            ${authorBadge}
            <span class="text-[11px] text-slate-400">${post.created_at}</span>
          </div>
          <h3 class="font-bold text-slate-800 text-base leading-snug">${escapeHtml(post.title)}</h3>
        </div>
        <button class="btn-resolve text-xs px-3 py-1 rounded border transition font-medium ${post.is_resolved ? 'border-slate-300 text-slate-500 hover:bg-slate-100' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'}" data-id="${post.id}">
          ${post.is_resolved ? '未解決に戻す' : '解決済みにする'}
        </button>
      </div>

      ${post.memo ? `<p class="text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/60 leading-relaxed">${escapeHtml(post.memo)}</p>` : ''}

      ${post.image ? `
        <div class="pt-1">
          <img src="${post.image}" alt="スクショ" class="max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition border object-contain bg-slate-50 post-thumbnail" data-src="${post.image}">
        </div>
      ` : ''}

      <!-- コメント・回答エリア -->
      <div class="pt-3 border-t border-slate-100 space-y-2">
        <div class="space-y-1.5">${commentsHtml}</div>
        <form class="comment-form flex items-center space-x-2 pt-1" data-id="${post.id}">
          <input type="text" placeholder="わかる人・アドバイスをコメント..." required class="comment-input flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <label class="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
            <input type="checkbox" class="comment-anonymous rounded text-indigo-600">
            <span>匿名</span>
          </label>
          <button type="submit" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">送信</button>
        </form>
      </div>
    `;

    timelineList.appendChild(card);
  });

  // サムネイルクリックで拡大モーダル
  document.querySelectorAll('.post-thumbnail').forEach(img => {
    img.addEventListener('click', () => {
      modalImg.src = img.getAttribute('data-src');
      imageModal.classList.remove('hidden');
    });
  });

  // 解決ボタンイベント
  document.querySelectorAll('.btn-resolve').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.getAttribute('data-id');
      await fetch(`/api/posts/${postId}/resolve`, { method: 'PATCH' });
      loadPosts();
    });
  });

  // コメント送信イベント
  document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const postId = form.getAttribute('data-id');
      const textInput = form.querySelector('.comment-input');
      const anonInput = form.querySelector('.comment-anonymous');

      await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textInput.value,
          is_anonymous: anonInput.checked
        })
      });

      loadPosts();
    });
  });
}

// フィルタ切り替え
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.className = 'filter-tab px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100');
    tab.className = 'filter-tab px-3 py-1 rounded-lg text-indigo-600 bg-indigo-50 font-bold';
    currentFilter = tab.getAttribute('data-filter');
    loadPosts();
  });
});

// モーダル閉じる
btnCloseModal.addEventListener('click', () => imageModal.classList.add('hidden'));
imageModal.addEventListener('click', (e) => {
  if (e.target === imageModal) imageModal.classList.add('hidden');
});

// XSSサニタイズ補助
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// 初回読み込み
loadPosts();
// ==========================================
// SES ナレッジ＆スクショ共有ボード app.js 完全版
// ==========================================

// --- 状態管理 ---
let currentImageData = null;
let currentFilter = "all";
let cachedPosts = [];

// --- DOM 要素の取得 ---
// ナビゲーション & ビュー
const navTimeline = document.getElementById("nav-timeline");
const navPost = document.getElementById("nav-post");
const viewTimeline = document.getElementById("view-timeline");
const viewPost = document.getElementById("view-post");

// 投稿フォーム関連
const postForm = document.getElementById("post-form");
const postTitle = document.getElementById("post-title");
const postMemo = document.getElementById("post-memo");
const charCounter = document.getElementById("char-counter");
const postAnonymous = document.getElementById("post-anonymous");
const btnSubmit = document.getElementById("btn-submit");

// 画像アップロード・プレビュー関連
const dropArea = document.getElementById("drop-area");
const dropPrompt = document.getElementById("drop-prompt");
const fileInput = document.getElementById("file-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const btnRemoveImage = document.getElementById("btn-remove-image");

// タイムライン・一覧関連
const timelineList = document.getElementById("timeline-list");
const filterTabs = document.querySelectorAll(".filter-tab");

// 画像拡大モーダル関連
const imageModal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const btnCloseModal = document.getElementById("btn-close-modal");


// ==========================================
// 1. ビュー（画面）切り替え処理
// ==========================================
function switchView(targetView) {
  if (targetView === "post") {
    viewPost.classList.remove("hidden");
    viewTimeline.classList.add("hidden");

    // ボタンのスタイル切り替え
    navPost.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition bg-white text-indigo-700 shadow";
    navTimeline.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition text-indigo-100 hover:bg-indigo-500";
  } else {
    viewTimeline.classList.remove("hidden");
    viewPost.classList.add("hidden");

    // ボタンのスタイル切り替え
    navTimeline.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition bg-white text-indigo-700 shadow";
    navPost.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition text-indigo-100 hover:bg-indigo-500";
  }
}

if (navTimeline) navTimeline.addEventListener("click", () => switchView("timeline"));
if (navPost) navPost.addEventListener("click", () => switchView("post"));


// ==========================================
// 2. 文字数カウンター
// ==========================================
if (postMemo && charCounter) {
  postMemo.addEventListener("input", () => {
    const count = postMemo.value.length;
    charCounter.textContent = `${count} / 100文字`;
    if (count >= 100) {
      charCounter.classList.add("text-red-500");
    } else {
      charCounter.classList.remove("text-red-500");
    }
  });
}


// ==========================================
// 3. 画像処理（圧縮・プレビュー・D&D・ペースト）
// ==========================================
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
    };
  });
}

async function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  currentImageData = await compressImage(file);
  imagePreview.src = currentImageData;
  imagePreviewContainer.classList.remove("hidden");
  dropPrompt.classList.add("hidden");
}

function clearImage() {
  currentImageData = null;
  imagePreview.src = "";
  imagePreviewContainer.classList.add("hidden");
  dropPrompt.classList.remove("hidden");
  if (fileInput) fileInput.value = "";
}

// ドロップ領域クリックでファイル選択ダイアログを開く
if (dropArea) {
  dropArea.addEventListener("click", (e) => {
    // 削除ボタン押下時はダイアログを開かない
    if (e.target.closest("#btn-remove-image")) return;
    if (fileInput) fileInput.click();
  });

  // ドラッグ＆ドロップ
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("border-indigo-500", "bg-indigo-50");
  });

  dropArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-indigo-500", "bg-indigo-50");
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-indigo-500", "bg-indigo-50");
    if (e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });
}

// ファイル選択時
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });
}

// クリップボードからの画像貼り付け (Ctrl + V)
window.addEventListener("paste", (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData)?.items;
  if (!items) return;

  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      handleImageFile(file);
      break;
    }
  }
});

// 画像削除ボタン
if (btnRemoveImage) {
  btnRemoveImage.addEventListener("click", (e) => {
    e.stopPropagation();
    clearImage();
  });
}


// ==========================================
// 4. 投稿送信処理
// ==========================================
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = postTitle.value.trim();
    const memo = postMemo.value.trim();

    if (!title) {
      alert("タイトルを入力してください");
      return;
    }

    const payload = {
      title: title,
      content: memo,
      is_anonymous: postAnonymous.checked,
      image_data: currentImageData
    };

    // 二重送信防止
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "投稿中...";
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // フォームリセット
        postTitle.value = "";
        postMemo.value = "";
        postAnonymous.checked = false;
        if (charCounter) charCounter.textContent = "0 / 100文字";
        clearImage();

        // タイムライン画面に遷移して最新取得
        switchView("timeline");
        loadPosts();
      } else {
        alert("投稿に失敗しました。時間をおいて再試行してください。");
      }
    } catch (err) {
      console.error("投稿の送信に失敗しました:", err);
      alert("ネットワークエラーが発生しました。");
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "この内容で投稿する";
      }
    }
  });
}


// ==========================================
// 5. タイムライン表示・フィルター処理
// ==========================================
async function loadPosts() {
  try {
    const res = await fetch("/api/posts");
    cachedPosts = await res.json();
    renderPosts();
  } catch (err) {
    console.error("投稿の読み込みに失敗しました:", err);
    if (timelineList) {
      timelineList.innerHTML = `
        <div class="text-center py-12 text-rose-500 bg-white rounded-xl shadow-sm border border-rose-100">
          投稿の読み込みに失敗しました。サーバーが起動しているか確認してください。
        </div>
      `;
    }
  }
}

function renderPosts() {
  if (!timelineList) return;
  timelineList.innerHTML = "";

  const filteredPosts = cachedPosts.filter((post) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "unresolved") return !post.is_resolved;
    if (currentFilter === "resolved") return post.is_resolved;
    if (currentFilter === "anonymous") return post.is_anonymous;
    return true;
  });

  if (filteredPosts.length === 0) {
    timelineList.innerHTML = `
      <div class="text-center py-12 text-slate-400 bg-white rounded-xl shadow-sm border border-slate-200">
        該当する投稿がありません。
      </div>
    `;
    return;
  }

  filteredPosts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3";

    const dateStr = post.created_at ? new Date(post.created_at).toLocaleString("ja-JP") : "";
    const authorName = post.is_anonymous ? "🕶️ 匿名スタッフ" : "👤 社内メンバー";
    const statusBadge = post.is_resolved
      ? '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">解決済み</span>'
      : '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">未解決</span>';

    card.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center gap-2 flex-wrap">
          ${statusBadge}
          <span class="text-xs font-medium text-slate-600">${authorName}</span>
          ${dateStr ? `<span class="text-xs text-slate-400">• ${dateStr}</span>` : ""}
        </div>
        <button onclick="toggleResolved('${post.id}')" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition">
          ${post.is_resolved ? "未解決に戻す" : "解決済みにする"}
        </button>
      </div>

      <div>
        <h3 class="text-base font-bold text-slate-800">${escapeHtml(post.title)}</h3>
        ${post.content ? `<p class="mt-1.5 text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">${escapeHtml(post.content)}</p>` : ""}
      </div>

      ${post.image_data ? `
        <div class="mt-3">
          <img src="${post.image_data}" alt="添付画像" class="max-h-72 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-95 transition" onclick="openModal('${post.image_data}')">
        </div>
      ` : ""}
    `;
    timelineList.appendChild(card);
  });
}

// フィルタータブ切り替え
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentFilter = tab.getAttribute("data-filter");

    // タブのアクティブスタイル更新
    filterTabs.forEach((t) => {
      t.className = "filter-tab px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100";
    });
    tab.className = "filter-tab px-3 py-1 rounded-lg text-indigo-600 bg-indigo-50 font-bold";

    renderPosts();
  });
});

// 解決ステータス切り替え
window.toggleResolved = async function (postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: "POST" });
    if (res.ok) {
      loadPosts();
    }
  } catch (err) {
    console.error("ステータス更新に失敗しました:", err);
  }
};


// ==========================================
// 6. 画像モーダル機能
// ==========================================
window.openModal = function (src) {
  if (!imageModal || !modalImg) return;
  modalImg.src = src;
  imageModal.classList.remove("hidden");
};

function closeModal() {
  if (!imageModal || !modalImg) return;
  imageModal.classList.add("hidden");
  modalImg.src = "";
}

if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
if (imageModal) {
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) closeModal();
  });
}


// ==========================================
// 7. ユーティリティ
// ==========================================
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}

// 初回ロード実行
loadPosts();
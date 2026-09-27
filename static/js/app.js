// ==========================================
// SES ナレッジ＆スクショ共有ボード - app.js
// ==========================================

// --- 状態管理 ---
let currentImageData = null;
let currentFilter = "all";
let allPosts = [];

// --- DOM 要素の取得 ---
// ナビゲーション & ビュー切り替え
const navTimeline = document.getElementById("nav-timeline");
const navPost = document.getElementById("nav-post");
const viewTimeline = document.getElementById("view-timeline");
const viewPost = document.getElementById("view-post");

// フォーム要素
const postForm = document.getElementById("post-form");
const postAuthor = document.getElementById("post-author");
const authorNameContainer = document.getElementById("author-name-container");
const postTitle = document.getElementById("post-title");
const postMemo = document.getElementById("post-memo");
const charCounter = document.getElementById("char-counter");
const postAnonymous = document.getElementById("post-anonymous");
const btnSubmit = document.getElementById("btn-submit");

// 画像アップロード・プレビュー要素
const dropArea = document.getElementById("drop-area");
const dropPrompt = document.getElementById("drop-prompt");
const fileInput = document.getElementById("file-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const btnRemoveImage = document.getElementById("btn-remove-image");

// タイムライン・フィルター
const timelineList = document.getElementById("timeline-list");
const filterTabs = document.querySelectorAll(".filter-tab");

// 画像モーダル
const imageModal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const btnCloseModal = document.getElementById("btn-close-modal");


// ==========================================
// 画面切り替え（タイムライン / 投稿）
// ==========================================
function switchView(target) {
  if (target === "post") {
    viewPost.classList.remove("hidden");
    viewTimeline.classList.add("hidden");

    navPost.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition bg-white text-indigo-700 shadow";
    navTimeline.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition text-indigo-100 hover:bg-indigo-500";
  } else {
    viewTimeline.classList.remove("hidden");
    viewPost.classList.add("hidden");

    navTimeline.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition bg-white text-indigo-700 shadow";
    navPost.className = "nav-btn px-4 py-1.5 rounded-full font-medium text-sm transition text-indigo-100 hover:bg-indigo-500";
  }
}

if (navTimeline) navTimeline.addEventListener("click", () => switchView("timeline"));
if (navPost) navPost.addEventListener("click", () => switchView("post"));


// ==========================================
// 匿名トグル連動（お名前入力欄の表示/非表示）
// ==========================================
if (postAnonymous && authorNameContainer) {
  postAnonymous.addEventListener("change", () => {
    if (postAnonymous.checked) {
      authorNameContainer.classList.add("hidden");
    } else {
      authorNameContainer.classList.remove("hidden");
    }
  });
}


// ==========================================
// メモ文字数カウンター
// ==========================================
if (postMemo && charCounter) {
  postMemo.addEventListener("input", () => {
    const len = postMemo.value.length;
    charCounter.textContent = `${len} / 100文字`;
    if (len >= 100) {
      charCounter.classList.add("text-red-500");
    } else {
      charCounter.classList.remove("text-red-500");
    }
  });
}


// ==========================================
// 画像圧縮 & プレビュー表示
// ==========================================
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
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
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

async function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  try {
    currentImageData = await compressImage(file);
    imagePreview.src = currentImageData;
    imagePreviewContainer.classList.remove("hidden");
    dropPrompt.classList.add("hidden");
  } catch (err) {
    console.error("画像圧縮エラー:", err);
    alert("画像の読み込みに失敗しました。");
  }
}

function clearImage() {
  currentImageData = null;
  imagePreview.src = "";
  imagePreviewContainer.classList.add("hidden");
  dropPrompt.classList.remove("hidden");
  if (fileInput) fileInput.value = "";
}


// ==========================================
// 画像選択・ドロップ・ペーストイベント
// ==========================================
// クリックでファイル選択を開く
if (dropArea) {
  dropArea.addEventListener("click", (e) => {
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

// ファイル選択後
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });
}

// Ctrl + V 直貼り
window.addEventListener("paste", (e) => {
  const items = (e.clipboardData || window.clipboardData)?.items;
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
// 投稿フォーム送信
// ==========================================
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = postTitle.value.trim();
    const memo = postMemo.value.trim();
    const isAnon = postAnonymous ? postAnonymous.checked : false;
    const author = isAnon ? "匿名スタッフ" : (postAuthor?.value.trim() || "社内スタッフ");

    if (!title) {
      alert("タイトルを入力してください");
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = "送信中...";

    const payload = {
      title: title,
      content: memo,
      author_name: author,
      is_anonymous: isAnon,
      image_data: currentImageData
    };

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // 入力欄のクリア
      postTitle.value = "";
      postMemo.value = "";
      if (postAuthor) postAuthor.value = "";
      if (postAnonymous) {
        postAnonymous.checked = false;
        authorNameContainer.classList.remove("hidden");
      }
      if (charCounter) charCounter.textContent = "0 / 100文字";
      clearImage();

      // タイムラインへ切り替えて一覧再読み込み
      switchView("timeline");
      await loadPosts();
    } catch (err) {
      console.error("投稿の送信に失敗しました:", err);
      alert("投稿に失敗しました。サーバー側の通信状態を確認してください。");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "この内容で投稿する";
    }
  });
}


// ==========================================
// 投稿一覧取得 & 描画
// ==========================================
async function loadPosts() {
  try {
    const res = await fetch("/api/posts");
    if (!res.ok) throw new Error("一覧取得に失敗しました");
    allPosts = await res.json();
    renderPosts();
  } catch (err) {
    console.error("投稿の読み込みに失敗しました:", err);
    if (timelineList) {
      timelineList.innerHTML = `
        <div class="text-center py-12 text-red-500 bg-white rounded-xl shadow-sm border border-slate-100">
          投稿の読み込みに失敗しました。
        </div>
      `;
    }
  }
}

function renderPosts() {
  if (!timelineList) return;
  timelineList.innerHTML = "";

  const filteredPosts = allPosts.filter((post) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "unresolved") return !post.is_resolved;
    if (currentFilter === "resolved") return post.is_resolved;
    if (currentFilter === "anonymous") return post.is_anonymous;
    return true;
  });

  if (filteredPosts.length === 0) {
    timelineList.innerHTML = `
      <div class="text-center py-12 text-slate-400 bg-white rounded-xl shadow-sm border border-slate-100">
        該当する投稿がありません。
      </div>
    `;
    return;
  }

  filteredPosts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3";

    const dateStr = post.created_at ? new Date(post.created_at).toLocaleString("ja-JP") : "";
    
    // 匿名フラグとお名前の判定
    const authorName = post.is_anonymous 
      ? "🕶️ 匿名スタッフ" 
      : `👤 ${escapeHtml(post.author_name || "社内スタッフ")}`;

    const statusBadge = post.is_resolved
      ? '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">解決済み</span>'
      : '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">未解決</span>';

    const memoContent = post.content || post.memo || "";

    card.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center gap-2">
          ${statusBadge}
          <span class="text-xs font-medium text-slate-600">${authorName}</span>
          ${dateStr ? `<span class="text-xs text-slate-400">• ${dateStr}</span>` : ""}
        </div>
        <button onclick="toggleResolved('${post.id}')" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
          ${post.is_resolved ? "未解決に戻す" : "解決済みにする"}
        </button>
      </div>

      <div>
        <h3 class="text-base font-bold text-slate-800">${escapeHtml(post.title)}</h3>
        ${memoContent ? `<p class="mt-1 text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">${escapeHtml(memoContent)}</p>` : ""}
      </div>

      ${post.image_data ? `
        <div class="mt-2">
          <img src="${post.image_data}" alt="スクリーンショット" class="max-h-64 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-zoom-in hover:opacity-95 transition" onclick="openImageModal(this.src)">
        </div>
      ` : ""}
    `;

    timelineList.appendChild(card);
  });
}

// 解決・未解決の切り替え
window.toggleResolved = async function(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: "POST" });
    if (!res.ok) throw new Error("更新失敗");
    await loadPosts();
  } catch (err) {
    console.error("ステータス更新に失敗しました:", err);
  }
};


// ==========================================
// フィルタータブ切り替え
// ==========================================
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentFilter = tab.getAttribute("data-filter");

    filterTabs.forEach((t) => {
      t.className = "filter-tab px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100";
    });
    tab.className = "filter-tab px-3 py-1 rounded-lg text-indigo-600 bg-indigo-50 font-bold";

    renderPosts();
  });
});


// ==========================================
// 画像拡大モーダル
// ==========================================
window.openImageModal = function(src) {
  if (!imageModal || !modalImg) return;
  modalImg.src = src;
  imageModal.classList.remove("hidden");
};

function closeImageModal() {
  if (!imageModal) return;
  imageModal.classList.add("hidden");
  if (modalImg) modalImg.src = "";
}

if (btnCloseModal) btnCloseModal.addEventListener("click", closeImageModal);
if (imageModal) {
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) closeImageModal();
  });
}


// ==========================================
// XSS対策エスケープ関数
// ==========================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// 初回投稿データ取得
loadPosts();
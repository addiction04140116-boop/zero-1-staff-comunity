// ==========================================
// SES ナレッジ＆スクショ共有ボード - app.js
// ==========================================

let currentImageData = null;
let currentFilter = "all";
let allPosts = [];

// DOM 要素の取得
const navTimeline = document.getElementById("nav-timeline");
const navPost = document.getElementById("nav-post");
const viewTimeline = document.getElementById("view-timeline");
const viewPost = document.getElementById("view-post");

const postForm = document.getElementById("post-form");
const postAuthor = document.getElementById("post-author");
const authorNameContainer = document.getElementById("author-name-container");
const postTitle = document.getElementById("post-title");
const postMemo = document.getElementById("post-memo");
const charCounter = document.getElementById("char-counter");
const postAnonymous = document.getElementById("post-anonymous");
const btnSubmit = document.getElementById("btn-submit");

const dropArea = document.getElementById("drop-area");
const dropPrompt = document.getElementById("drop-prompt");
const fileInput = document.getElementById("file-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const btnRemoveImage = document.getElementById("btn-remove-image");

const timelineList = document.getElementById("timeline-list");
const filterTabs = document.querySelectorAll(".filter-tab");

const imageModal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const btnCloseModal = document.getElementById("btn-close-modal");

// 画面切り替え（タイムライン / 投稿画面）
function switchView(target) {
  if (target === "post") {
    if (viewPost) viewPost.classList.remove("hidden");
    if (viewTimeline) viewTimeline.classList.add("hidden");
    if (navPost) navPost.className = "nav-btn px-3 sm:px-4 py-1.5 rounded-full font-medium text-xs sm:text-sm transition bg-white text-indigo-700 shadow";
    if (navTimeline) navTimeline.className = "nav-btn px-3 sm:px-4 py-1.5 rounded-full font-medium text-xs sm:text-sm transition text-indigo-100 hover:bg-indigo-500";
  } else {
    if (viewTimeline) viewTimeline.classList.remove("hidden");
    if (viewPost) viewPost.classList.add("hidden");
    if (navTimeline) navTimeline.className = "nav-btn px-3 sm:px-4 py-1.5 rounded-full font-medium text-xs sm:text-sm transition bg-white text-indigo-700 shadow";
    if (navPost) navPost.className = "nav-btn px-3 sm:px-4 py-1.5 rounded-full font-medium text-xs sm:text-sm transition text-indigo-100 hover:bg-indigo-500";
  }
}

if (navTimeline) navTimeline.addEventListener("click", () => switchView("timeline"));
if (navPost) navPost.addEventListener("click", () => switchView("post"));

// 匿名スイッチでお名前欄の表示/非表示を切り替え
if (postAnonymous && authorNameContainer) {
  postAnonymous.addEventListener("change", () => {
    if (postAnonymous.checked) {
      authorNameContainer.classList.add("hidden");
    } else {
      authorNameContainer.classList.remove("hidden");
    }
  });
}

// メモ欄の文字数カウンター
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

// 画像圧縮・リサイズ関数
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
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

// 画像ファイル読み込み処理
async function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  try {
    currentImageData = await compressImage(file);
    if (imagePreview) imagePreview.src = currentImageData;
    if (imagePreviewContainer) imagePreviewContainer.classList.remove("hidden");
    if (dropPrompt) dropPrompt.classList.add("hidden");
  } catch (err) {
    console.error("画像処理エラー:", err);
  }
}

// プレビュー画像のクリア
function clearImage() {
  currentImageData = null;
  if (imagePreview) imagePreview.src = "";
  if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");
  if (dropPrompt) dropPrompt.classList.remove("hidden");
  if (fileInput) fileInput.value = "";
}

// 画像添付関連のイベントリスナー
if (dropArea && fileInput) {
  dropArea.addEventListener("click", (e) => {
    if (e.target.closest("#btn-remove-image")) return;
    fileInput.click();
  });
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
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });
}

if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });
}

window.addEventListener("paste", (e) => {
  const items = (e.clipboardData || window.clipboardData)?.items;
  if (!items) return;
  for (let item of items) {
    if (item.type && item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) handleImageFile(file);
      break;
    }
  }
});

if (btnRemoveImage) {
  btnRemoveImage.addEventListener("click", (e) => {
    e.stopPropagation();
    clearImage();
  });
}

// 新規投稿送信
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = postTitle ? postTitle.value.trim() : "";
    const memo = postMemo ? postMemo.value.trim() : "";
    const isAnon = postAnonymous ? postAnonymous.checked : false;
    const author = isAnon ? "匿名スタッフ" : (postAuthor?.value.trim() || "社内スタッフ");

    if (!title) return alert("タイトルを入力してください");

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "送信中...";
    }

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
      if (!res.ok) throw new Error("送信失敗");

      if (postTitle) postTitle.value = "";
      if (postMemo) postMemo.value = "";
      if (postAuthor) postAuthor.value = "";
      if (postAnonymous) {
        postAnonymous.checked = false;
        if (authorNameContainer) authorNameContainer.classList.remove("hidden");
      }
      if (charCounter) charCounter.textContent = "0 / 100文字";
      clearImage();

      switchView("timeline");
      await loadPosts();
    } catch (err) {
      console.error(err);
      alert("投稿に失敗しました。");
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "この内容で投稿する";
      }
    }
  });
}

// 投稿一覧取得
async function loadPosts() {
  try {
    const res = await fetch("/api/posts");
    if (!res.ok) throw new Error("取得エラー");
    allPosts = await res.json();
    renderPosts();
  } catch (err) {
    console.error(err);
  }
}

// 投稿一覧描画（コメント欄＆スマホレスポンシブ対応）
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
    card.className = "bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3 sm:space-y-4";

    const dateStr = post.created_at ? new Date(post.created_at).toLocaleString("ja-JP") : "";
    const authorName = post.is_anonymous ? "🕶️ 匿名スタッフ" : `👤 ${escapeHtml(post.author_name || "社内スタッフ")}`;
    const statusBadge = post.is_resolved
      ? '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">解決済み</span>'
      : '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">未解決</span>';

    // 複数人のコメント一覧生成
    const comments = post.comments || [];
    let commentsListHtml = "";
    if (comments.length > 0) {
      commentsListHtml = `
        <div class="space-y-2 mt-2">
          ${comments.map(c => `
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
              <div class="flex justify-between items-center text-slate-500">
                <span class="font-bold text-indigo-700">💬 ${escapeHtml(c.author_name || "社内スタッフ")}</span>
                <span class="text-[11px]">${c.created_at ? new Date(c.created_at).toLocaleString("ja-JP") : ""}</span>
              </div>
              <p class="text-slate-800 whitespace-pre-wrap leading-relaxed">${escapeHtml(c.content)}</p>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      commentsListHtml = `<p class="text-xs text-slate-400 italic">まだコメントはありません。アドバイスや回答を書いてみましょう！</p>`;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          ${statusBadge}
          <span class="text-xs font-medium text-slate-600">${authorName}</span>
          ${dateStr ? `<span class="text-[11px] text-slate-400">• ${dateStr}</span>` : ""}
        </div>
        <button onclick="toggleResolved('${post.id}')" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline shrink-0 ml-2">
          ${post.is_resolved ? "未解決に戻す" : "解決済みにする"}
        </button>
      </div>

      <div>
        <h3 class="text-sm sm:text-base font-bold text-slate-800 break-words">${escapeHtml(post.title)}</h3>
        ${post.content ? `<p class="mt-1 text-slate-600 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">${escapeHtml(post.content)}</p>` : ""}
      </div>

      ${post.image_data ? `
        <div class="mt-2">
          <img src="${post.image_data}" alt="スクリーンショット" class="max-h-60 sm:max-h-80 w-full sm:w-auto rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer" onclick="openImageModal(this.src)">
        </div>
      ` : ""}

      <div class="pt-3 border-t border-slate-100">
        <h4 class="text-xs font-bold text-slate-600 mb-2">💬 コメント・アドバイス (${comments.length})</h4>
        ${commentsListHtml}

        <form onsubmit="submitComment(event, '${post.id}')" class="mt-3 flex flex-col sm:flex-row gap-2">
          <input type="text" id="comment-author-${post.id}" placeholder="お名前 (任意)" class="w-full sm:w-32 px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <div class="flex gap-2 flex-1">
            <input type="text" id="comment-content-${post.id}" required placeholder="コメントを入力..." class="flex-1 px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-lg transition whitespace-nowrap shadow-sm shrink-0">
              送信
            </button>
          </div>
        </form>
      </div>
    `;

    timelineList.appendChild(card);
  });
}

// コメント送信処理
window.submitComment = async function(event, postId) {
  event.preventDefault();
  const authorInput = document.getElementById(`comment-author-${postId}`);
  const contentInput = document.getElementById(`comment-content-${postId}`);

  const content = contentInput ? contentInput.value.trim() : "";
  const author = authorInput?.value.trim() || "社内スタッフ";
  if (!content) return;

  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_name: author, content: content })
    });
    if (!res.ok) throw new Error("コメント送信失敗");

    if (contentInput) contentInput.value = "";
    await loadPosts();
  } catch (err) {
    console.error(err);
    alert("コメントの送信に失敗しました。");
  }
};

// 解決/未解決の切り替え
window.toggleResolved = async function(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/resolve`, { method: "POST" });
    if (!res.ok) throw new Error("更新失敗");
    await loadPosts();
  } catch (err) {
    console.error(err);
  }
};

// フィルタ切り替え
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentFilter = tab.getAttribute("data-filter");
    filterTabs.forEach((t) => {
      t.className = "filter-tab px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0";
    });
    tab.className = "filter-tab px-3 py-1.5 rounded-lg text-indigo-600 bg-indigo-50 font-bold shrink-0";
    renderPosts();
  });
});

// 画像拡大モーダル
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

// XSS対策
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// 初期ロード
loadPosts();
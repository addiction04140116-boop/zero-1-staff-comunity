// --- 状態管理 ---
let currentImageData = null;

// DOM 要素の取得
const postForm = document.getElementById("postForm");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const isAnonymous = document.getElementById("isAnonymous");
const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImageBtn");
const postsContainer = document.getElementById("postsContainer");
const filterStatus = document.getElementById("filterStatus");

// --- 画像の自動圧縮・リサイズ関数 (アプリ内軽量完結用) ---
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

        // 幅が maxWidth を超える場合は縮小
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 形式・指定画質に圧縮して Base64 文字列を生成
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
    };
  });
}

// 画像プレビュー表示処理
async function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  // 自動圧縮を実行
  currentImageData = await compressImage(file);
  imagePreview.src = currentImageData;
  imagePreviewContainer.classList.remove("hidden");
  dropZone.classList.add("hidden");
}

// --- イベントリスナー設定 ---

// ファイル選択時
if (imageInput) {
  imageInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });
}

// ドラッグ＆ドロップ
if (dropZone) {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-indigo-500", "bg-indigo-50");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-indigo-500", "bg-indigo-50");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-indigo-500", "bg-indigo-50");
    if (e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });
}

// クリップボードからの貼り付け（Ctrl + V でスクショ直貼り）
window.addEventListener("paste", (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      handleImageFile(file);
      break;
    }
  }
});

// 画像削除ボタン
if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    currentImageData = null;
    imagePreview.src = "";
    imagePreviewContainer.classList.add("hidden");
    dropZone.classList.remove("hidden");
    if (imageInput) imageInput.value = "";
  });
}

// 投稿一覧の取得と描画
async function loadPosts() {
  try {
    const res = await fetch("/api/posts");
    const posts = await res.json();
    renderPosts(posts);
  } catch (err) {
    console.error("投稿の読み込みに失敗しました:", err);
  }
}

// 投稿一覧を描画
function renderPosts(posts) {
  if (!postsContainer) return;
  postsContainer.innerHTML = "";

  const selectedFilter = filterStatus ? filterStatus.value : "all";

  const filteredPosts = posts.filter((post) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unresolved") return !post.is_resolved;
    if (selectedFilter === "resolved") return post.is_resolved;
    if (selectedFilter === "anonymous") return post.is_anonymous;
    return true;
  });

  if (filteredPosts.length === 0) {
    postsContainer.innerHTML = `
      <div class="text-center py-12 text-slate-400 bg-white rounded-xl shadow-sm border border-slate-100">
        投稿がまだありません。最初の質問やTipsを投稿してみましょう！
      </div>
    `;
    return;
  }

  filteredPosts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4";

    const dateStr = new Date(post.created_at).toLocaleString("ja-JP");
    const authorName = post.is_anonymous ? "匿名スタッフ" : "社内スタッフ";
    const statusBadge = post.is_resolved
      ? '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">解決済み</span>'
      : '<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">未解決</span>';

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          ${statusBadge}
          <span class="text-xs font-medium text-slate-500">${authorName}</span>
          <span class="text-xs text-slate-400">• ${dateStr}</span>
        </div>
        <button onclick="toggleResolved('${post.id}')" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          ${post.is_resolved ? "未解決に戻す" : "解決済みにする"}
        </button>
      </div>

      <div>
        <h3 class="text-lg font-bold text-slate-800">${escapeHtml(post.title)}</h3>
        <p class="mt-2 text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">${escapeHtml(post.content)}</p>
      </div>

      ${post.image_data ? `
        <div class="mt-3">
          <img src="${post.image_data}" alt="添付画像" class="max-h-96 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer" onclick="window.open(this.src)">
        </div>
      ` : ""}
    `;
    postsContainer.appendChild(card);
  });
}

// 投稿の解決フラグ切り替え
async function toggleResolved(postId) {
  try {
    await fetch(`/api/posts/${postId}/resolve`, { method: "POST" });
    loadPosts();
  } catch (err) {
    console.error("ステータス更新に失敗しました:", err);
  }
}

// フォーム送信
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = postTitle.value.trim();
    const content = postContent.value.trim();
    if (!title || !content) return;

    const payload = {
      title: title,
      content: content,
      is_anonymous: isAnonymous.checked,
      image_data: currentImageData
    };

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        postTitle.value = "";
        postContent.value = "";
        isAnonymous.checked = false;
        if (removeImageBtn) removeImageBtn.click();
        loadPosts();
      }
    } catch (err) {
      console.error("投稿の送信に失敗しました:", err);
    }
  });
}

// フィルター変更
if (filterStatus) {
  filterStatus.addEventListener("change", loadPosts);
}

// XSS対策のエスケープ
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// 初回読み込み
loadPosts();
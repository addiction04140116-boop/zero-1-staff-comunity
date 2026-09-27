// 投稿一覧描画（コメント一覧＆入力フォーム含む）
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
                <span class="font-bold text-indigo-700">💬 ${escapeHtml(c.author_name)}</span>
                <span class="text-[11px]">${new Date(c.created_at).toLocaleString("ja-JP")}</span>
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
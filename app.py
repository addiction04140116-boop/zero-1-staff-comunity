import os
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

DATA_FILE = "posts.json"

def load_posts():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_posts(posts):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

# 投稿一覧取得
@app.route("/api/posts", methods=["GET"])
def get_posts():
    posts = load_posts()
    # 新着順
    posts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(posts)

# 新規投稿作成
@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "タイトルは必須です"}), 400

    posts = load_posts()
    new_post = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": data.get("content", ""),
        "author_name": data.get("author_name", "社内スタッフ"),
        "is_anonymous": data.get("is_anonymous", False),
        "image_data": data.get("image_data"),  # Base64画像
        "is_resolved": False,
        "comments": [],  # コメント格納用リスト（複数人対応）
        "created_at": datetime.now().isoformat()
    }
    posts.append(new_post)
    save_posts(posts)
    return jsonify(new_post), 201

# 解決/未解決の切り替え
@app.route("/api/posts/<post_id>/resolve", methods=["POST"])
def toggle_resolve(post_id):
    posts = load_posts()
    target_post = None
    for p in posts:
        if p.get("id") == post_id:
            p["is_resolved"] = not p.get("is_resolved", False)
            target_post = p
            break

    if not target_post:
        return jsonify({"error": "投稿が見つかりません"}), 404

    save_posts(posts)
    return jsonify(target_post)

# ★複数人がコメントを投稿するエンドポイント
@app.route("/api/posts/<post_id>/comments", methods=["POST"])
def add_comment(post_id):
    data = request.get_json() or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "コメントを入力してください"}), 400

    posts = load_posts()
    target_post = None
    for p in posts:
        if p.get("id") == post_id:
            target_post = p
            break

    if not target_post:
        return jsonify({"error": "投稿が見つかりません"}), 404

    if "comments" not in target_post:
        target_post["comments"] = []

    new_comment = {
        "id": str(uuid.uuid4()),
        "author_name": data.get("author_name", "").strip() or "社内スタッフ",
        "content": content,
        "created_at": datetime.now().isoformat()
    }
    target_post["comments"].append(new_comment)
    save_posts(posts)
    return jsonify(new_comment), 201

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
import json
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# 保存用ディレクトリとJSONファイルの準備
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "posts.json")
os.makedirs(DATA_DIR, exist_ok=True)

if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False)


def load_posts():
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


@app.route("/api/posts", methods=["GET"])
def get_posts():
    posts = load_posts()
    # 新しい投稿順に並び替え
    posts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(posts)


@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json()
    if not data:
        return jsonify({"error": "リクエストが無効です"}), 400

    title = data.get("title", "").strip()
    memo = data.get("memo", "").strip()
    image = data.get("image", None)
    is_anonymous = bool(data.get("is_anonymous", False))
    author_name = "匿名メンバー" if is_anonymous else data.get("author_name", "名無しエンジニア")

    if not title:
        return jsonify({"error": "タイトルは必須です"}), 400

    new_post = {
        "id": str(uuid.uuid4()),
        "title": title,
        "memo": memo[:100],
        "image": image,
        "is_anonymous": is_anonymous,
        "author_name": author_name,
        "is_resolved": False,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "comments": []
    }

    posts = load_posts()
    posts.append(new_post)
    save_posts(posts)

    return jsonify(new_post), 201


@app.route("/api/posts/<post_id>/resolve", methods=["PATCH"])
def toggle_resolve(post_id):
    posts = load_posts()
    target = None
    for p in posts:
        if p["id"] == post_id:
            p["is_resolved"] = not p.get("is_resolved", False)
            target = p
            break

    if not target:
        return jsonify({"error": "投稿が見つかりません"}), 404

    save_posts(posts)
    return jsonify(target)


@app.route("/api/posts/<post_id>/comments", methods=["POST"])
def add_comment(post_id):
    data = request.get_json()
    if not data or not data.get("text", "").strip():
        return jsonify({"error": "コメントを入力してください"}), 400

    posts = load_posts()
    target = None
    for p in posts:
        if p["id"] == post_id:
            target = p
            break

    if not target:
        return jsonify({"error": "投稿が見つかりません"}), 404

    is_anonymous = bool(data.get("is_anonymous", False))
    author_name = "匿名メンバー" if is_anonymous else data.get("author_name", "同僚エンジニア")

    comment = {
        "id": str(uuid.uuid4()),
        "author_name": author_name,
        "is_anonymous": is_anonymous,
        "text": data.get("text", "").strip(),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    target.setdefault("comments", []).append(comment)
    save_posts(posts)

    return jsonify(comment), 201


if __name__ == "__main__":
    app.run(debug=True, port=5000)
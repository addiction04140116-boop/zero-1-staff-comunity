import os
import json
import uuid
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

# Railway が自動付与する接続URL（無ければローカル用などのフォールバック）
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL が設定されていません。Railway上でPostgresを追加してください。")
    conn = psycopg2.connect(DATABASE_URL)
    return conn

# テーブル自動初期化
def init_db():
    if not DATABASE_URL:
        return
    conn = get_db_connection()
    cur = conn.cursor()
    # 投稿テーブル (TEXT型で大容量のBase64画像も保存可能)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            author_name VARCHAR(100),
            is_anonymous BOOLEAN DEFAULT FALSE,
            image_data TEXT,
            is_resolved BOOLEAN DEFAULT FALSE,
            comments JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

# 起動時にテーブルを作成
try:
    init_db()
except Exception as e:
    print(f"DB初期化エラー: {e}")

@app.route("/")
def index():
    return render_template("index.html")

# 投稿一覧取得
@app.route("/api/posts", methods=["GET"])
def get_posts():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM posts ORDER BY created_at DESC;")
        rows = cur.fetchall()
        cur.close()
        conn.close()

        posts = []
        for r in rows:
            posts.append({
                "id": r["id"],
                "title": r["title"],
                "content": r["content"],
                "author_name": r["author_name"],
                "is_anonymous": r["is_anonymous"],
                "image_data": r["image_data"],
                "is_resolved": r["is_resolved"],
                "comments": r["comments"] if r["comments"] is not None else [],
                "created_at": r["created_at"].isoformat() if r["created_at"] else ""
            })
        return jsonify(posts)
    except Exception as e:
        print(f"取得エラー: {e}")
        return jsonify([]), 500

# 新規投稿作成
@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "タイトルは必須です"}), 400

    post_id = str(uuid.uuid4())
    content = data.get("content", "")
    author_name = data.get("author_name", "社内スタッフ")
    is_anonymous = data.get("is_anonymous", False)
    image_data = data.get("image_data")
    created_at = datetime.now()

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO posts (id, title, content, author_name, is_anonymous, image_data, is_resolved, comments, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (post_id, title, content, author_name, is_anonymous, image_data, False, json.dumps([]), created_at))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "id": post_id,
            "title": title,
            "content": content,
            "author_name": author_name,
            "is_anonymous": is_anonymous,
            "image_data": image_data,
            "is_resolved": False,
            "comments": [],
            "created_at": created_at.isoformat()
        }), 201
    except Exception as e:
        print(f"作成エラー: {e}")
        return jsonify({"error": "保存に失敗しました"}), 500

# 解決/未解決の切り替え
@app.route("/api/posts/<post_id>/resolve", methods=["POST"])
def toggle_resolve(post_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT is_resolved FROM posts WHERE id = %s;", (post_id,))
        post = cur.fetchone()
        if not post:
            cur.close()
            conn.close()
            return jsonify({"error": "投稿が見つかりません"}), 404

        new_status = not post["is_resolved"]
        cur.execute("UPDATE posts SET is_resolved = %s WHERE id = %s;", (new_status, post_id))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"is_resolved": new_status})
    except Exception as e:
        print(f"ステータス更新エラー: {e}")
        return jsonify({"error": "更新失敗"}), 500

# 複数人コメントの追加
@app.route("/api/posts/<post_id>/comments", methods=["POST"])
def add_comment(post_id):
    data = request.get_json() or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "コメントを入力してください"}), 400

    new_comment = {
        "id": str(uuid.uuid4()),
        "author_name": data.get("author_name", "").strip() or "社内スタッフ",
        "content": content,
        "created_at": datetime.now().isoformat()
    }

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # JSON配列の末尾に新しいコメントを追加
        cur.execute("""
            UPDATE posts
            SET comments = COALESCE(comments, '[]'::jsonb) || %s::jsonb
            WHERE id = %s;
        """, (json.dumps([new_comment]), post_id))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify(new_comment), 201
    except Exception as e:
        print(f"コメント追加エラー: {e}")
        return jsonify({"error": "コメント保存失敗"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
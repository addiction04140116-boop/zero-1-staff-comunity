FROM python:3.12-slim

WORKDIR /app

# ライブラリのインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリコードのコピー
COPY . .

# ポート5000を明示
EXPOSE 5000

# 起動コマンド（環境変数PORTがあれば優先、なければ5000で待ち受け）
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-5000}"]
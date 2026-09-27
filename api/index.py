import os
import sys

# プロジェクトのルートディレクトリを検索パスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# VercelのWSGIエントリポイント
app = app
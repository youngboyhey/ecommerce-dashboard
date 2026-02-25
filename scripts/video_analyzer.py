#!/usr/bin/env python3
"""
Video Analyzer Module for E-commerce Dashboard

使用 Google Video Intelligence API 和 Gemini API 分析廣告影片素材。
支援影片下載、封面截圖、AI 分析、Supabase 上傳。

Features:
- 偵測 Meta Ads 的影片素材 (video_url, video_id)
- 下載影片到 /tmp/ 暫存
- 使用 ffmpeg 截取封面圖
- 上傳封面到 Supabase Storage
- 🆕 優先使用 GCP Video Intelligence API（標籤、場景、物件、文字偵測）
- 若 GCP 不可用則 Fallback 到 Gemini 2.5 Pro 分析影片內容
- 若只有縮圖則使用 Gemini 分析縮圖
- 分析完成後清理暫存檔

Usage:
    from scripts.video_analyzer import analyze_video_creative
    result = analyze_video_creative(creative_dict)
    
    # 單獨使用 GCP Video Intelligence
    from scripts.video_analyzer import analyze_video_with_gcp
    gcp_result = analyze_video_with_gcp('/path/to/video.mp4')
"""

import os
import sys
import json
import time
import hashlib
import subprocess
import tempfile
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

# Load environment variables from credentials file
CREDENTIALS_PATH = os.path.expanduser("~/.openclaw/credentials/api-keys.env")
if os.path.exists(CREDENTIALS_PATH):
    with open(CREDENTIALS_PATH) as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                os.environ.setdefault(key, value)

# Gemini API Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-pro"  # 主要模型
GEMINI_MODEL_FALLBACK = "gemini-2.5-flash"  # 備用模型

# GCP Video Intelligence Configuration
GOOGLE_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")  # 同一個 key 可用於多個 GCP API

# Supabase Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = "ad-images"  # 與圖片使用同一個 bucket

# Meta API Configuration
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN")


def get_gemini_client():
    """Initialize Gemini client."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in environment")
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        return genai
    except ImportError:
        raise ImportError("google-generativeai not installed. Run: pip install google-generativeai")


def get_video_url_from_meta(video_id: str) -> Dict[str, Any]:
    """
    從 Meta Graph API 取得影片資訊
    
    Args:
        video_id: Meta 影片 ID
    
    Returns:
        包含 video_url, thumbnail_url, description 的字典
    """
    result = {
        "video_url": None,
        "thumbnail_url": None,
        "description": None,
        "duration": None
    }
    
    if not META_ACCESS_TOKEN:
        print(f"⚠️  META_ACCESS_TOKEN not set, cannot fetch video info")
        return result
    
    try:
        # 使用 Graph API 取得影片資訊
        # Video 節點的可用欄位：source, picture (縮圖), format, length, description
        url = f"https://graph.facebook.com/v21.0/{video_id}"
        params = {
            "access_token": META_ACCESS_TOKEN,
            "fields": "source,picture,format,length,description"
        }
        
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            
            # 1. 嘗試取得影片 source URL
            video_url = data.get("source")
            if video_url:
                result["video_url"] = video_url
                print(f"  ✓ Got video source URL")
            
            # 2. 取得縮圖 - 優先使用 format 中的高解析度版本
            formats = data.get("format", [])
            if formats:
                # 找最高解析度的縮圖
                best_format = max(formats, key=lambda x: x.get("width", 0) * x.get("height", 0))
                thumbnail = best_format.get("picture")
                if thumbnail:
                    result["thumbnail_url"] = thumbnail
                    print(f"  ✓ Got high-res thumbnail ({best_format.get('width')}x{best_format.get('height')})")
            
            # 如果 format 沒有縮圖，用 picture 欄位
            if not result["thumbnail_url"]:
                result["thumbnail_url"] = data.get("picture")
                if result["thumbnail_url"]:
                    print(f"  ✓ Got thumbnail from picture field")
            
            # 3. 取得描述和長度
            result["description"] = data.get("description")
            result["duration"] = data.get("length")
            
            if result["duration"]:
                print(f"  ✓ Video duration: {result['duration']:.1f} seconds")
            
        else:
            error_msg = resp.text[:200]
            print(f"  ⚠️  Meta API error: {resp.status_code} - {error_msg}")
            
    except Exception as e:
        print(f"  ⚠️  Error fetching video from Meta: {e}")
    
    return result


def download_video(video_url: str, creative_id: str) -> Optional[str]:
    """
    下載影片到 /tmp/ 目錄
    
    Args:
        video_url: 影片 URL
        creative_id: 用於命名檔案
    
    Returns:
        本地影片路徑或 None
    """
    if not video_url:
        return None
    
    # 產生唯一檔名
    url_hash = hashlib.md5(video_url.encode()).hexdigest()[:8]
    temp_path = f"/tmp/ad_video_{creative_id}_{url_hash}.mp4"
    
    # 如果已存在，跳過下載
    if os.path.exists(temp_path) and os.path.getsize(temp_path) > 10000:
        print(f"  ✓ Video already downloaded: {temp_path}")
        return temp_path
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8",
            "Referer": "https://www.facebook.com/"
        }
        
        print(f"  ⬇ Downloading video...")
        resp = requests.get(video_url, headers=headers, timeout=120, stream=True)
        
        if resp.status_code == 200:
            total_size = int(resp.headers.get('content-length', 0))
            downloaded = 0
            
            with open(temp_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)
            
            file_size = os.path.getsize(temp_path)
            if file_size < 1000:
                print(f"  ⚠️  Downloaded file too small ({file_size} bytes)")
                os.remove(temp_path)
                return None
            
            print(f"  ✓ Downloaded: {file_size / 1024 / 1024:.1f} MB")
            return temp_path
        else:
            print(f"  ⚠️  Download failed: HTTP {resp.status_code}")
            return None
            
    except Exception as e:
        print(f"  ⚠️  Download error: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return None


def download_video_with_ytdlp(video_id: str, output_path: str, platform: str = "facebook") -> Optional[str]:
    """
    使用 yt-dlp 下載 Facebook/Instagram Reel
    
    Meta API 對 Page Reel 無法取得 source URL，但 yt-dlp 可以繞道下載。
    
    Args:
        video_id: Meta 影片 ID
        output_path: 輸出檔案路徑
        platform: 平台 ("facebook" 或 "instagram")
    
    Returns:
        下載成功的檔案路徑，失敗回傳 None
    """
    if not video_id:
        return None
    
    # 如果已存在，跳過下載
    if os.path.exists(output_path) and os.path.getsize(output_path) > 10000:
        print(f"  ✓ Video already downloaded via yt-dlp: {output_path}")
        return output_path
    
    # 構建 Reel URL
    if platform == "instagram":
        reel_url = f"https://www.instagram.com/reel/{video_id}/"
    else:
        reel_url = f"https://www.facebook.com/reel/{video_id}/"
    
    print(f"  🎬 Attempting yt-dlp download: {reel_url}")
    
    try:
        # yt-dlp 命令
        # -f best: 選擇最佳品質
        # --no-warnings: 減少輸出
        # --no-playlist: 不下載播放清單
        # --socket-timeout 30: 網路超時
        cmd = [
            "yt-dlp",
            "-f", "best",
            "-o", output_path,
            "--no-warnings",
            "--no-playlist",
            "--socket-timeout", "30",
            reel_url
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180  # 3 分鐘超時
        )
        
        if result.returncode == 0 and os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            if file_size > 10000:  # > 10KB
                print(f"  ✓ yt-dlp download success: {file_size / 1024 / 1024:.1f} MB")
                return output_path
            else:
                print(f"  ⚠️  yt-dlp downloaded file too small: {file_size} bytes")
                os.remove(output_path)
                return None
        else:
            error_msg = result.stderr[:200] if result.stderr else "Unknown error"
            print(f"  ⚠️  yt-dlp failed (exit code {result.returncode}): {error_msg}")
            
            # 如果 Facebook 失敗，嘗試 Instagram
            if platform == "facebook":
                print(f"  🔄 Trying Instagram Reel URL...")
                return download_video_with_ytdlp(video_id, output_path, platform="instagram")
            
            return None
            
    except subprocess.TimeoutExpired:
        print(f"  ⚠️  yt-dlp timeout (180s)")
        if os.path.exists(output_path):
            os.remove(output_path)
        return None
    except FileNotFoundError:
        print(f"  ⚠️  yt-dlp not found. Install with: pip install yt-dlp")
        return None
    except Exception as e:
        print(f"  ⚠️  yt-dlp error: {e}")
        if os.path.exists(output_path):
            os.remove(output_path)
        return None


def extract_video_thumbnail(video_path: str, output_path: Optional[str] = None) -> Optional[str]:
    """
    使用 ffmpeg 截取影片封面（第一幀或指定位置）
    
    Args:
        video_path: 影片檔案路徑
        output_path: 輸出圖片路徑（預設自動生成）
    
    Returns:
        封面圖片路徑或 None
    """
    if not video_path or not os.path.exists(video_path):
        return None
    
    if output_path is None:
        output_path = video_path.replace('.mp4', '_thumbnail.jpg')
    
    try:
        # 先取得影片長度
        probe_cmd = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        
        duration_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
        duration = float(duration_result.stdout.strip()) if duration_result.stdout.strip() else 5.0
        
        # 截取第 1 秒的畫面（避免黑屏或 logo）
        seek_time = min(1.0, duration / 2)
        
        # ffmpeg 截圖命令
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-ss', str(seek_time),
            '-i', video_path,
            '-vframes', '1',
            '-q:v', '2',  # 高品質
            '-vf', 'scale=1200:-1',  # 寬度 1200px，高度等比例
            output_path
        ]
        
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0 and os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            if file_size > 1000:
                print(f"  ✓ Thumbnail extracted: {output_path} ({file_size / 1024:.1f} KB)")
                return output_path
            else:
                print(f"  ⚠️  Thumbnail too small: {file_size} bytes")
                os.remove(output_path)
        else:
            print(f"  ⚠️  ffmpeg error: {result.stderr[:200]}")
            
    except subprocess.TimeoutExpired:
        print(f"  ⚠️  ffmpeg timeout")
    except Exception as e:
        print(f"  ⚠️  Thumbnail extraction error: {e}")
    
    return None


def upload_thumbnail_to_supabase(thumbnail_path: str, ad_id: str, week_start: str) -> Optional[str]:
    """
    上傳封面圖到 Supabase Storage
    
    Args:
        thumbnail_path: 本地封面圖路徑
        ad_id: 廣告 ID（用於路徑）
        week_start: 週開始日期（用於路徑）
    
    Returns:
        Supabase public URL 或 None
    """
    if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, thumbnail_path]):
        print(f"  ⚠️  Missing Supabase credentials or thumbnail path")
        return None
    
    if not os.path.exists(thumbnail_path):
        return None
    
    try:
        # 構建 storage 路徑: {week_start}/{ad_id}_video_thumbnail.jpg
        safe_ad_id = "".join(c for c in str(ad_id) if c.isalnum() or c in '-_')[:50]
        storage_path = f"{week_start}/{safe_ad_id}_video_thumbnail.jpg"
        
        # 讀取檔案
        with open(thumbnail_path, 'rb') as f:
            file_data = f.read()
        
        # 上傳到 Supabase Storage
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{storage_path}"
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "image/jpeg",
            "x-upsert": "true"  # 覆蓋已存在的檔案
        }
        
        resp = requests.post(upload_url, headers=headers, data=file_data, timeout=60)
        
        if resp.status_code in [200, 201]:
            # 構建 public URL
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
            print(f"  ✓ Thumbnail uploaded to Supabase: {storage_path}")
            return public_url
        else:
            print(f"  ⚠️  Supabase upload error: {resp.status_code} - {resp.text[:100]}")
            
    except Exception as e:
        print(f"  ⚠️  Supabase upload error: {e}")
    
    return None


def analyze_video_with_gcp(video_path: str) -> Dict[str, Any]:
    """
    使用 Google Cloud Video Intelligence API 分析影片
    
    分析內容：標籤偵測、場景變化、物件偵測
    
    Args:
        video_path: 本地影片檔案路徑
    
    Returns:
        分析結果字典，包含：
        - labels: 影片標籤列表
        - shot_changes: 場景變化時間點
        - objects: 偵測到的物件
        - text_annotations: 文字偵測結果
        - error: 錯誤訊息（如果有）
    """
    if not video_path or not os.path.exists(video_path):
        return {"error": "Video file not found"}
    
    try:
        from google.cloud import videointelligence
        from google.oauth2 import service_account
        import google.auth
    except ImportError:
        return {"error": "google-cloud-videointelligence not installed. Run: pip install google-cloud-videointelligence"}
    
    result = {
        "labels": [],
        "shot_changes": [],
        "objects": [],
        "text_annotations": [],
        "analyzed_at": datetime.now().isoformat(),
        "analysis_source": "gcp_video_intelligence"
    }
    
    try:
        # 嘗試建立客戶端（使用預設憑證或環境變數中的服務帳戶）
        # Video Intelligence API 需要 OAuth 或 Service Account 認證
        # API Key 不適用於這個 API，所以我們使用 Application Default Credentials
        print(f"  🔧 Initializing GCP Video Intelligence client...")
        
        try:
            # 首先嘗試使用 Application Default Credentials
            client = videointelligence.VideoIntelligenceServiceClient()
        except google.auth.exceptions.DefaultCredentialsError:
            # 如果沒有 ADC，檢查是否有服務帳戶 JSON 檔案
            sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            if sa_path and os.path.exists(sa_path):
                credentials = service_account.Credentials.from_service_account_file(sa_path)
                client = videointelligence.VideoIntelligenceServiceClient(credentials=credentials)
            else:
                return {
                    "error": "GCP credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or configure ADC.",
                    "fallback_available": True
                }
        
        # 讀取影片檔案
        print(f"  📖 Reading video file...")
        with open(video_path, "rb") as f:
            input_content = f.read()
        
        # 設定要執行的分析功能
        features = [
            videointelligence.Feature.LABEL_DETECTION,
            videointelligence.Feature.SHOT_CHANGE_DETECTION,
            videointelligence.Feature.OBJECT_TRACKING,
            videointelligence.Feature.TEXT_DETECTION,
        ]
        
        # 設定標籤偵測配置
        config = videointelligence.LabelDetectionConfig(
            label_detection_mode=videointelligence.LabelDetectionMode.SHOT_AND_FRAME_MODE
        )
        
        video_context = videointelligence.VideoContext(
            label_detection_config=config
        )
        
        print(f"  🚀 Sending video to GCP for analysis (this may take a while)...")
        
        # 執行分析
        operation = client.annotate_video(
            request={
                "input_content": input_content,
                "features": features,
                "video_context": video_context,
            }
        )
        
        # 等待結果（設定 10 分鐘超時）
        print(f"  ⏳ Waiting for GCP analysis to complete...")
        response = operation.result(timeout=600)
        
        # 處理結果
        annotation_result = response.annotation_results[0]
        
        # 1. 提取標籤 (Labels)
        if annotation_result.segment_label_annotations:
            for label in annotation_result.segment_label_annotations:
                label_info = {
                    "name": label.entity.description,
                    "entity_id": label.entity.entity_id,
                    "confidence": round(label.segments[0].confidence, 3) if label.segments else 0
                }
                # 加入分類資訊
                if label.category_entities:
                    label_info["categories"] = [cat.description for cat in label.category_entities]
                result["labels"].append(label_info)
        
        # 2. 提取場景變化 (Shot Changes)
        if annotation_result.shot_annotations:
            for shot in annotation_result.shot_annotations:
                start_time = shot.start_time_offset.total_seconds()
                end_time = shot.end_time_offset.total_seconds()
                result["shot_changes"].append({
                    "start": round(start_time, 2),
                    "end": round(end_time, 2),
                    "duration": round(end_time - start_time, 2)
                })
        
        # 3. 提取物件偵測 (Objects)
        if annotation_result.object_annotations:
            seen_objects = set()
            for obj in annotation_result.object_annotations:
                obj_name = obj.entity.description
                if obj_name not in seen_objects:
                    seen_objects.add(obj_name)
                    result["objects"].append({
                        "name": obj_name,
                        "entity_id": obj.entity.entity_id,
                        "confidence": round(obj.confidence, 3)
                    })
            # 按信心度排序
            result["objects"].sort(key=lambda x: x["confidence"], reverse=True)
        
        # 4. 提取文字偵測 (Text)
        if annotation_result.text_annotations:
            for text in annotation_result.text_annotations:
                text_info = {
                    "text": text.text,
                    "confidence": round(text.segments[0].confidence, 3) if text.segments else 0
                }
                result["text_annotations"].append(text_info)
        
        print(f"  ✓ GCP analysis complete:")
        print(f"    - Labels: {len(result['labels'])}")
        print(f"    - Shots: {len(result['shot_changes'])}")
        print(f"    - Objects: {len(result['objects'])}")
        print(f"    - Text: {len(result['text_annotations'])}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"  ⚠️  GCP Video Intelligence error: {error_msg[:200]}")
        return {
            "error": error_msg,
            "fallback_available": True
        }


def analyze_video_with_gemini(video_path: str, ad_name: str = "", copy_text: str = "") -> Dict[str, Any]:
    """
    使用 Gemini API 分析影片內容
    
    Args:
        video_path: 影片檔案路徑
        ad_name: 廣告名稱（提供上下文）
        copy_text: 文案內容（提供上下文）
    
    Returns:
        分析結果字典
    """
    if not video_path or not os.path.exists(video_path):
        return {"error": "Video file not found"}
    
    try:
        genai = get_gemini_client()
        
        # 上傳影片到 Gemini
        print(f"  ⬆ Uploading video to Gemini...")
        video_file = genai.upload_file(video_path)
        
        # 等待處理完成
        print(f"  ⏳ Waiting for video processing...")
        while video_file.state.name == "PROCESSING":
            time.sleep(2)
            video_file = genai.get_file(video_file.name)
        
        if video_file.state.name == "FAILED":
            return {"error": f"Video processing failed: {video_file.state.name}"}
        
        print(f"  ✓ Video ready for analysis")
        
        # 構建分析 prompt
        context = ""
        if ad_name:
            context += f"廣告名稱：{ad_name}\n"
        if copy_text:
            context += f"文案內容：{copy_text}\n"
        
        prompt = f"""請分析這支電商廣告影片，提供詳細的行銷洞察。

{context}

## 請分析以下面向：

### 1. 影片風格
- 整體視覺風格（專業/親切/活潑/高級感等）
- 色調和配色
- 剪輯節奏（快/慢/變化）
- 畫面構圖

### 2. 訊息傳達
- 核心賣點（影片強調什麼）
- 品牌調性
- 目標受眾（從影片風格判斷）
- 情感訴求（FOMO/信任感/品質感等）

### 3. CTA (Call to Action)
- 是否有明確的行動呼籲
- CTA 出現時機和方式
- CTA 有效性評估

### 4. 建議改進
- 影片可優化的地方
- 建議的 A/B 測試方向
- 與文案的搭配建議

### 5. 評分（1-10）
- 吸引力評分
- 專業度評分
- 說服力評分
- 整體評分

請以結構化 JSON 格式輸出，包含上述所有欄位。
"""
        
        # 選擇模型
        model_name = GEMINI_MODEL
        try:
            model = genai.GenerativeModel(model_name)
        except Exception:
            print(f"  ⚠️  {GEMINI_MODEL} unavailable, using {GEMINI_MODEL_FALLBACK}")
            model_name = GEMINI_MODEL_FALLBACK
            model = genai.GenerativeModel(model_name)
        
        print(f"  🤖 Analyzing with {model_name}...")
        
        # 執行分析
        response = model.generate_content(
            [video_file, prompt],
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 4096
            }
        )
        
        # 解析回應
        response_text = response.text
        
        # 嘗試解析 JSON
        analysis_result = {
            "model": model_name,
            "raw_response": response_text,
            "analyzed_at": datetime.now().isoformat()
        }
        
        # 嘗試提取 JSON
        try:
            # 找到 JSON 區塊
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                parsed = json.loads(json_str)
                analysis_result["parsed"] = parsed
        except json.JSONDecodeError:
            # JSON 解析失敗，保留原始文字
            pass
        
        print(f"  ✓ Analysis complete")
        
        # 清理上傳的檔案
        try:
            genai.delete_file(video_file.name)
        except:
            pass
        
        return analysis_result
        
    except Exception as e:
        return {"error": str(e)}


def cleanup_temp_files(video_path: str, thumbnail_path: str = None):
    """清理暫存檔案"""
    for path in [video_path, thumbnail_path]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
                print(f"  🗑 Cleaned up: {os.path.basename(path)}")
            except Exception as e:
                print(f"  ⚠️  Cleanup error for {path}: {e}")


def analyze_video_creative(creative: Dict[str, Any], week_start: str = None) -> Dict[str, Any]:
    """
    完整的影片素材分析流程
    
    支援兩種模式：
    1. 有影片 source URL：下載影片 → 截圖 → Gemini 影片分析
    2. 只有縮圖 URL：下載縮圖 → Gemini 圖片分析
    
    Args:
        creative: 廣告素材字典，包含 video_url 或 video_id
        week_start: 週開始日期（用於 Supabase 路徑）
    
    Returns:
        分析結果，包含：
        - video_thumbnail_url: Supabase 封面圖 URL
        - video_analysis: Gemini 分析結果
        - is_video: True
    """
    ad_id = creative.get("ad_id", "unknown")
    ad_name = creative.get("ad_name", "")
    video_url = creative.get("video_url")
    video_id = creative.get("video_id")
    copy_text = creative.get("body", "") or creative.get("title", "")
    
    print(f"\n📹 Analyzing video creative: {ad_name[:50]}...")
    
    result = {
        "is_video": True,
        "video_url": video_url,
        "video_id": video_id,
        "video_thumbnail_url": None,
        "video_analysis": None,
        "analysis_status": "pending",
        "analysis_mode": "unknown"  # "video" or "thumbnail"
    }
    
    # Step 1: 從 Meta API 取得影片資訊
    meta_info = {"video_url": None, "thumbnail_url": None}
    if video_id:
        meta_info = get_video_url_from_meta(video_id)
        if meta_info.get("video_url"):
            video_url = meta_info["video_url"]
            result["video_url"] = video_url
        if meta_info.get("description") and not copy_text:
            copy_text = meta_info["description"]
    
    thumbnail_url = meta_info.get("thumbnail_url")
    video_path = None
    thumbnail_path = None
    
    try:
        # 模式 1: 有影片 source URL - 完整影片分析
        if video_url:
            result["analysis_mode"] = "video"
            print(f"  📥 Mode: Full video analysis (Meta API source)")
            
            # Step 2a: 下載影片
            video_path = download_video(video_url, ad_id)
        
        # 模式 1.5: Meta API 沒有 source URL，但有 video_id → 嘗試 yt-dlp
        if not video_path and video_id:
            result["analysis_mode"] = "video_ytdlp"
            print(f"  📥 Mode: Full video analysis (yt-dlp fallback)")
            
            # 產生輸出路徑
            temp_path = f"/tmp/ad_video_{ad_id}_{video_id}.mp4"
            
            # 先嘗試 Facebook Reel，失敗會自動嘗試 Instagram Reel
            video_path = download_video_with_ytdlp(video_id, temp_path, platform="facebook")
            
            if video_path:
                result["download_method"] = "yt-dlp"
        
        # 繼續影片分析流程（不論是 Meta API 或 yt-dlp 下載的影片）
        if video_path:
            # Step 3a: 截取封面
            thumbnail_path = extract_video_thumbnail(video_path)
            
            # Step 4a: 上傳封面到 Supabase
            if thumbnail_path and week_start:
                supabase_url = upload_thumbnail_to_supabase(thumbnail_path, ad_id, week_start)
                result["video_thumbnail_url"] = supabase_url
            
            # Step 5a: 優先使用 GCP Video Intelligence API
            print(f"  🔍 Attempting GCP Video Intelligence analysis...")
            gcp_analysis = analyze_video_with_gcp(video_path)
            
            # 如果 GCP 分析成功
            if "error" not in gcp_analysis:
                result["video_analysis"] = {
                    "gcp_analysis": gcp_analysis,
                    "analysis_provider": "gcp_video_intelligence"
                }
                result["analysis_status"] = "success"
                print(f"  ✓ GCP Video Intelligence analysis succeeded")
            else:
                # GCP 失敗，fallback 到 Gemini
                print(f"  ⚠️  GCP analysis failed: {gcp_analysis.get('error', 'Unknown error')[:100]}")
                print(f"  🤖 Falling back to Gemini video analysis...")
                gemini_analysis = analyze_video_with_gemini(video_path, ad_name, copy_text)
                
                result["video_analysis"] = {
                    "gemini_analysis": gemini_analysis,
                    "gcp_error": gcp_analysis.get("error"),
                    "analysis_provider": "gemini"
                }
                
                if "error" in gemini_analysis:
                    result["analysis_status"] = "partial"
                else:
                    result["analysis_status"] = "success"
        
        # 模式 2: 沒有成功下載影片，但有縮圖 URL - 使用 Gemini 分析縮圖
        # （GCP Video Intelligence 需要完整影片，縮圖無法使用）
        if not video_path and thumbnail_url:
            result["analysis_mode"] = "thumbnail"
            print(f"  🖼️  Mode: Thumbnail analysis (video source unavailable)")
            print(f"  ℹ️  Note: GCP Video Intelligence requires full video, using Gemini for thumbnail")
            
            # Step 2b: 下載縮圖
            thumbnail_path = download_thumbnail(thumbnail_url, ad_id)
            
            if thumbnail_path:
                # Step 3b: 上傳到 Supabase
                if week_start:
                    supabase_url = upload_thumbnail_to_supabase(thumbnail_path, ad_id, week_start)
                    result["video_thumbnail_url"] = supabase_url
                
                # Step 4b: Gemini 圖片分析 (使用封面作為代表)
                print(f"  🤖 Running Gemini thumbnail analysis...")
                analysis = analyze_thumbnail_with_gemini(thumbnail_path, ad_name, copy_text)
                result["video_analysis"] = {
                    "gemini_analysis": analysis,
                    "analysis_provider": "gemini_thumbnail"
                }
                
                if "error" in analysis:
                    result["analysis_status"] = "partial"
                else:
                    result["analysis_status"] = "success"
            else:
                result["analysis_status"] = "error"
                result["error"] = "Thumbnail download failed"
        
        # 都沒有 - 既沒成功下載影片，也沒有縮圖
        if not video_path and not thumbnail_url:
            result["analysis_status"] = "error"
            result["error"] = "No video or thumbnail URL available"
            print(f"  ⚠️  No video or thumbnail URL available")
        
    finally:
        # Step 6: 清理暫存檔案
        cleanup_temp_files(video_path, thumbnail_path)
    
    return result


def download_thumbnail(thumbnail_url: str, creative_id: str) -> Optional[str]:
    """
    下載縮圖到 /tmp/ 目錄
    
    Args:
        thumbnail_url: 縮圖 URL
        creative_id: 用於命名檔案
    
    Returns:
        本地縮圖路徑或 None
    """
    if not thumbnail_url:
        return None
    
    # 產生唯一檔名
    url_hash = hashlib.md5(thumbnail_url.encode()).hexdigest()[:8]
    temp_path = f"/tmp/ad_thumbnail_{creative_id}_{url_hash}.jpg"
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
        }
        
        print(f"  ⬇ Downloading thumbnail...")
        resp = requests.get(thumbnail_url, headers=headers, timeout=30)
        
        if resp.status_code == 200:
            with open(temp_path, 'wb') as f:
                f.write(resp.content)
            
            file_size = os.path.getsize(temp_path)
            if file_size < 1000:
                print(f"  ⚠️  Thumbnail too small ({file_size} bytes)")
                os.remove(temp_path)
                return None
            
            print(f"  ✓ Thumbnail downloaded: {file_size / 1024:.1f} KB")
            return temp_path
        else:
            print(f"  ⚠️  Thumbnail download failed: HTTP {resp.status_code}")
            
    except Exception as e:
        print(f"  ⚠️  Thumbnail download error: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    return None


def analyze_thumbnail_with_gemini(thumbnail_path: str, ad_name: str = "", copy_text: str = "") -> Dict[str, Any]:
    """
    使用 Gemini API 分析影片縮圖
    
    當影片 source 不可用時，改用縮圖進行分析
    
    Args:
        thumbnail_path: 縮圖檔案路徑
        ad_name: 廣告名稱（提供上下文）
        copy_text: 文案內容（提供上下文）
    
    Returns:
        分析結果字典
    """
    if not thumbnail_path or not os.path.exists(thumbnail_path):
        return {"error": "Thumbnail file not found"}
    
    try:
        genai = get_gemini_client()
        
        # 上傳圖片
        print(f"  ⬆ Uploading thumbnail to Gemini...")
        image_file = genai.upload_file(thumbnail_path)
        
        # 構建分析 prompt
        context = ""
        if ad_name:
            context += f"廣告名稱：{ad_name}\n"
        if copy_text:
            context += f"文案內容：{copy_text}\n"
        
        prompt = f"""這是一個電商廣告影片的封面截圖。請分析這個視覺素材，提供詳細的行銷洞察。

{context}

## 請分析以下面向：

### 1. 視覺風格
- 整體構圖和視覺吸引力
- 色調和配色
- 產品呈現方式
- 文字元素（如有）

### 2. 品牌調性
- 專業度
- 目標受眾判斷
- 情感訴求

### 3. 行銷效果預測
- 點擊率潛力（從視覺吸引力判斷）
- 與文案的搭配度

### 4. 建議改進
- 視覺可優化的地方
- A/B 測試建議

### 5. 評分（1-10）
- 吸引力評分
- 專業度評分
- 整體評分

請以結構化 JSON 格式輸出。

注意：這是影片封面截圖，請推測影片可能的內容和風格。
"""
        
        # 選擇模型
        model_name = GEMINI_MODEL
        try:
            model = genai.GenerativeModel(model_name)
        except Exception:
            model_name = GEMINI_MODEL_FALLBACK
            model = genai.GenerativeModel(model_name)
        
        print(f"  🤖 Analyzing thumbnail with {model_name}...")
        
        # 執行分析
        response = model.generate_content(
            [image_file, prompt],
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 2048
            }
        )
        
        response_text = response.text
        
        analysis_result = {
            "model": model_name,
            "mode": "thumbnail_analysis",
            "raw_response": response_text,
            "analyzed_at": datetime.now().isoformat()
        }
        
        # 嘗試解析 JSON
        try:
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                parsed = json.loads(json_str)
                analysis_result["parsed"] = parsed
        except json.JSONDecodeError:
            pass
        
        print(f"  ✓ Thumbnail analysis complete")
        
        # 清理上傳的檔案
        try:
            genai.delete_file(image_file.name)
        except:
            pass
        
        return analysis_result
        
    except Exception as e:
        return {"error": str(e), "mode": "thumbnail_analysis"}


def is_video_creative(creative: Dict[str, Any]) -> bool:
    """
    檢查素材是否為影片
    
    Args:
        creative: 廣告素材字典
    
    Returns:
        True 如果是影片素材
    """
    # 檢查 video_url
    if creative.get("video_url"):
        return True
    
    # 檢查 video_id
    if creative.get("video_id"):
        return True
    
    # 檢查 object_story_spec 裡的影片
    object_story = creative.get("object_story_spec", {})
    if object_story:
        video_data = object_story.get("video_data", {})
        if video_data.get("video_id"):
            return True
    
    # 檢查 asset_feed_spec 裡的影片
    asset_feed = creative.get("asset_feed_spec", {})
    if asset_feed:
        videos = asset_feed.get("videos", [])
        if videos:
            return True
    
    return False


def extract_video_info(creative: Dict[str, Any]) -> Dict[str, Any]:
    """
    從 creative 中提取影片資訊
    
    Args:
        creative: 廣告素材字典
    
    Returns:
        包含 video_url 和 video_id 的字典
    """
    video_info = {
        "video_url": None,
        "video_id": None
    }
    
    # 直接欄位
    if creative.get("video_url"):
        video_info["video_url"] = creative["video_url"]
    if creative.get("video_id"):
        video_info["video_id"] = creative["video_id"]
    
    # object_story_spec
    object_story = creative.get("object_story_spec", {})
    if object_story:
        video_data = object_story.get("video_data", {})
        if video_data:
            if not video_info["video_id"]:
                video_info["video_id"] = video_data.get("video_id")
            if not video_info["video_url"]:
                # 有時候 video_data 裡有 permalink
                video_info["video_url"] = video_data.get("source")
    
    # asset_feed_spec
    asset_feed = creative.get("asset_feed_spec", {})
    if asset_feed:
        videos = asset_feed.get("videos", [])
        if videos and len(videos) > 0:
            first_video = videos[0]
            if not video_info["video_id"]:
                video_info["video_id"] = first_video.get("video_id")
    
    return video_info


# CLI for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test video analyzer")
    parser.add_argument("--video-url", help="Video URL to analyze")
    parser.add_argument("--video-id", help="Meta video ID")
    parser.add_argument("--ad-name", default="Test Ad", help="Ad name for context")
    
    args = parser.parse_args()
    
    if not args.video_url and not args.video_id:
        print("Error: Provide --video-url or --video-id")
        sys.exit(1)
    
    test_creative = {
        "ad_id": "test_123",
        "ad_name": args.ad_name,
        "video_url": args.video_url,
        "video_id": args.video_id
    }
    
    result = analyze_video_creative(test_creative, week_start="2026-02-12")
    print("\n" + "=" * 50)
    print("Analysis Result:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

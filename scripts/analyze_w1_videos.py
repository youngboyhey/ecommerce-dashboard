#!/usr/bin/env python3
"""
W1 影片分析腳本 (2026-01-09 ~ 2026-01-15)

分析兩個影片廣告：
1. 1521324662432181 - 輪框清潔劑 (82秒)
2. 851688220723778 - 香氛磚 (15秒)
"""

import sys
import json
from pathlib import Path

# 添加腳本路徑
sys.path.insert(0, str(Path(__file__).parent))

from video_analyzer import analyze_video_creative

def main():
    # W1 影片廣告資訊
    videos = [
        {
            "ad_id": "1521324662432181",
            "ad_name": "輪框清潔劑 - 82秒影片",
            "video_id": "1521324662432181",
            "body": "輪框清潔劑廣告",
        },
        {
            "ad_id": "851688220723778",
            "ad_name": "香氛磚 - 15秒影片",
            "video_id": "851688220723778",
            "body": "香氛磚廣告",
        }
    ]
    
    week_start = "2026-01-09"
    results = []
    
    print("=" * 60)
    print("🎬 W1 影片分析流程 (2026-01-09 ~ 2026-01-15)")
    print("=" * 60)
    
    for i, video in enumerate(videos, 1):
        print(f"\n{'='*60}")
        print(f"📹 [{i}/{len(videos)}] 分析影片: {video['ad_name']}")
        print(f"   Video ID: {video['video_id']}")
        print("=" * 60)
        
        result = analyze_video_creative(video, week_start=week_start)
        result["ad_id"] = video["ad_id"]
        result["ad_name"] = video["ad_name"]
        results.append(result)
        
        # 輸出摘要
        print(f"\n📊 分析結果摘要:")
        print(f"   - 下載方式: {result.get('download_method', result.get('analysis_mode', 'unknown'))}")
        print(f"   - 分析狀態: {result.get('analysis_status', 'unknown')}")
        print(f"   - 封面 URL: {result.get('video_thumbnail_url', 'N/A')}")
        
        if result.get('video_analysis'):
            analysis = result['video_analysis']
            provider = analysis.get('analysis_provider', 'unknown')
            print(f"   - 分析來源: {provider}")
            
            # 如果是 Gemini 分析，顯示解析的評分
            if 'gemini_analysis' in analysis:
                gemini = analysis['gemini_analysis']
                if 'parsed' in gemini:
                    parsed = gemini['parsed']
                    # 嘗試提取評分
                    if '評分' in parsed:
                        scores = parsed['評分']
                        print(f"   - 評分: {json.dumps(scores, ensure_ascii=False)}")
                    elif 'scores' in parsed:
                        print(f"   - Scores: {parsed['scores']}")
    
    # 輸出完整 JSON
    print("\n" + "=" * 60)
    print("📋 完整分析結果 JSON:")
    print("=" * 60)
    
    # 寫入結果檔案
    output_path = Path(__file__).parent / "w1_video_analysis_results.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 結果已儲存到: {output_path}")
    
    # 輸出每個影片的 Gemini 分析摘要
    for result in results:
        print(f"\n{'='*60}")
        print(f"📹 {result['ad_name']}")
        print("=" * 60)
        
        if result.get('video_analysis') and result['video_analysis'].get('gemini_analysis'):
            gemini = result['video_analysis']['gemini_analysis']
            if 'parsed' in gemini:
                print(json.dumps(gemini['parsed'], ensure_ascii=False, indent=2))
            elif 'raw_response' in gemini:
                # 截取前 1000 字符
                raw = gemini['raw_response'][:2000]
                print(raw)
        elif result.get('error'):
            print(f"❌ 錯誤: {result['error']}")

if __name__ == "__main__":
    main()

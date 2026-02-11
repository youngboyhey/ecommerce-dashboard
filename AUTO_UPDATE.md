# 🔄 自動更新機制設置指南

本指南說明如何讓每日/週報數據自動寫入 Supabase，Dashboard 即時顯示最新數據。

## 架構概覽

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  日報/週報腳本   │───>│   Supabase   │<───│   Dashboard    │
│  report_data.json│    │   Database   │    │   (Next.js)    │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## 方案一：Python 腳本直接寫入

### 1. 安裝 Supabase Python Client

```bash
pip install supabase
```

### 2. 建立寫入腳本

在 `~/clawd/` 建立 `upload_to_supabase.py`：

```python
#!/usr/bin/env python3
"""
上傳報告數據到 Supabase
"""

import json
import os
from datetime import datetime
from supabase import create_client

# Supabase 設定
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://your-project.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', 'your-service-role-key')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_report(report_path: str):
    """上傳報告到 Supabase"""
    
    with open(report_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 準備主報告數據
    report = {
        'mode': data['mode'],
        'start_date': data['start_date'],
        'end_date': data['end_date'],
        'generated_at': data['generated_at'],
        
        # Meta 數據
        'meta_spend': data['meta']['total']['spend'],
        'meta_ctr': data['meta']['total']['ctr'],
        'meta_clicks': data['meta']['total']['clicks'],
        'meta_roas': data['meta']['total']['roas'],
        'meta_purchases': data['meta']['total']['purchases'],
        'meta_atc': data['meta']['total']['atc'],
        'meta_conv_value': data['meta']['total']['conv_value'],
        'meta_cpa': data['meta']['total']['cpa'],
        
        # GA4 數據
        'ga4_active_users': data['ga4']['active_users'],
        'ga4_sessions': data['ga4']['sessions'],
        'ga4_atc': data['ga4']['atc'],
        'ga4_purchases': data['ga4']['purchases'],
        'ga4_revenue': data['ga4']['purchase_revenue'],
        'ga4_overall_conversion': data['ga4']['funnel_rates']['overall_conversion'],
        
        # Cyberbiz 數據
        'cyber_order_count': data['cyberbiz']['order_count'],
        'cyber_revenue': data['cyberbiz']['total_revenue'],
        'cyber_aov': data['cyberbiz']['aov'],
        
        # MER
        'mer': data['mer'],
        
        # 原始 JSON
        'raw_data': data
    }
    
    # Upsert 主報告 (如果日期重複則更新)
    result = supabase.table('reports').upsert(
        report,
        on_conflict='mode,start_date,end_date'
    ).execute()
    
    report_id = result.data[0]['id']
    print(f"✅ 報告已上傳: {report_id}")
    
    # 上傳廣告活動
    for campaign in data['meta']['campaigns']:
        supabase.table('meta_campaigns').insert({
            'report_id': report_id,
            'campaign_id': campaign['campaign_id'],
            'campaign_name': campaign['name'],
            'spend': campaign['spend'],
            'ctr': campaign['ctr'],
            'clicks': campaign['clicks'],
            'roas': campaign['roas'],
            'purchases': campaign['purchases'],
            'atc': campaign['atc'],
            'conv_value': campaign['conv_value'],
            'cpa': campaign['cpa']
        }).execute()
    
    # 上傳受眾數據
    for age in data['meta_audience']['age']:
        supabase.table('meta_audience_age').insert({
            'report_id': report_id,
            'age_range': age['age_range'],
            'spend': age['spend'],
            'impressions': age['impressions'],
            'clicks': age['clicks'],
            'purchases': age['purchases']
        }).execute()
    
    # 上傳商品排行
    for i, product in enumerate(data['cyberbiz']['product_ranking']):
        supabase.table('product_rankings').insert({
            'report_id': report_id,
            'product_name': product['product_name'],
            'sku': product['sku'],
            'total_quantity': product['total_quantity'],
            'total_revenue': product['total_revenue'],
            'rank': i + 1
        }).execute()
    
    # 上傳流量來源
    for channel in data['ga4_channels']:
        supabase.table('ga4_channels').insert({
            'report_id': report_id,
            'source': channel['source'],
            'sessions': channel['sessions'],
            'atc': channel['atc'],
            'purchases': channel['purchases'],
            'session_to_atc_rate': channel['session_to_atc_rate']
        }).execute()
    
    print(f"✅ 所有數據已同步完成！")
    return report_id

if __name__ == '__main__':
    import sys
    report_path = sys.argv[1] if len(sys.argv) > 1 else 'report_data.json'
    upload_report(report_path)
```

### 3. 在日報/週報腳本中呼叫

在你現有的報告生成腳本最後加入：

```python
# 生成報告後自動上傳
from upload_to_supabase import upload_report
upload_report('report_data.json')
```

## 方案二：使用 Cron Job

```bash
# 每天早上 10:30 自動上傳
30 10 * * * cd ~/clawd && python upload_to_supabase.py report_data.json

# 每週三 10:30 上傳週報
30 10 * * 3 cd ~/clawd && python upload_to_supabase.py report_data.json
```

## 方案三：OpenClaw 自動化

讓龍蝦超人在報告生成後自動觸發上傳：

```markdown
# 在 AGENTS.md 或工作流程中加入

每日報告完成後：
1. 生成 report_data.json
2. 執行 `python ~/clawd/upload_to_supabase.py`
3. 驗證 Dashboard 顯示正確
```

## 環境變數設置

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中設置
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

## 驗證數據同步

1. 執行上傳腳本
2. 前往 Supabase Dashboard → Table Editor
3. 確認 `reports` 表有新數據
4. 重整 CarMall Dashboard 頁面確認顯示

---

設置完成後，每次報告生成都會自動同步到雲端！🚀

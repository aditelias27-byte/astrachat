#!/usr/bin/env python3
# download & konversi 3 dataset HuggingFace -> JSONL format SFT {messages:[...], category}
# sumber:
#   EN  : metythorn/ultrachat              (800k, bahasa Inggris)
#   ID  : FreedomIntelligence/alpaca-gpt4-indonesian (50k, bahasa Indonesia)
#   CODE: OpenCoder-LLM/opc-sft-stage1     (1.02M, coding)
import json, urllib.request, sys, os

API = "https://datasets-server.huggingface.co/rows?dataset={ds}&config={cfg}&split={sp}&offset={off}&length=100"

def fetch(ds, cfg, sp, max_rows, out):
    n = 0
    off = 0
    with open(out, 'w', encoding='utf-8') as f:
        while n < max_rows:
            url = API.format(ds=urllib.request.quote(ds, safe=''), cfg=cfg, sp=sp, off=off)
            with urllib.request.urlopen(url, timeout=30) as r:
                d = json.load(r)
            rows = d.get('rows', [])
            if not rows:
                break
            for row in rows:
                w = row['row']
                msg = extract(ds, w)
                if msg:
                    f.write(json.dumps({'messages': msg, 'category': CATEGORY[ds]}, ensure_ascii=False) + '\n')
                    n += 1
                    if n >= max_rows:
                        break
            off += 100
    print(f"{ds}: {n} contoh -> {out}")
    return n

CATEGORY = {
    'metythorn/ultrachat': 'english',
    'FreedomIntelligence/alpaca-gpt4-indonesian': 'indonesian',
    'OpenCoder-LLM/opc-sft-stage1': 'coding',
}

def extract(ds, w):
    if ds == 'metythorn/ultrachat':
        try:
            conv = json.loads(w['data'])
        except Exception:
            return None
        return [{'role': 'user' if i % 2 == 0 else 'assistant', 'content': c} for i, c in enumerate(conv) if c]
    if ds == 'FreedomIntelligence/alpaca-gpt4-indonesian':
        conv = w.get('conversations', [])
        return [{'role': 'user' if c['from'] == 'human' else 'assistant', 'content': c['value'].strip()} for c in conv]
    if ds == 'OpenCoder-LLM/opc-sft-stage1':
        ins, out = (w.get('instruction') or '').strip(), (w.get('output') or '').strip()
        if not ins or not out:
            return None
        return [{'role': 'user', 'content': ins}, {'role': 'assistant', 'content': out}]
    return None

if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__) + '/../data')
    total = 0
    total += fetch('metythorn/ultrachat', 'default', 'train', 2000, 'train_english.jsonl')
    total += fetch('FreedomIntelligence/alpaca-gpt4-indonesian', 'default', 'train', 2000, 'train_indonesian.jsonl')
    total += fetch('OpenCoder-LLM/opc-sft-stage1', 'filtered_infinity_instruct', 'train', 2000, 'train_coding.jsonl')
    print(f"TOTAL: {total} contoh SFT siap pakai")

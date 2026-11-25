#!/usr/bin/env python3
# Kompress 6000 contoh SFT jadi "brain" ringkas per kategori: pattern pertanyaan->jawaban inti.
# Dipakai AstraBrain (RBT) untuk menjawab tanpa API key eksternal.
import json, re, os

os.chdir(os.path.dirname(__file__) + '/../data')

def keyword(q):
    stop = {'apa','yang','untuk','dengan','dan','the','a','an','of','to','in','is','how','what','can','you','bagaimana','itu','di','ke','dari','pada','adalah','akan','atau','juga','nya','please','me','my','i'}
    words = re.findall(r'[a-zA-Z\u00C0-\u024F]+', q.lower())
    return [w for w in words if w not in stop and len(w) > 2][:6]

def summarize(text, n=420):
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:n] + ('…' if len(text) > n else '')

brain = {'english': [], 'indonesian': [], 'coding': []}
for fname, cat in [('train_english.jsonl','english'), ('train_indonesian.jsonl','indonesian'), ('train_coding.jsonl','coding')]:
    seen = set()
    with open(fname, encoding='utf-8') as f:
        for line in f:
            d = json.loads(line)
            msgs = d['messages']
            q = next((m['content'] for m in msgs if m['role'] == 'user'), '')
            a = next((m['content'] for m in msgs if m['role'] == 'assistant'), '')
            if not q or not a:
                continue
            kw = ' '.join(keyword(q))
            if not kw or kw in seen:
                continue
            seen.add(kw)
            brain[cat].append({'kw': kw, 'q': q[:120], 'a': summarize(a)})

out = os.path.join('..', 'src', 'lib', 'knowledge', 'brain.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(brain, f, ensure_ascii=False)

for k, v in brain.items():
    print(k, len(v), 'pola')
print('ukuran brain.json:', round(os.path.getsize(out) / 1024, 1), 'KB')

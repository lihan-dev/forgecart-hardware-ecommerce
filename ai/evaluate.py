import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
products = json.loads((ROOT / "backend" / "data" / "products.json").read_text(encoding="utf-8"))
ranks = json.loads((ROOT / "backend" / "recommendations.json").read_text(encoding="utf-8"))
by_code = {product["productCode"]: product for product in products}
k = 3
precisions = []
recalls = []
ndcgs = []
for product in products:
    relevant = {candidate["productCode"] for candidate in products if candidate["category"] == product["category"] and candidate["productCode"] != product["productCode"]}
    recommended = ranks.get(product["productCode"], [])[:k]
    hits = [code for code in recommended if code in relevant]
    ideal_count = min(k, len(relevant))
    dcg = sum(1 / math.log2(index + 2) for index, code in enumerate(recommended) if code in relevant)
    idcg = sum(1 / math.log2(index + 2) for index in range(ideal_count))
    precisions.append(len(hits) / k)
    recalls.append(len(hits) / len(relevant) if relevant else 0)
    ndcgs.append(dcg / idcg if idcg else 0)

print("Evaluation assumption: products in the same category are relevant similar items.")
print(f"Evaluation products: {len(products)}")
print(f"K: {k}")
print(f"Precision@{k}: {sum(precisions) / len(precisions):.3f}")
print(f"Recall@{k}: {sum(recalls) / len(recalls):.3f}")
print(f"nDCG@{k}: {sum(ndcgs) / len(ndcgs):.3f}")
print("Note: this is an offline proxy evaluation, not a user study or compatibility assessment.")

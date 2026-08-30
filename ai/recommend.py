import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = Path(__file__).resolve().parent.parent
products_path = ROOT / "backend" / "data" / "products.json"
recommendations_path = ROOT / "backend" / "recommendations.json"

products = json.loads(products_path.read_text(encoding="utf-8"))
documents = []
for product in products:
    specifications = " ".join(f"{key} {value}" for key, value in product.get("specifications", {}).items())
    documents.append(" ".join([
        product["name"], product["brand"], product["category"],
        product.get("description", ""), specifications,
    ]))

vectorizer = TfidfVectorizer(stop_words="english")
tfidf_matrix = vectorizer.fit_transform(documents)
similarity_matrix = cosine_similarity(tfidf_matrix)

recommendations = {}
for index, product in enumerate(products):
    ranked_indexes = sorted(
        (candidate for candidate in range(len(products)) if candidate != index),
        key=lambda candidate: similarity_matrix[index, candidate],
        reverse=True,
    )[:3]
    recommendations[product["productCode"]] = [products[candidate]["productCode"] for candidate in ranked_indexes]

recommendations_path.write_text(json.dumps(recommendations, indent=2), encoding="utf-8")
print("TF-IDF model successfully fitted.")
print("Cosine similarity successfully calculated.")
print(f"Recommendations generated for {len(products)} products.")
print(f"Product: {products[0]['name']}")
for code in recommendations[products[0]["productCode"]]:
    match = next(product for product in products if product["productCode"] == code)
    print(f"- {match['name']}")
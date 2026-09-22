import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# List of common payment gateways & noise terms to strip
GATEWAY_NOISE = [
    r'UPI', r'POS', r'ACH', r'AUTODEBIT', r'E-MANDATE', r'BILLDESK', 
    r'RAZORPAY', r'PAYTM', r'STRIPE', r'NEFT', r'RTGS', r'IMPS', 
    r'MUMBAI', r'DELHI', r'BANGALORE', r'CHENNAI', r'HYDERABAD', r'IN'
]

def sanitize_description(text):
    text = str(text).upper()
    # Remove dates, digits, and transaction reference codes
    text = re.sub(r'\d+', ' ', text)
    text = re.sub(r'[/\\_\-:]', ' ', text)
    
    # Remove gateway noise words
    for noise in GATEWAY_NOISE:
        text = re.sub(rf'\b{noise}\b', ' ', text)
        
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) > 2 else "MISC_TRANSACTION"

def normalize_merchant_names(descriptions, similarity_threshold=0.75):
    """
    Uses TF-IDF Character N-Grams + Cosine Similarity to group 
    varying descriptors (e.g. 'NETFLIX MUMBAI' & 'NETFLIX RECURRING')
    into unified canonical names.
    """
    cleaned_descs = [sanitize_description(d) for d in descriptions]
    unique_cleaned = list(set(cleaned_descs))
    
    if len(unique_cleaned) < 2:
        return dict(zip(descriptions, cleaned_descs))

    # Vectorize strings using character 3-grams
    vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(3, 3))
    tfidf_matrix = vectorizer.fit_transform(unique_cleaned)
    
    # Calculate pairwise cosine similarity
    similarity_matrix = cosine_similarity(tfidf_matrix)
    
    mapping = {}
    visited = set()

    for i, name_i in enumerate(unique_cleaned):
        if name_i in visited:
            continue
        canonical_name = name_i
        mapping[name_i] = canonical_name
        visited.add(name_i)
        
        for j, name_j in enumerate(unique_cleaned):
            if j != i and name_j not in visited:
                if similarity_matrix[i][j] >= similarity_threshold:
                    mapping[name_j] = canonical_name
                    visited.add(name_j)

    # Map back to original descriptions
    final_mapping = {
        orig: mapping[clean] for orig, clean in zip(descriptions, cleaned_descs)
    }
    return final_mapping
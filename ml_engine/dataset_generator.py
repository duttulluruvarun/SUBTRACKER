import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_mock_transactions(num_months=6, seed=42):
    np.random.seed(seed)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=num_months * 30)
    
    records = []
    
    # 1. Defined recurring subscriptions. Each has a few realistic raw
    # descriptor variants (gateway prefix, city suffix, reference number) the
    # way real bank/UPI statements actually look — this is what gives the
    # NLP canonicalization layer real work to do instead of a static "0
    # Merged". Every variant is built so NLP_parser.sanitize_description()
    # strips it back down to the exact same cleaned string (noise words like
    # UPI/POS/RAZORPAY/city names, digits, and separators all get removed),
    # so canonical grouping is unaffected regardless of which variant lands.
    subscriptions = [
        {"desc": "NETFLIX RECURRING AUTOPAY", "amount": 649, "day": 5, "cat": "Entertainment",
         "variants": ["NETFLIX RECURRING AUTOPAY", "UPI/NETFLIX RECURRING AUTOPAY/{ref}", "POS-NETFLIX RECURRING AUTOPAY-MUMBAI"]},
        {"desc": "SPOTIFY INDIA MON-PAYMENT", "amount": 119, "day": 12, "cat": "Entertainment",
         "variants": ["SPOTIFY INDIA MON-PAYMENT", "UPI/SPOTIFY INDIA MON-PAYMENT/{ref}", "RAZORPAY-SPOTIFY INDIA MON-PAYMENT-CHENNAI"]},
        {"desc": "CULT FIT GYM AUTODEBIT", "amount": 1500, "day": 1, "cat": "Fitness",
         "variants": ["CULT FIT GYM AUTODEBIT", "CULT FIT GYM AUTODEBIT-BANGALORE", "ACH/CULT FIT GYM/{ref}"]},
        {"desc": "AWS WEB SERVICES MONTHLY", "amount": 820, "day": 20, "cat": "Cloud/SaaS",
         "variants": ["AWS WEB SERVICES MONTHLY", "STRIPE-AWS WEB SERVICES MONTHLY-{ref}", "NEFT/AWS WEB SERVICES MONTHLY/HYDERABAD"]},
        {"desc": "CHATGPT PLUS SUBSCRIPTION", "amount": 1999, "day": 15, "cat": "AI Tool",
         "variants": ["CHATGPT PLUS SUBSCRIPTION", "IMPS/CHATGPT PLUS SUBSCRIPTION/{ref}", "PAYTM-CHATGPT PLUS SUBSCRIPTION-DELHI"]},
    ]

    # Generate monthly entries for recurring items
    curr_date = start_date
    while curr_date <= end_date:
        for sub in subscriptions:
            # Add minor date noise (+/- 1 day)
            day_offset = np.random.choice([-1, 0, 1])
            try:
                tx_date = datetime(curr_date.year, curr_date.month, min(max(1, sub["day"] + day_offset), 28))
            except ValueError:
                tx_date = curr_date

            if start_date <= tx_date <= end_date:
                amt = sub["amount"]
                variant = np.random.choice(sub["variants"])
                description = variant.format(ref=np.random.randint(1000, 9999)) if "{ref}" in variant else variant
                records.append({
                    "Date": tx_date.strftime("%Y-%m-%d"),
                    "Time": f"{np.random.randint(0, 24):02d}:{np.random.randint(0, 60):02d}",
                    "Description": description,
                    "Amount": amt,
                    "Category": sub["cat"]
                })
        # Move to next month
        curr_date += timedelta(days=28)
    
    # 2. Random Non-recurring Transactions (Noise)
    random_merchants = [
        "Swiggy Order", "Zomato Payment", "Uber Ride", "Amazon Retail", 
        "Local Grocery Store", "Petrol Pump UPI", "BookMyShow"
    ]
    
    for _ in range(120):
        random_days = np.random.randint(0, num_months * 30)
        tx_date = start_date + timedelta(days=random_days)
        merchant = np.random.choice(random_merchants)
        amt = float(np.random.randint(50, 2500))
        
        records.append({
            "Date": tx_date.strftime("%Y-%m-%d"),
            "Time": f"{np.random.randint(0, 24):02d}:{np.random.randint(0, 60):02d}",
            "Description": merchant,
            "Amount": amt,
            "Category": "One-Time Spend"
        })
        
    df = pd.DataFrame(records)
    df = df.sort_values("Date").reset_index(drop=True)

    # Deliberate demo anomaly: the most recent AWS charge carries a real
    # price hike. Applied post-generation to the latest AWS row (instead of
    # gating on tx_date.month == today's real month) so it always shows up
    # regardless of what day the app happens to be run on.
    aws_mask = df["Description"].str.contains("AWS WEB SERVICES MONTHLY", regex=False)
    if aws_mask.any():
        last_aws_idx = df.loc[aws_mask, "Date"].idxmax()
        df.loc[last_aws_idx, "Amount"] += 400

    return df

if __name__ == "__main__":
    df = generate_mock_transactions()
    df.to_csv("transactions.csv", index=False)
    print("Sample dataset created successfully as 'transactions.csv'!")
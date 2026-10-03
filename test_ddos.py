import pandas as pd
import requests
import numpy as np

# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = r"C:\Users\Lenovo\Desktop\Cyber-Threat-Detection-Security-Analytics\dataset\Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"

NODE_API = "http://localhost:5000/api/predict"


# ============================================================
# MODEL FEATURES
# ============================================================

FEATURES = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "Average Packet Size",
    "Idle Mean",
    "Active Mean"
]


# ============================================================
# LOAD DATASET
# ============================================================

print("=" * 70)
print("CICIDS2017 DDoS TEST")
print("=" * 70)

print("\nLoading DDoS dataset...")

df = pd.read_csv(DATASET_PATH)

# Remove accidental spaces from column names
df.columns = df.columns.str.strip()

print("Dataset loaded successfully")
print("Rows:", len(df))
print("Columns:", len(df.columns))


# ============================================================
# FIND DDoS SAMPLE
# ============================================================

if "Label" not in df.columns:
    raise Exception("Label column not found in dataset.")

ddos_rows = df[
    df["Label"]
    .astype(str)
    .str.strip()
    .str.upper()
    == "DDOS"
]

if ddos_rows.empty:
    raise Exception("No DDoS rows found in dataset.")

print("\nDDoS samples found:", len(ddos_rows))

# Take first DDoS sample
sample = ddos_rows.iloc[0]


# ============================================================
# PREPARE FEATURES
# ============================================================

missing_features = [
    feature
    for feature in FEATURES
    if feature not in df.columns
]

if missing_features:
    raise Exception(
        "Missing model features:\n"
        + "\n".join(missing_features)
    )


payload = {}

for feature in FEATURES:

    value = sample[feature]

    # Convert invalid numeric values safely
    try:
        value = float(value)
    except (ValueError, TypeError):
        value = 0.0

    if not np.isfinite(value):
        value = 0.0

    # Destination Port should remain integer-like
    if feature == "Destination Port":
        value = int(value)

    payload[feature] = value


# ============================================================
# DISPLAY TEST SAMPLE
# ============================================================

print("\n" + "=" * 70)
print("SELECTED DDoS SAMPLE")
print("=" * 70)

print("Original Label :", sample["Label"])

print("\n19 MODEL FEATURES:")
print("-" * 70)

for feature in FEATURES:
    print(f"{feature}: {payload[feature]}")


# ============================================================
# SEND TO NODE BACKEND
# ============================================================

print("\n" + "=" * 70)
print("SENDING DDoS SAMPLE TO NODE API")
print("=" * 70)

try:

    response = requests.post(
        NODE_API,
        json=payload,
        timeout=15
    )

    print("\nNode Status Code:", response.status_code)

    print("\nNode Response:")
    print(response.text)

    if response.status_code == 200:
        print("\n" + "=" * 70)
        print("DDoS TEST SENT SUCCESSFULLY")
        print("=" * 70)

    else:
        print("\nNode API returned an error.")

except requests.exceptions.ConnectionError:

    print("\nERROR: Node backend is not reachable.")
    print("Make sure Node is running on:")
    print(NODE_API)

except requests.exceptions.Timeout:

    print("\nERROR: Node API request timed out.")

except Exception as error:

    print("\nERROR:", error)
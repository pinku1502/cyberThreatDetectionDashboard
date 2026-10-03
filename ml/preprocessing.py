import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

# ==========================================================
# CONFIGURATION
# ==========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")

os.makedirs(PROCESSED_DIR, exist_ok=True)

# ==========================================================
# RAW DATASET FILES
# ==========================================================

DATASET_FILES = [
    "Monday-WorkingHours.pcap_ISCX.csv",
    "Tuesday-WorkingHours.pcap_ISCX.csv",
    "Wednesday-workingHours.pcap_ISCX.csv",
    "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
    "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
    "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
]

# ==========================================================
# 19 FEATURES + LABEL
# ==========================================================

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
    "Active Mean",
]

COLUMNS = FEATURES + ["Label"]

# ==========================================================
# PROCESS ONE FILE
# ==========================================================

def process_file(file_name):

    file_path = os.path.join(DATASET_DIR, file_name)

    print(f"\nProcessing: {file_name}")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    # Read only required columns
    df = pd.read_csv(
        file_path,
        usecols=lambda column: column.strip() in COLUMNS,
        low_memory=False
    )

    # Clean column names
    df.columns = df.columns.str.strip()

    # Make sure all required columns exist
    missing = [column for column in COLUMNS if column not in df.columns]

    if missing:
        raise ValueError(
            f"Missing columns in {file_name}: {missing}"
        )

    # Keep exact order
    df = df[COLUMNS]

    # Remove duplicate rows inside this file
    before_duplicates = len(df)
    df.drop_duplicates(inplace=True)
    duplicates_removed = before_duplicates - len(df)

    # Replace infinity values
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # Remove rows containing missing values
    before_missing = len(df)
    df.dropna(inplace=True)
    missing_removed = before_missing - len(df)

    print(f"Rows after cleaning : {len(df):,}")
    print(f"Duplicates removed  : {duplicates_removed:,}")
    print(f"Missing rows removed : {missing_removed:,}")

    return df


# ==========================================================
# MAIN PROCESS
# ==========================================================

print("\n==============================================")
print("CICIDS2017 OPTIMIZED PREPROCESSING")
print("==============================================")

processed_parts = []

for file_name in DATASET_FILES:

    df_part = process_file(file_name)
    processed_parts.append(df_part)

# ==========================================================
# COMBINE CLEANED DATA
# ==========================================================

print("\nCombining cleaned datasets...")

df = pd.concat(
    processed_parts,
    ignore_index=True
)

# Release individual DataFrames
del processed_parts

print(f"\nCombined Shape: {df.shape}")

# ==========================================================
# REMOVE CROSS-FILE DUPLICATES
# ==========================================================

before = len(df)

df.drop_duplicates(inplace=True)

print(
    f"Cross-file duplicates removed: "
    f"{before - len(df):,}"
)

# ==========================================================
# LABEL ENCODING
# ==========================================================

print("\nEncoding labels...")

encoder = LabelEncoder()

df["Label"] = encoder.fit_transform(
    df["Label"].astype(str)
)

print("\nLabel Mapping:")

for encoded_value, attack_label in enumerate(encoder.classes_):
    print(f"{encoded_value:2d} -> {attack_label}")

# ==========================================================
# SAVE LABEL MAPPING
# ==========================================================

mapping = pd.DataFrame({
    "Encoded_Value": range(len(encoder.classes_)),
    "Attack_Label": encoder.classes_
})

mapping_path = os.path.join(
    PROCESSED_DIR,
    "label_mapping.csv"
)

mapping.to_csv(
    mapping_path,
    index=False,
    encoding="utf-8-sig"
)

# ==========================================================
# SAVE ENCODED DATASET
# ==========================================================

encoded_path = os.path.join(
    PROCESSED_DIR,
    "encoded_dataset.csv"
)

df.to_csv(
    encoded_path,
    index=False,
    encoding="utf-8-sig"
)

# ==========================================================
# FINAL REPORT
# ==========================================================

print("\n==============================================")
print("PREPROCESSING COMPLETED")
print("==============================================")

print(f"Final Shape     : {df.shape}")
print(f"Features        : {len(FEATURES)}")
print(f"Classes         : {len(encoder.classes_)}")
print(f"Encoded Dataset : {encoded_path}")
print(f"Label Mapping   : {mapping_path}")

print("\nClass Distribution:")
print(df["Label"].value_counts().sort_index())

print("\n==============================================")
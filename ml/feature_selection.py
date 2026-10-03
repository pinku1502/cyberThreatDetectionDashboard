import pandas as pd
import numpy as np
import glob
import os

# Dataset folder path
files = glob.glob("../dataset/*.csv")

print("Files Found:")
for file in files:
    print(file)

# Check files
if not files:
    print("ERROR: No CSV files found!")
    exit()

# Merge all CSV files
df = pd.concat(
    (pd.read_csv(file, low_memory=False) for file in files),
    ignore_index=True
)

print("\nOriginal Shape:", df.shape)

# Remove extra spaces from column names
df.columns = df.columns.str.strip()

# Replace Infinity values with NaN
df.replace([np.inf, -np.inf], np.nan, inplace=True)

print("\nCleaned Columns:")
print(df.columns.tolist())

# Features required for our ML model
selected_features = [
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
    "Label"
]

# Check which columns are missing
missing_columns = [col for col in selected_features if col not in df.columns]

if missing_columns:
    print("\nERROR: These columns are missing:")
    for col in missing_columns:
        print("-", col)

    print("\nAvailable Columns:")
    print(df.columns.tolist())
    exit()

# Select required features
df = df[selected_features]

# Create processed folder
os.makedirs("../dataset/processed", exist_ok=True)

# Save selected dataset
output_path = "../dataset/processed/selected_features.csv"
df.to_csv(output_path, index=False)

print("\nSelected Shape:", df.shape)
print("Saved to:", output_path)
print("\nFeature Selection Completed Successfully!")
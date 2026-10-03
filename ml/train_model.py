import os
import pandas as pd
from sklearn.model_selection import train_test_split

# =========================================================
# PATH CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")

ENCODED_DATASET = os.path.join(
    PROCESSED_DIR,
    "encoded_dataset.csv"
)

# =========================================================
# LOAD DATASET
# =========================================================

print("\n==============================================")
print("TRAIN / TEST DATASET PREPARATION")
print("==============================================")

print(f"\nLoading dataset:")
print(ENCODED_DATASET)

if not os.path.exists(ENCODED_DATASET):
    raise FileNotFoundError(
        f"\nEncoded dataset not found:\n{ENCODED_DATASET}"
    )

df = pd.read_csv(ENCODED_DATASET)

print(f"\nDataset Shape: {df.shape}")

# =========================================================
# SEPARATE FEATURES AND LABEL
# =========================================================

X = df.drop(columns=["Label"])
y = df["Label"]

print(f"X Shape: {X.shape}")
print(f"y Shape: {y.shape}")

# =========================================================
# TRAIN / TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\n==============================================")
print("TRAIN / TEST SPLIT")
print("==============================================")

print(f"X_train: {X_train.shape}")
print(f"X_test : {X_test.shape}")
print(f"y_train: {y_train.shape}")
print(f"y_test : {y_test.shape}")

# =========================================================
# SAVE TRAIN / TEST DATA
# =========================================================

X_train.to_csv(
    os.path.join(PROCESSED_DIR, "X_train.csv"),
    index=False
)

X_test.to_csv(
    os.path.join(PROCESSED_DIR, "X_test.csv"),
    index=False
)

y_train.to_csv(
    os.path.join(PROCESSED_DIR, "y_train.csv"),
    index=False
)

y_test.to_csv(
    os.path.join(PROCESSED_DIR, "y_test.csv"),
    index=False
)

print("\n==============================================")
print("TRAIN / TEST DATA SAVED SUCCESSFULLY")
print("==============================================")

print(f"\nSaved in:")
print(PROCESSED_DIR)

print("\nClass distribution - Training:")
print(y_train.value_counts().sort_index())

print("\nClass distribution - Testing:")
print(y_test.value_counts().sort_index())

print("\n==============================================")
print("COMPLETED")
print("==============================================")
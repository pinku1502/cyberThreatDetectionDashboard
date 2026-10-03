import os
import joblib
import pandas as pd

from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

# =========================================================
# PATH CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PROCESSED_DIR = os.path.join(
    BASE_DIR,
    "..",
    "dataset",
    "processed"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "saved_model"
)

ANALYSIS_DIR = os.path.join(
    BASE_DIR,
    "analysis"
)

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(ANALYSIS_DIR, exist_ok=True)


# =========================================================
# DATA PATHS
# =========================================================

X_TRAIN_PATH = os.path.join(
    PROCESSED_DIR,
    "X_train.csv"
)

X_TEST_PATH = os.path.join(
    PROCESSED_DIR,
    "X_test.csv"
)

Y_TRAIN_PATH = os.path.join(
    PROCESSED_DIR,
    "y_train.csv"
)

Y_TEST_PATH = os.path.join(
    PROCESSED_DIR,
    "y_test.csv"
)

LABEL_MAPPING_PATH = os.path.join(
    PROCESSED_DIR,
    "label_mapping.csv"
)


# =========================================================
# LOAD DATA
# =========================================================

print("=" * 60)
print("XGBOOST MULTICLASS TRAINING")
print("=" * 60)

print("\nLoading Train/Test Dataset...")

X_train = pd.read_csv(X_TRAIN_PATH)
X_test = pd.read_csv(X_TEST_PATH)

y_train = pd.read_csv(Y_TRAIN_PATH)["Label"]
y_test = pd.read_csv(Y_TEST_PATH)["Label"]

print(f"Training Features : {X_train.shape}")
print(f"Testing Features  : {X_test.shape}")

print(f"Training Labels   : {y_train.shape}")
print(f"Testing Labels    : {y_test.shape}")


# =========================================================
# LOAD LABEL MAPPING
# =========================================================

if not os.path.exists(LABEL_MAPPING_PATH):
    raise FileNotFoundError(
        f"Label mapping not found:\n{LABEL_MAPPING_PATH}"
    )

label_mapping = pd.read_csv(LABEL_MAPPING_PATH)

class_ids = label_mapping["Encoded_Value"].tolist()
class_names = label_mapping["Attack_Label"].astype(str).tolist()

print("\n" + "=" * 60)
print("LABEL MAPPING")
print("=" * 60)

print(label_mapping.to_string(index=False))

print(f"\nTotal Classes : {len(class_names)}")


# =========================================================
# DATA VALIDATION
# =========================================================

if X_train.columns.tolist() != X_test.columns.tolist():
    raise ValueError(
        "Training and testing feature columns do not match."
    )

if len(X_train.columns) != 19:
    raise ValueError(
        f"Expected 19 features, found {len(X_train.columns)}"
    )

if not set(y_train.unique()).issubset(set(class_ids)):
    raise ValueError(
        "Training labels contain unknown class IDs."
    )

if not set(y_test.unique()).issubset(set(class_ids)):
    raise ValueError(
        "Testing labels contain unknown class IDs."
    )

print("\nData validation successful.")


# =========================================================
# XGBOOST MULTICLASS MODEL
# =========================================================

print("\n" + "=" * 60)
print("TRAINING XGBOOST MULTICLASS MODEL")
print("=" * 60)

xgb_model = XGBClassifier(
    objective="multi:softmax",
    num_class=15,
    n_estimators=150,
    max_depth=8,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1,
    tree_method="hist",
    eval_metric="mlogloss"
)

print("\nModel Configuration:")
print("Objective    : multi:softmax")
print("Classes      : 15")
print("Estimators   : 150")
print("Max Depth    : 8")
print("Learning Rate: 0.1")
print("Tree Method  : hist")

print("\nTraining started...")

xgb_model.fit(
    X_train,
    y_train
)

print("\nXGBoost Training Completed!")


# =========================================================
# TEST PREDICTIONS
# =========================================================

print("\nGenerating Test Predictions...")

y_pred = xgb_model.predict(X_test)

print("Test predictions generated.")


# =========================================================
# TEST METRICS
# =========================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision_weighted = precision_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

recall_weighted = recall_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

f1_weighted = f1_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

precision_macro = precision_score(
    y_test,
    y_pred,
    average="macro",
    zero_division=0
)

recall_macro = recall_score(
    y_test,
    y_pred,
    average="macro",
    zero_division=0
)

f1_macro = f1_score(
    y_test,
    y_pred,
    average="macro",
    zero_division=0
)


# =========================================================
# RESULTS
# =========================================================

print("\n" + "=" * 60)
print("XGBOOST RESULTS")
print("=" * 60)

print(f"Testing Accuracy       : {accuracy:.6f}")

print("\nWeighted Metrics:")
print(f"Precision              : {precision_weighted:.6f}")
print(f"Recall                 : {recall_weighted:.6f}")
print(f"F1 Score               : {f1_weighted:.6f}")

print("\nMacro Metrics:")
print(f"Precision              : {precision_macro:.6f}")
print(f"Recall                 : {recall_macro:.6f}")
print(f"F1 Score               : {f1_macro:.6f}")


# =========================================================
# CLASSIFICATION REPORT
# =========================================================

print("\n" + "=" * 60)
print("CLASSIFICATION REPORT")
print("=" * 60)

report = classification_report(
    y_test,
    y_pred,
    labels=class_ids,
    target_names=class_names,
    zero_division=0
)

print(report)

report_path = os.path.join(
    ANALYSIS_DIR,
    "xgboost_report.txt"
)

with open(
    report_path,
    "w",
    encoding="utf-8"
) as file:
    file.write(report)


# =========================================================
# CONFUSION MATRIX
# =========================================================

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=class_ids
)

cm_df = pd.DataFrame(
    cm,
    index=class_names,
    columns=class_names
)

cm_path = os.path.join(
    ANALYSIS_DIR,
    "xgboost_confusion_matrix.csv"
)

cm_df.to_csv(cm_path)


# =========================================================
# OVERFITTING CHECK
# =========================================================

print("\n" + "=" * 60)
print("OVERFITTING CHECK")
print("=" * 60)

train_pred = xgb_model.predict(X_train)

train_accuracy = accuracy_score(
    y_train,
    train_pred
)

difference = abs(
    train_accuracy - accuracy
)

print(f"Training Accuracy : {train_accuracy:.6f}")
print(f"Testing Accuracy  : {accuracy:.6f}")
print(f"Difference        : {difference:.6f}")


# =========================================================
# SAVE METRICS
# =========================================================

metrics = pd.DataFrame([{
    "Training_Accuracy": train_accuracy,
    "Testing_Accuracy": accuracy,
    "Accuracy_Difference": difference,
    "Weighted_Precision": precision_weighted,
    "Weighted_Recall": recall_weighted,
    "Weighted_F1": f1_weighted,
    "Macro_Precision": precision_macro,
    "Macro_Recall": recall_macro,
    "Macro_F1": f1_macro
}])

metrics_path = os.path.join(
    ANALYSIS_DIR,
    "xgboost_metrics.csv"
)

metrics.to_csv(
    metrics_path,
    index=False
)


# =========================================================
# SAVE MODEL
# =========================================================

model_path = os.path.join(
    MODEL_DIR,
    "xgboost_model.pkl"
)

joblib.dump(
    xgb_model,
    model_path
)


# =========================================================
# FINAL OUTPUT
# =========================================================

print("\n" + "=" * 60)
print("XGBOOST MODEL SAVED SUCCESSFULLY")
print("=" * 60)

print(f"\nModel Path       : {model_path}")
print(f"Report Path      : {report_path}")
print(f"Confusion Matrix : {cm_path}")
print(f"Metrics Path     : {metrics_path}")

print("\nTraining Finished Successfully!")
print("=" * 60)
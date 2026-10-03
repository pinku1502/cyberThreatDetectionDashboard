import os
import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
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
# FILE PATHS
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
# LOAD TRAIN / TEST DATA
# =========================================================

print("=" * 60)
print("RANDOM FOREST MULTICLASS TRAINING")
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

print("\n" + "=" * 60)
print("LOADING LABEL MAPPING")
print("=" * 60)

if not os.path.exists(LABEL_MAPPING_PATH):
    raise FileNotFoundError(
        f"Label mapping not found:\n{LABEL_MAPPING_PATH}"
    )

label_mapping = pd.read_csv(LABEL_MAPPING_PATH)

print("\nLabel Mapping:")
print(label_mapping.to_string(index=False))

class_ids = label_mapping["Encoded_Value"].tolist()
class_names = label_mapping["Attack_Label"].astype(str).tolist()

print(f"\nTotal Classes: {len(class_names)}")


# =========================================================
# VERIFY DATA
# =========================================================

print("\n" + "=" * 60)
print("DATA VERIFICATION")
print("=" * 60)

if len(X_train.columns) != 19:
    raise ValueError(
        f"Expected 19 features, found {len(X_train.columns)}"
    )

if X_train.columns.tolist() != X_test.columns.tolist():
    raise ValueError(
        "Training and testing feature columns do not match."
    )

if not set(y_train.unique()).issubset(set(class_ids)):
    raise ValueError(
        "Training labels contain unknown class IDs."
    )

if not set(y_test.unique()).issubset(set(class_ids)):
    raise ValueError(
        "Testing labels contain unknown class IDs."
    )

print("Feature count : 19")
print("Feature columns : OK")
print("Class mapping : OK")
print("Training labels : OK")
print("Testing labels : OK")


# =========================================================
# RANDOM FOREST MULTICLASS MODEL
# =========================================================

print("\n" + "=" * 60)
print("TRAINING RANDOM FOREST MULTICLASS MODEL")
print("=" * 60)

rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=25,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)

print("\nModel Configuration:")
print("n_estimators :", 200)
print("max_depth    :", 25)
print("class_weight : balanced")
print("n_jobs       : -1")

print("\nTraining started...")

rf_model.fit(
    X_train,
    y_train
)

print("\nRandom Forest Training Completed!")


# =========================================================
# PREDICTIONS
# =========================================================

print("\n" + "=" * 60)
print("GENERATING PREDICTIONS")
print("=" * 60)

train_pred = rf_model.predict(X_train)
test_pred = rf_model.predict(X_test)

print("Predictions generated successfully.")


# =========================================================
# PERFORMANCE METRICS
# =========================================================

train_accuracy = accuracy_score(
    y_train,
    train_pred
)

test_accuracy = accuracy_score(
    y_test,
    test_pred
)

precision_weighted = precision_score(
    y_test,
    test_pred,
    average="weighted",
    zero_division=0
)

recall_weighted = recall_score(
    y_test,
    test_pred,
    average="weighted",
    zero_division=0
)

f1_weighted = f1_score(
    y_test,
    test_pred,
    average="weighted",
    zero_division=0
)

precision_macro = precision_score(
    y_test,
    test_pred,
    average="macro",
    zero_division=0
)

recall_macro = recall_score(
    y_test,
    test_pred,
    average="macro",
    zero_division=0
)

f1_macro = f1_score(
    y_test,
    test_pred,
    average="macro",
    zero_division=0
)


# =========================================================
# PRINT RESULTS
# =========================================================

print("\n" + "=" * 60)
print("RANDOM FOREST RESULTS")
print("=" * 60)

print(f"Training Accuracy     : {train_accuracy:.6f}")
print(f"Testing Accuracy      : {test_accuracy:.6f}")

print(
    f"Accuracy Difference   : "
    f"{abs(train_accuracy - test_accuracy):.6f}"
)

print("\nWeighted Metrics:")
print(f"Precision             : {precision_weighted:.6f}")
print(f"Recall                : {recall_weighted:.6f}")
print(f"F1 Score              : {f1_weighted:.6f}")

print("\nMacro Metrics:")
print(f"Precision             : {precision_macro:.6f}")
print(f"Recall                : {recall_macro:.6f}")
print(f"F1 Score              : {f1_macro:.6f}")


# =========================================================
# CLASSIFICATION REPORT
# =========================================================

print("\n" + "=" * 60)
print("CLASSIFICATION REPORT")
print("=" * 60)

report = classification_report(
    y_test,
    test_pred,
    labels=class_ids,
    target_names=class_names,
    zero_division=0
)

print(report)

report_path = os.path.join(
    ANALYSIS_DIR,
    "random_forest_report.txt"
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
    test_pred,
    labels=class_ids
)

cm_df = pd.DataFrame(
    cm,
    index=class_names,
    columns=class_names
)

cm_path = os.path.join(
    ANALYSIS_DIR,
    "random_forest_confusion_matrix.csv"
)

cm_df.to_csv(cm_path)


# =========================================================
# FEATURE IMPORTANCE
# =========================================================

importance = pd.DataFrame({
    "Feature": X_train.columns,
    "Importance": rf_model.feature_importances_
})

importance = importance.sort_values(
    by="Importance",
    ascending=False
)

importance_path = os.path.join(
    ANALYSIS_DIR,
    "random_forest_feature_importance.csv"
)

importance.to_csv(
    importance_path,
    index=False
)

print("\n" + "=" * 60)
print("TOP 15 FEATURES")
print("=" * 60)

print(
    importance.head(15).to_string(index=False)
)


# =========================================================
# SAVE MODEL
# =========================================================

model_path = os.path.join(
    MODEL_DIR,
    "random_forest_model.pkl"
)

joblib.dump(
    rf_model,
    model_path
)


# =========================================================
# SAVE TRAINING METRICS
# =========================================================

metrics = pd.DataFrame([{
    "Training_Accuracy": train_accuracy,
    "Testing_Accuracy": test_accuracy,
    "Accuracy_Difference": abs(
        train_accuracy - test_accuracy
    ),
    "Weighted_Precision": precision_weighted,
    "Weighted_Recall": recall_weighted,
    "Weighted_F1": f1_weighted,
    "Macro_Precision": precision_macro,
    "Macro_Recall": recall_macro,
    "Macro_F1": f1_macro
}])

metrics_path = os.path.join(
    ANALYSIS_DIR,
    "random_forest_metrics.csv"
)

metrics.to_csv(
    metrics_path,
    index=False
)


# =========================================================
# FINAL OUTPUT
# =========================================================

print("\n" + "=" * 60)
print("RANDOM FOREST MODEL SAVED SUCCESSFULLY")
print("=" * 60)

print(f"\nModel Path   : {model_path}")
print(f"Report Path  : {report_path}")
print(f"Confusion Matrix : {cm_path}")
print(f"Feature Importance : {importance_path}")
print(f"Metrics Path : {metrics_path}")

print("\nTraining Finished Successfully!")
print("=" * 60)
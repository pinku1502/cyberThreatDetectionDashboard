# ============================================================
# HYBRID CLASSIFIER
# Random Forest + XGBoost
# 50:50 Probability Ensemble
# 15-Class Multiclass Evaluation
# ============================================================

import os
import joblib
import numpy as np
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# ============================================================
# PATH CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_DIR = os.path.join(BASE_DIR, "ml", "saved_model")
DATASET_DIR = os.path.join(BASE_DIR, "dataset", "processed")
ANALYSIS_DIR = os.path.join(BASE_DIR, "ml", "analysis")

RF_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "random_forest_model.pkl"
)

XGB_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "xgboost_model.pkl"
)

LABEL_MAPPING_PATH = os.path.join(
    DATASET_DIR,
    "label_mapping.csv"
)

ENCODED_DATASET_PATH = os.path.join(
    DATASET_DIR,
    "encoded_dataset.csv"
)

TRAIN_TEST_DIR = os.path.join(
    DATASET_DIR,
    "train_test"
)

os.makedirs(ANALYSIS_DIR, exist_ok=True)


# ============================================================
# CONFIGURATION
# ============================================================

RF_WEIGHT = 0.50
XGB_WEIGHT = 0.50

BATCH_SIZE = 10000

RANDOM_STATE = 42


# ============================================================
# HEADER
# ============================================================

print("=" * 60)
print("HYBRID RANDOM FOREST + XGBOOST")
print("15-CLASS MULTICLASS EVALUATION")
print("=" * 60)


# ============================================================
# LOAD MODELS
# ============================================================

print("\nLoading Random Forest model...")

rf_model = joblib.load(RF_MODEL_PATH)

print("Random Forest model loaded successfully.")


print("\nLoading XGBoost model...")

xgb_model = joblib.load(XGB_MODEL_PATH)

print("XGBoost model loaded successfully.")


# ============================================================
# LOAD LABEL MAPPING
# ============================================================

print("\n" + "=" * 60)
print("LOADING LABEL MAPPING")
print("=" * 60)

label_mapping = pd.read_csv(LABEL_MAPPING_PATH)

label_mapping["Encoded_Value"] = label_mapping[
    "Encoded_Value"
].astype(int)

label_mapping = label_mapping.sort_values(
    "Encoded_Value"
).reset_index(drop=True)


print("\nLabel Mapping:")

print(
    label_mapping.to_string(index=False)
)

NUM_CLASSES = len(label_mapping)

print(f"\nTotal Classes : {NUM_CLASSES}")


# ============================================================
# VERIFY CLASS COUNT
# ============================================================

rf_classes = len(
    getattr(rf_model, "classes_", [])
)

xgb_classes = len(
    getattr(xgb_model, "classes_", [])
)

print("\nModel Class Verification:")

print(f"Random Forest Classes : {rf_classes}")
print(f"XGBoost Classes       : {xgb_classes}")

if rf_classes != NUM_CLASSES:
    raise ValueError(
        "Random Forest class count does not match label mapping."
    )

if xgb_classes != NUM_CLASSES:
    raise ValueError(
        "XGBoost class count does not match label mapping."
    )

print("\nClass verification successful.")


# ============================================================
# LOAD TRAIN / TEST DATA
# ============================================================

print("\n" + "=" * 60)
print("LOADING TEST DATA")
print("=" * 60)


X_test_path = os.path.join(
    TRAIN_TEST_DIR,
    "X_test.csv"
)

y_test_path = os.path.join(
    TRAIN_TEST_DIR,
    "y_test.csv"
)


if os.path.exists(X_test_path) and os.path.exists(y_test_path):

    print("\nLoading saved X_test and y_test...")

    X_test = pd.read_csv(X_test_path)
    y_test = pd.read_csv(
        y_test_path
    ).squeeze()

else:

    print(
        "\nSaved train/test files not found."
    )

    print(
        "Loading encoded dataset and creating test split..."
    )

    from sklearn.model_selection import train_test_split

    dataset = pd.read_csv(
        ENCODED_DATASET_PATH
    )

    X = dataset.drop(
        columns=["Label"]
    )

    y = dataset["Label"]

    _, X_test, _, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=y
    )


print(
    f"\nTesting Features : {X_test.shape}"
)

print(
    f"Testing Labels   : {y_test.shape}"
)


# ============================================================
# FEATURE VERIFICATION
# ============================================================

print("\n" + "=" * 60)
print("FEATURE VERIFICATION")
print("=" * 60)


if hasattr(rf_model, "feature_names_in_"):

    model_features = list(
        rf_model.feature_names_in_
    )

    missing_features = [
        feature
        for feature in model_features
        if feature not in X_test.columns
    ]

    if missing_features:

        raise ValueError(
            f"Missing features: {missing_features}"
        )

    X_test = X_test[
        model_features
    ]

    print(
        f"\nFeatures verified : {len(model_features)}"
    )

else:

    print(
        "\nWarning: RF model does not contain feature_names_in_."
    )


# ============================================================
# CONVERT LABELS
# ============================================================

y_test = y_test.astype(int).to_numpy()


# ============================================================
# BATCH-WISE HYBRID PREDICTION
# ============================================================

print("\n" + "=" * 60)
print("HYBRID PREDICTION")
print("=" * 60)

print(
    f"\nBatch Size : {BATCH_SIZE}"
)

print(
    f"RF Weight  : {RF_WEIGHT}"
)

print(
    f"XGB Weight : {XGB_WEIGHT}"
)


hybrid_predictions = []

hybrid_confidences = []


total_samples = len(X_test)

total_batches = int(
    np.ceil(
        total_samples / BATCH_SIZE
    )
)


print(
    f"\nTotal Samples : {total_samples}"
)

print(
    f"Total Batches : {total_batches}"
)


for batch_number, start in enumerate(
    range(
        0,
        total_samples,
        BATCH_SIZE
    ),
    start=1
):

    end = min(
        start + BATCH_SIZE,
        total_samples
    )

    X_batch = X_test.iloc[
        start:end
    ]


    # --------------------------------------------------------
    # RANDOM FOREST PROBABILITIES
    # --------------------------------------------------------

    rf_probabilities = rf_model.predict_proba(
        X_batch
    )


    # --------------------------------------------------------
    # XGBOOST PROBABILITIES
    # --------------------------------------------------------

    xgb_probabilities = xgb_model.predict_proba(
        X_batch
    )


    # --------------------------------------------------------
    # 50:50 HYBRID
    # --------------------------------------------------------

    hybrid_probabilities = (
        RF_WEIGHT * rf_probabilities
        +
        XGB_WEIGHT * xgb_probabilities
    )


    # --------------------------------------------------------
    # FINAL CLASS
    # --------------------------------------------------------

    batch_predictions = np.argmax(
        hybrid_probabilities,
        axis=1
    )


    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    batch_confidences = np.max(
        hybrid_probabilities,
        axis=1
    )


    hybrid_predictions.extend(
        batch_predictions.tolist()
    )

    hybrid_confidences.extend(
        batch_confidences.tolist()
    )


    print(
        f"Batch {batch_number}/{total_batches} "
        f"processed "
        f"({end}/{total_samples})"
    )


# ============================================================
# CONVERT RESULTS
# ============================================================

hybrid_predictions = np.array(
    hybrid_predictions
)

hybrid_confidences = np.array(
    hybrid_confidences
)


# ============================================================
# HYBRID METRICS
# ============================================================

print("\n" + "=" * 60)
print("HYBRID RESULTS")
print("=" * 60)


accuracy = accuracy_score(
    y_test,
    hybrid_predictions
)


precision_weighted = precision_score(
    y_test,
    hybrid_predictions,
    average="weighted",
    zero_division=0
)


recall_weighted = recall_score(
    y_test,
    hybrid_predictions,
    average="weighted",
    zero_division=0
)


f1_weighted = f1_score(
    y_test,
    hybrid_predictions,
    average="weighted",
    zero_division=0
)


precision_macro = precision_score(
    y_test,
    hybrid_predictions,
    average="macro",
    zero_division=0
)


recall_macro = recall_score(
    y_test,
    hybrid_predictions,
    average="macro",
    zero_division=0
)


f1_macro = f1_score(
    y_test,
    hybrid_predictions,
    average="macro",
    zero_division=0
)


print(
    f"\nAccuracy           : {accuracy:.6f}"
)

print("\nWeighted Metrics:")

print(
    f"Precision          : {precision_weighted:.6f}"
)

print(
    f"Recall             : {recall_weighted:.6f}"
)

print(
    f"F1 Score           : {f1_weighted:.6f}"
)


print("\nMacro Metrics:")

print(
    f"Precision          : {precision_macro:.6f}"
)

print(
    f"Recall             : {recall_macro:.6f}"
)

print(
    f"F1 Score           : {f1_macro:.6f}"
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

class_names = label_mapping[
    "Attack_Label"
].tolist()


print("\n" + "=" * 60)
print("CLASSIFICATION REPORT")
print("=" * 60)


report = classification_report(
    y_test,
    hybrid_predictions,
    labels=list(range(NUM_CLASSES)),
    target_names=class_names,
    zero_division=0
)


print(report)


# ============================================================
# CONFUSION MATRIX
# ============================================================

print("\nGenerating confusion matrix...")

cm = confusion_matrix(
    y_test,
    hybrid_predictions,
    labels=list(range(NUM_CLASSES))
)


cm_df = pd.DataFrame(
    cm,
    index=class_names,
    columns=class_names
)


cm_path = os.path.join(
    ANALYSIS_DIR,
    "hybrid_confusion_matrix.csv"
)


cm_df.to_csv(
    cm_path
)


print(
    f"Confusion Matrix saved: {cm_path}"
)


# ============================================================
# METRICS FILE
# ============================================================

metrics_df = pd.DataFrame(
    [
        {
            "Model": "Hybrid RF + XGBoost",
            "RF_Weight": RF_WEIGHT,
            "XGB_Weight": XGB_WEIGHT,
            "Accuracy": accuracy,
            "Weighted_Precision": precision_weighted,
            "Weighted_Recall": recall_weighted,
            "Weighted_F1": f1_weighted,
            "Macro_Precision": precision_macro,
            "Macro_Recall": recall_macro,
            "Macro_F1": f1_macro
        }
    ]
)


metrics_path = os.path.join(
    ANALYSIS_DIR,
    "hybrid_metrics.csv"
)


metrics_df.to_csv(
    metrics_path,
    index=False
)


print(
    f"Metrics saved: {metrics_path}"
)


# ============================================================
# DETAILED REPORT FILE
# ============================================================

report_path = os.path.join(
    ANALYSIS_DIR,
    "hybrid_report.txt"
)


with open(
    report_path,
    "w",
    encoding="utf-8"
) as file:

    file.write(
        "HYBRID RANDOM FOREST + XGBOOST\n"
    )

    file.write(
        "15-Class Multiclass Evaluation\n"
    )

    file.write(
        "=" * 60 + "\n\n"
    )

    file.write(
        f"RF Weight      : {RF_WEIGHT}\n"
    )

    file.write(
        f"XGBoost Weight : {XGB_WEIGHT}\n"
    )

    file.write(
        f"Batch Size     : {BATCH_SIZE}\n\n"
    )

    file.write(
        f"Accuracy       : {accuracy:.6f}\n"
    )

    file.write(
        f"Weighted Precision : {precision_weighted:.6f}\n"
    )

    file.write(
        f"Weighted Recall    : {recall_weighted:.6f}\n"
    )

    file.write(
        f"Weighted F1        : {f1_weighted:.6f}\n\n"
    )

    file.write(
        f"Macro Precision : {precision_macro:.6f}\n"
    )

    file.write(
        f"Macro Recall    : {recall_macro:.6f}\n"
    )

    file.write(
        f"Macro F1        : {f1_macro:.6f}\n\n"
    )

    file.write(
        "CLASSIFICATION REPORT\n"
    )

    file.write(
        "=" * 60 + "\n\n"
    )

    file.write(report)


print(
    f"Report saved: {report_path}"
)


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("HYBRID CLASSIFIER EVALUATION COMPLETED")
print("=" * 60)

print(
    f"\nTotal Samples Evaluated : {total_samples}"
)

print(
    f"Hybrid Accuracy         : {accuracy:.6f}"
)

print(
    f"Hybrid Macro F1         : {f1_macro:.6f}"
)

print(
    f"Hybrid Weighted F1      : {f1_weighted:.6f}"
)

print(
    "\nHybrid model uses:"
)

print(
    "Random Forest  = 50%"
)

print(
    "XGBoost        = 50%"
)

print(
    "\nAll results saved successfully."
)

print("=" * 60)
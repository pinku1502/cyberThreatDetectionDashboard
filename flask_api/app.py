from flask import Flask, request, jsonify
from flask_cors import CORS

import pandas as pd
import numpy as np
import joblib
import traceback
import json
import os
import sys


if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# PATH CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PROJECT_DIR = os.path.dirname(
    BASE_DIR
)

MODEL_DIR = os.path.join(
    PROJECT_DIR,
    "ml",
    "saved_model"
)

DATASET_DIR = os.path.join(
    PROJECT_DIR,
    "dataset",
    "processed"
)


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


# ============================================================
# HYBRID CONFIGURATION
# ============================================================

RF_WEIGHT = 0.50
XGB_WEIGHT = 0.50


# ============================================================
# LOAD MODELS
# ============================================================

print("\n============================================================")
print("LOADING ML MODELS")
print("============================================================")

try:

    rf_model = joblib.load(
        RF_MODEL_PATH
    )

    print("Random Forest Loaded Successfully")

    xgb_model = joblib.load(
        XGB_MODEL_PATH
    )

    print("XGBoost Loaded Successfully")

except Exception as e:

    print("Model Loading Error:")
    traceback.print_exc()

    raise e


# ============================================================
# LOAD LABEL MAPPING
# ============================================================

try:
    with open(
        os.path.join(BASE_DIR, "label_mapping.json"),
        "r",
        encoding="utf-8"
    ) as mapping_file:
        attack_labels = json.load(mapping_file)

    ATTACK_LABELS = {
        encoded_value: label
        for encoded_value, label in enumerate(attack_labels)
    }

    print(f"Label Mapping Loaded: {len(ATTACK_LABELS)} classes")

    for encoded_value, label in ATTACK_LABELS.items():
        print(f"  {encoded_value} -> {label}")

except Exception as e:
    print("Label Mapping Loading Error:")
    traceback.print_exc()
    raise e


# ============================================================
# VERIFY MODELS
# ============================================================

RF_CLASSES = len(
    getattr(
        rf_model,
        "classes_",
        []
    )
)

XGB_CLASSES = len(
    getattr(
        xgb_model,
        "classes_",
        []
    )
)

TOTAL_CLASSES = len(
    ATTACK_LABELS
)


print("\n============================================================")
print("MODEL VERIFICATION")
print("============================================================")

print(
    f"Random Forest Classes : {RF_CLASSES}"
)

print(
    f"XGBoost Classes       : {XGB_CLASSES}"
)

print(
    f"Label Mapping Classes : {TOTAL_CLASSES}"
)


if RF_CLASSES != TOTAL_CLASSES:

    raise ValueError(
        "Random Forest classes do not match label mapping."
    )


if XGB_CLASSES != TOTAL_CLASSES:

    raise ValueError(
        "XGBoost classes do not match label mapping."
    )


print("Model Class Verification Successful")


# ============================================================
# GET MODEL FEATURES
# ============================================================

if hasattr(
    rf_model,
    "feature_names_in_"
):

    MODEL_FEATURES = (
        rf_model
        .feature_names_in_
        .tolist()
    )

else:

    raise ValueError(
        "Random Forest model does not contain feature_names_in_."
    )


print(
    f"Model Features : {len(MODEL_FEATURES)}"
)


# ============================================================
# SEVERITY MAPPING
# ============================================================

def get_severity(attack):

    if not attack or attack == "BENIGN":

        return "Low"


    if attack in [
        "DDoS",
        "Heartbleed"
    ]:

        return "Critical"


    if attack in [
        "Bot",
        "PortScan",
        "DoS Hulk",
        "DoS GoldenEye",
        "DoS Slowhttptest",
        "DoS slowloris",
        "DoS Slowloris"
    ]:

        return "High"


    if attack in [
        "FTP-Patator",
        "SSH-Patator",
        "Infiltration",
        "Web Attack – Brute Force",
        "Web Attack – Sql Injection",
        "Web Attack – XSS",
        "Web Attack Brute Force",
        "Web Attack SQL Injection",
        "Web Attack XSS"
    ]:

        return "Medium"


    return "Low"


# ============================================================
# HOME ROUTE
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({

        "status": "Running",

        "project":
            "Cyber Threat Detection Dashboard",

        "classifier":
            "Hybrid Random Forest + XGBoost",

        "classes":
            TOTAL_CLASSES,

        "rf_weight":
            RF_WEIGHT,

        "xgb_weight":
            XGB_WEIGHT
    })


# ============================================================
# PREDICTION ROUTE
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        # ----------------------------------------------------
        # GET INPUT
        # ----------------------------------------------------

        data = request.get_json()

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No input data received."

            }), 400


        # ----------------------------------------------------
        # PREPARE MODEL INPUT
        # ----------------------------------------------------

        input_data = {}

        for feature in MODEL_FEATURES:

            value = data.get(
                feature,
                0
            )

            try:

                value = float(value)

            except (
                ValueError,
                TypeError
            ):

                value = 0.0

            input_data[feature] = value


        input_df = pd.DataFrame(
            [input_data],
            columns=MODEL_FEATURES
        )


        # ----------------------------------------------------
        # RANDOM FOREST
        # ----------------------------------------------------

        rf_probabilities = (
            rf_model
            .predict_proba(input_df)[0]
        )

        rf_prediction = int(
            np.argmax(rf_probabilities)
        )

        rf_confidence = float(
            np.max(rf_probabilities)
        )


        # ----------------------------------------------------
        # XGBOOST
        # ----------------------------------------------------

        xgb_probabilities = (
            xgb_model
            .predict_proba(input_df)[0]
        )

        xgb_prediction = int(
            np.argmax(xgb_probabilities)
        )

        xgb_confidence = float(
            np.max(xgb_probabilities)
        )


        # ----------------------------------------------------
        # 50:50 HYBRID PROBABILITY
        # ----------------------------------------------------

        hybrid_probabilities = (

            RF_WEIGHT * rf_probabilities

            +

            XGB_WEIGHT * xgb_probabilities

        )


        # ----------------------------------------------------
        # FINAL HYBRID PREDICTION
        # ----------------------------------------------------

        final_prediction = int(
            np.argmax(
                hybrid_probabilities
            )
        )


        # ----------------------------------------------------
        # FINAL HYBRID CONFIDENCE
        # ----------------------------------------------------

        hybrid_confidence = float(
            np.max(
                hybrid_probabilities
            )
        )


        # ----------------------------------------------------
        # ATTACK NAME
        # ----------------------------------------------------

        attack_name = ATTACK_LABELS.get(
            final_prediction,
            "Unknown"
        )


        # ----------------------------------------------------
        # SEVERITY
        # ----------------------------------------------------

        severity = get_severity(
            attack_name
        )


        # ----------------------------------------------------
        # MODEL AGREEMENT
        # ----------------------------------------------------

        models_agree = (
            rf_prediction ==
            xgb_prediction
        )


        # ----------------------------------------------------
        # DEBUG INFORMATION
        # ----------------------------------------------------

        print(
            "\n============================================================"
        )

        print(
            "HYBRID PREDICTION"
        )

        print(
            "============================================================"
        )

        print(
            "RF Prediction       :",
            rf_prediction,
            "->",
            ATTACK_LABELS.get(
                rf_prediction,
                "Unknown"
            )
        )

        print(
            "RF Confidence       :",
            round(
                rf_confidence,
                6
            )
        )

        print(
            "XGB Prediction      :",
            xgb_prediction,
            "->",
            ATTACK_LABELS.get(
                xgb_prediction,
                "Unknown"
            )
        )

        print(
            "XGB Confidence      :",
            round(
                xgb_confidence,
                6
            )
        )

        print(
            "RF Weight           :",
            RF_WEIGHT
        )

        print(
            "XGB Weight          :",
            XGB_WEIGHT
        )

        print(
            "Final Prediction    :",
            final_prediction
        )

        print(
            "Attack Name         :",
            attack_name
        )

        print(
            "Hybrid Confidence   :",
            round(
                hybrid_confidence,
                6
            )
        )

        print(
            "Severity            :",
            severity
        )

        print(
            "Models Agree        :",
            models_agree
        )

        print(
            "============================================================\n"
        )


        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "prediction":
                final_prediction,

            "attack_name":
                attack_name,

            "confidence":
                round(
                    hybrid_confidence,
                    6
                ),

            "severity":
                severity,

            "model_used":
                "50:50 Hybrid",

            "rf_prediction":
                rf_prediction,

            "rf_attack_name":
                ATTACK_LABELS.get(
                    rf_prediction,
                    "Unknown"
                ),

            "rf_confidence":
                round(
                    rf_confidence,
                    6
                ),

            "xgb_prediction":
                xgb_prediction,

            "xgb_attack_name":
                ATTACK_LABELS.get(
                    xgb_prediction,
                    "Unknown"
                ),

            "xgb_confidence":
                round(
                    xgb_confidence,
                    6
                ),

            "models_agree":
                models_agree,

            "rf_weight":
                RF_WEIGHT,

            "xgb_weight":
                XGB_WEIGHT
        })


    except Exception as e:

        print(
            "\n============================================================"
        )

        print(
            "FLASK PREDICTION ERROR"
        )

        print(
            "============================================================"
        )

        traceback.print_exc()

        print(
            "============================================================\n"
        )


        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# RUN FLASK
# ============================================================

if __name__ == "__main__":

    print("\n============================================================")
    print("CYBER THREAT DETECTION ML API")
    print("============================================================")

    print(
        "Server : http://127.0.0.1:8000"
    )

    print(
        "Classifier : 50:50 RF + XGBoost"
    )

    print(
        f"Classes : {TOTAL_CLASSES}"
    )

    print("============================================================\n")


    app.run(
        host="127.0.0.1",
        port=8000,
        debug=True
    )
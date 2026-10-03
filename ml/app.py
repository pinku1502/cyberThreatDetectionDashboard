from flask import Flask, request, jsonify
import pandas as pd
import os
from hybrid_classifier import hybrid_predict, random_forest_model

app = Flask(__name__)

# ==========================================
# HOME ROUTE
# ==========================================
@app.route("/")
def home():
    return jsonify({
        "message": "Cyber Threat Detection Hybrid API Running"
    })

# ==========================================
# TEST ROUTE (No JSON Required)
# ==========================================
@app.route("/test")
def test():

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    sample_path = os.path.join(
        BASE_DIR,
        "..",
        "dataset",
        "processed",
        "encoded_dataset.csv"
    )

    df = pd.read_csv(sample_path)

    # Remove Label column
    sample = df.drop(columns=["Label"])

    # Keep training features only
    model_features = random_forest_model.feature_names_in_
    sample = sample[model_features].iloc[[0]]

    result = hybrid_predict(sample)

    return jsonify(result)

# ==========================================
# PREDICT ROUTE (Node.js will use this later)
# ==========================================
@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    input_df = pd.DataFrame([data])

    model_features = random_forest_model.feature_names_in_
    input_df = input_df[model_features]

    result = hybrid_predict(input_df)

    return jsonify(result)

# ==========================================
# START SERVER
# ==========================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
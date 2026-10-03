import pandas as pd
import joblib
import os

# ==============================
# 1. Load trained Random Forest
# ==============================

model_path = "saved_model/random_forest_model.pkl"

model = joblib.load(model_path)

print("Random Forest model loaded successfully!")


# ==============================
# 2. Load selected features
# ==============================

data_path = "../dataset/processed/selected_features.csv"

df = pd.read_csv(data_path)

print("Dataset loaded successfully!")
print("Dataset Shape:", df.shape)


# ==============================
# 3. Separate features
# ==============================

target_column = "Label"

if target_column in df.columns:
    X = df.drop(columns=[target_column])
else:
    X = df.copy()


# ==============================
# 4. Check feature count
# ==============================

print("\nNumber of dataset features:", len(X.columns))
print("Number of model features:", len(model.feature_importances_))


if len(X.columns) != len(model.feature_importances_):
    print("\nERROR: Feature count does not match!")
    print("Please check the features used during Random Forest training.")
    exit()


# ==============================
# 5. Feature Importance
# ==============================

importance = model.feature_importances_

feature_importance = pd.DataFrame({
    "Feature": X.columns,
    "Importance": importance
})


# ==============================
# 6. Sort Features
# ==============================

feature_importance = feature_importance.sort_values(
    by="Importance",
    ascending=False
)


# ==============================
# 7. Display Top 10
# ==============================

print("\n======================================")
print("       TOP 10 FEATURE IMPORTANCE")
print("======================================\n")

print(
    feature_importance
    .head(10)
    .to_string(index=False)
)


# ==============================
# 8. Save Top 10 Features
# ==============================

output_path = "saved_model/random_forest_top10_features.csv"

feature_importance.head(10).to_csv(
    output_path,
    index=False
)

print("\n======================================")
print("Top 10 features saved successfully!")
print("Saved at:", output_path)
print("======================================")
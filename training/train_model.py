import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import pickle

# --- CONFIG ---
CSV_FILE = "isl_landmarks_2handed.csv"
MODEL_FILE = "isl_dualhand_model.pkl"

def train_isl_model():
    print(f"Loading Complex ISL Dataset: {CSV_FILE}")
    
    try:
        data = pd.read_csv(CSV_FILE, header=None)
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return

    X = data.iloc[:, 1:].values  # Landmark coordinates (126 features)
    y = data.iloc[:, 0].values   # Sign labels (200+ categories)
    
    # Sign Audit
    unique, counts = np.unique(y, return_counts=True)
    sign_counts = dict(zip(unique, counts))
    print("\n--- SIGN AUDIT ---")
    for sign, count in sign_counts.items():
        if count < 5: print(f"! Low Data: {sign} ({count} images)")
    print("------------------\n")

    # Split into Train/Test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    
    print(f"Training on {len(X_train)} vector samples representing {len(np.unique(y))} signs...")
    
    # Initialize Random Forest with Higher Capacity for 200+ labels
    # Increasing estimators and depth for high-dimensional ISL space
    model = RandomForestClassifier(
        n_estimators=300, 
        max_depth=35, 
        min_samples_split=2,
        random_state=42,
        n_jobs=-1 # Use all CPU cores for speed
    )
    
    # Train
    print("Training Model... (This may take a few minutes for 200+ signs)")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nTraining Complete!")
    print(f"Global Model Accuracy: {accuracy * 100:.2f}%")
    
    # Show detailed report for top signs (optional)
    # print(classification_report(y_test, y_pred))
    
    # Save the model
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"High-Capacity Dual-Hand Model saved: {MODEL_FILE}")

if __name__ == "__main__":
    train_isl_model()

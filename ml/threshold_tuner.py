import json
import pathlib
import numpy as np
from sklearn.metrics import precision_recall_curve, confusion_matrix
from ml.gbm_engine import _synthetic_training_set
from ml.feature_extractor import FEATURE_NAMES
from ml.risk_fusion import risk_fusion
from db.database import get_sync_connection

def calibrate_thresholds(max_fpr=0.05):
    """
    Calibrates the threshold to achieve a False Positive Rate <= max_fpr.
    Generates a synthetic validation set and scores it using the trained ensemble.
    """
    print(f"Calibrating threshold for Max FPR <= {max_fpr*100}%...")
    
    # Ensure model is trained
    conn = get_sync_connection()
    risk_fusion._lazy_import()
    if not risk_fusion._gbm._trained:
        risk_fusion.train(conn)
    conn.close()

    # Generate validation data (same distribution as synthetic training data)
    X_val, y_val, _ = _synthetic_training_set(FEATURE_NAMES)
    
    y_true = np.array(y_val)
    y_scores = np.zeros(len(y_val))
    
    for i, x in enumerate(X_val):
        feat_dict = {name: val for name, val in zip(FEATURE_NAMES, x)}
        y_scores[i] = risk_fusion.score(feat_dict)['composite']
        
    if len(y_true) == 0:
         print("No test data found.")
         return 0.5

    # Compute precision-recall pairs for different probability thresholds
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_scores)
    
    best_threshold = 0.5
    best_fpr = 1.0
    
    # Iterate through thresholds to find the optimal one
    for threshold in thresholds:
        y_pred = (y_scores >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
        
        # Avoid division by zero
        if (fp + tn) == 0:
            continue
            
        fpr = fp / (fp + tn)
        
        if fpr <= max_fpr:
            # We want the lowest threshold that satisfies the FPR constraint (to maximize recall)
            if fpr < best_fpr:
                 best_fpr = fpr
                 best_threshold = threshold
                 break # Since thresholds from precision_recall_curve are usually sorted

                 
    print(f"Optimal Threshold found: {best_threshold:.4f} (FPR: {best_fpr*100:.2f}%)")
    
    # Save the calibrated threshold
    threshold_path = pathlib.Path(__file__).parent / 'models' / 'calibrated_threshold.json'
    threshold_path.parent.mkdir(exist_ok=True)
    with open(threshold_path, 'w') as f:
        json.dump({'threshold': float(best_threshold), 'fpr': float(best_fpr)}, f)
        
    return best_threshold

if __name__ == '__main__':
    # Run calibration
    calibrate_thresholds(max_fpr=0.05)

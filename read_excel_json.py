import pandas as pd
import json

file_path = r"D:\RMS_Siprahub\PRD_Feature\final_featurelist.xlsx"

try:

    df = pd.read_excel(file_path, sheet_name="Phase 1 Features")
    
    # Selecting only relevant columns and dropping empty rows
    df = df[['Feature ID', 'Module', 'Feature Name', 'Description', 'Priority', 'Acceptance Criteria']]
    df = df.dropna(subset=['Feature ID'])
    
    # Convert to list of dicts
    features = df.to_dict(orient='records')
    
    print(json.dumps(features, indent=2))

except Exception as e:
    print(f"Error: {e}")

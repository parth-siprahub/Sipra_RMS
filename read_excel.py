import pandas as pd
import os

file_path = r"D:\RMS_Siprahub\PRD_Feature\final_featurelist.xlsx"

try:
    # Get sheet names
    xls = pd.ExcelFile(file_path)
    print("Sheet Names:", xls.sheet_names)
    
    # Try to read 'Feature List' or the second sheet if it exists
    target_sheet = None
    for sheet in xls.sheet_names:
        if "List" in sheet or "Feature" in sheet:
             target_sheet = sheet
             break
    
    if not target_sheet and len(xls.sheet_names) > 1:
        target_sheet = xls.sheet_names[1] # Default to 2nd sheet if no name match
        
    if target_sheet:
        print(f"\nReading Sheet: {target_sheet}")
        df = pd.read_excel(file_path, sheet_name=target_sheet)
        print("Columns:", df.columns.tolist())
        # Print first 50 rows to get a good chunk of features
        for index, row in df.head(50).iterrows():
            print(f"Row {index}: {row.to_dict()}")
    else:
        print("Could not identify feature list sheet.")

except Exception as e:
    print(f"Error reading excel: {e}")

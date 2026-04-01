import pandas as pd
import os

EXCEL_PATH = r"D:\RMS_Siprahub\Master_excel.xlsx"

def analyze_excel():
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: {EXCEL_PATH} not found.")
        return

    df = pd.read_excel(EXCEL_PATH)
    df = df.fillna("")
    
    # Standardize status
    df["Status_Clean"] = df["Status"].astype(str).str.strip().str.upper()
    
    counts = df["Status_Clean"].value_counts()
    print("Status Counts in Excel:")
    print(counts)
    
    target_statuses = ["ONBOARDED", "EXIT", "WITH CLIENT"]
    total_target = df[df["Status_Clean"].isin(target_statuses)].shape[0]
    print(f"\nTotal rows with status {target_statuses}: {total_target}")
    
    redundant = df[df["Status_Clean"].str.contains("REDUNDANT")].shape[0]
    print(f"Total rows with 'REDUNDANT' in status: {redundant}")

if __name__ == "__main__":
    analyze_excel()

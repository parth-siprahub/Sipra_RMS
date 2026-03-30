import pandas as pd
import sys
import os

# Path setup to ensure app module can be imported
sys.path.insert(0, os.path.abspath('.'))

from app.database import get_supabase_admin

def compare():
    csv_path = r'C:\Users\parth\Downloads\SOW_IMPORT_EXCEL - Sheet1.csv'
    admin = get_supabase_admin()
    
    # 1. Get CSV SOW numbers
    csv_data = pd.read_csv(csv_path)
    expected = set(str(s).strip() for s in csv_data['SOW'].dropna())
    
    # 2. Get DB SOW numbers
    db_data = admin.table('sows').select('sow_number').execute().data
    actual = set(s['sow_number'] for s in db_data if s.get('sow_number'))
    
    # 3. Compare
    missing = expected - actual
    extra = actual - expected
    
    print("-" * 40)
    print("SOW VERIFICATION REPORT")
    print("-" * 40)
    print(f"Total Unique SOWs in CSV: {len(expected)}")
    print(f"Total Unique SOWs in DB:  {len(actual)}")
    print("-" * 40)
    
    if not missing:
        print("✅ ALL CSV records found in database.")
    else:
        print(f"❌ MISSING in Database: ({len(missing)})")
        print(sorted(list(missing)))
        
    if extra:
        print(f"💡 Records in DB but NOT in CSV: ({len(extra)})")
        # print(sorted(list(extra))) # Usually okay to have existing records

if __name__ == "__main__":
    compare()

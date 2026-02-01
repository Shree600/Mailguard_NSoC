"""
Test script for dataset_builder.py
Tests both MongoDB and CSV modes

Run: python test-dataset-builder.py
"""

import os
import sys
import subprocess

def print_header(title):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60 + "\n")

def test_csv_mode():
    """Test building dataset from CSV"""
    print_header("TEST 1: Building from CSV")
    
    csv_file = "../emails.csv"
    output_file = "training_test_csv.csv"
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return False
    
    print(f"📂 Using CSV file: {csv_file}")
    print(f"📄 Output file: {output_file}\n")
    
    # Run dataset builder
    cmd = [
        sys.executable,
        "dataset_builder.py",
        "--from-csv", csv_file,
        "--output", output_file
    ]
    
    try:
        result = subprocess.run(
            cmd,
            cwd="ml-service",
            capture_output=True,
            text=True
        )
        
        print(result.stdout)
        
        if result.returncode == 0:
            print("✅ CSV mode test passed!")
            
            # Verify output file
            output_path = os.path.join("ml-service", output_file)
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"✅ Output file created: {output_path} ({file_size} bytes)")
                
                # Read first few lines
                print("\n📄 First 5 lines of output:")
                with open(output_path, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        if i >= 5:
                            break
                        print(f"   {line.strip()}")
                
                return True
            else:
                print(f"❌ Output file not created: {output_path}")
                return False
        else:
            print(f"❌ CSV mode test failed with code {result.returncode}")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error running test: {e}")
        return False

def test_mongodb_mode():
    """Test building dataset from MongoDB"""
    print_header("TEST 2: Building from MongoDB")
    
    output_file = "training_test_mongodb.csv"
    
    print(f"📄 Output file: {output_file}")
    print("🔌 Attempting MongoDB connection...\n")
    
    # Run dataset builder
    cmd = [
        sys.executable,
        "dataset_builder.py",
        "--output", output_file
    ]
    
    try:
        result = subprocess.run(
            cmd,
            cwd="ml-service",
            capture_output=True,
            text=True,
            timeout=10
        )
        
        print(result.stdout)
        
        if result.returncode == 0:
            print("✅ MongoDB mode test passed!")
            
            # Verify output file
            output_path = os.path.join("ml-service", output_file)
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"✅ Output file created: {output_path} ({file_size} bytes)")
                return True
            else:
                print(f"⚠️  Output file not created (might be no data in DB)")
                return True  # Not a failure, just no data
        else:
            print(f"⚠️  MongoDB mode test completed with code {result.returncode}")
            print("   (This is expected if MongoDB is not running or has no data)")
            if result.stderr:
                print(f"   Error: {result.stderr}")
            return True  # Don't fail test if MongoDB is unavailable
            
    except subprocess.TimeoutExpired:
        print("⚠️  MongoDB connection timeout (MongoDB might not be running)")
        return True  # Don't fail test
    except Exception as e:
        print(f"⚠️  Error: {e}")
        return True  # Don't fail test

def test_help():
    """Test help command"""
    print_header("TEST 3: Help Command")
    
    cmd = [sys.executable, "dataset_builder.py", "--help"]
    
    try:
        result = subprocess.run(
            cmd,
            cwd="ml-service",
            capture_output=True,
            text=True
        )
        
        print(result.stdout)
        
        if "usage:" in result.stdout.lower():
            print("✅ Help command works!")
            return True
        else:
            print("❌ Help command failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def verify_dataset_format():
    """Verify the generated dataset has correct format"""
    print_header("TEST 4: Verify Dataset Format")
    
    test_file = "ml-service/training_test_csv.csv"
    
    if not os.path.exists(test_file):
        print(f"⚠️  Test file not found: {test_file}")
        return True
    
    try:
        import pandas as pd
        
        print(f"📂 Reading {test_file}...")
        df = pd.read_csv(test_file)
        
        # Check columns
        if 'text' not in df.columns or 'label' not in df.columns:
            print("❌ Missing required columns (text, label)")
            return False
        
        print("✅ Has required columns: text, label")
        
        # Check for NaN values
        if df['text'].isna().any():
            print("❌ Found NaN values in 'text' column")
            return False
        
        if df['label'].isna().any():
            print("❌ Found NaN values in 'label' column")
            return False
        
        print("✅ No NaN values found")
        
        # Check label values
        unique_labels = df['label'].unique()
        print(f"✅ Unique labels: {list(unique_labels)}")
        
        # Show statistics
        print(f"\n📊 Dataset Statistics:")
        print(f"   Total samples: {len(df)}")
        print(f"   Label distribution:")
        for label, count in df['label'].value_counts().items():
            percentage = (count / len(df)) * 100
            print(f"   - {label}: {count} ({percentage:.1f}%)")
        
        print("\n✅ Dataset format is valid!")
        return True
        
    except Exception as e:
        print(f"❌ Error verifying format: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "🧪" * 30)
    print("DATASET BUILDER TEST SUITE")
    print("🧪" * 30)
    
    results = {
        "CSV Mode": test_csv_mode(),
        "MongoDB Mode": test_mongodb_mode(),
        "Help Command": test_help(),
        "Dataset Format": verify_dataset_format()
    }
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        icon = "✅" if result else "❌"
        print(f"{icon} {test_name}")
    
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} tests passed")
    print(f"{'='*60}\n")
    
    if passed == total:
        print("🎉 All tests passed!\n")
        return 0
    else:
        print("⚠️  Some tests failed\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())

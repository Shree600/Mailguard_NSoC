#!/usr/bin/env python3
"""
Dataset Builder for Phishing Detection Model
Builds training dataset by merging emails, classifications, and feedback corrections

This script:
1. Fetches emails from MongoDB
2. Fetches classifications from MongoDB
3. Fetches feedback corrections from MongoDB
4. Merges data with priority: feedback > classification > default
5. Outputs training.csv for model retraining

Usage:
    python dataset_builder.py
    python dataset_builder.py --mongodb-uri "mongodb://localhost:27017/mailguard"
    python dataset_builder.py --output training_data.csv
"""

import os
import sys
import argparse
import pandas as pd
from datetime import datetime

# Check if pymongo is available
try:
    from pymongo import MongoClient
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    print("⚠️  Warning: pymongo not installed. Install with: pip install pymongo")


class DatasetBuilder:
    """Builds training dataset from MongoDB collections"""
    
    def __init__(self, mongodb_uri=None, output_file='training.csv'):
        """
        Initialize dataset builder
        
        Args:
            mongodb_uri: MongoDB connection string
            output_file: Output CSV file path
        """
        self.mongodb_uri = mongodb_uri or os.getenv(
            'MONGODB_URI', 
            'mongodb://localhost:27017/mailguard'
        )
        self.output_file = output_file
        self.client = None
        self.db = None
        
    def connect_mongodb(self):
        """Connect to MongoDB"""
        if not MONGODB_AVAILABLE:
            raise ImportError(
                "pymongo is required for MongoDB connection. "
                "Install with: pip install pymongo"
            )
        
        try:
            print(f"Connecting to MongoDB: {self.mongodb_uri}")
            self.client = MongoClient(self.mongodb_uri, serverSelectionTimeoutMS=5000)
            # Test connection
            self.client.admin.command('ping')
            
            # Extract database name from URI or use default
            if 'mailguard' in self.mongodb_uri:
                db_name = 'mailguard'
            else:
                db_name = self.mongodb_uri.split('/')[-1].split('?')[0] or 'mailguard'
            
            self.db = self.client[db_name]
            print(f"✅ Connected to database: {db_name}\n")
            return True
            
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            return False
    
    def fetch_emails(self):
        """
        Fetch all emails from MongoDB
        
        Returns:
            DataFrame with email data
        """
        print("📧 Fetching emails from database...")
        
        try:
            emails_collection = self.db['emails']
            emails = list(emails_collection.find())
            
            if not emails:
                print("⚠️  No emails found in database")
                return pd.DataFrame()
            
            # Convert to DataFrame with relevant fields
            df = pd.DataFrame([{
                'emailId': str(email['_id']),
                'userId': str(email['userId']),
                'subject': email.get('subject', ''),
                'body': email.get('body', ''),
                'sender': email.get('sender', ''),
                'receivedAt': email.get('receivedAt', '')
            } for email in emails])
            
            # Combine subject and body for text feature
            df['text'] = df['subject'].fillna('') + ' ' + df['body'].fillna('')
            df['text'] = df['text'].str.strip()
            
            print(f"✅ Fetched {len(df)} emails\n")
            return df
            
        except Exception as e:
            print(f"❌ Error fetching emails: {e}")
            return pd.DataFrame()
    
    def fetch_classifications(self):
        """
        Fetch all classifications from MongoDB
        
        Returns:
            DataFrame with classification data
        """
        print("🤖 Fetching classifications from database...")
        
        try:
            classifications_collection = self.db['classifications']
            classifications = list(classifications_collection.find())
            
            if not classifications:
                print("⚠️  No classifications found in database")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'emailId': str(cls['emailId']),
                'prediction': cls.get('prediction', ''),
                'confidence': cls.get('confidence', 0)
            } for cls in classifications])
            
            # Map 'safe' to 'legitimate' for consistency
            df['predicted_label'] = df['prediction'].map({
                'phishing': 'phishing',
                'safe': 'legitimate'
            })
            
            print(f"✅ Fetched {len(df)} classifications\n")
            return df
            
        except Exception as e:
            print(f"❌ Error fetching classifications: {e}")
            return pd.DataFrame()
    
    def fetch_feedback(self):
        """
        Fetch all feedback corrections from MongoDB
        
        Returns:
            DataFrame with feedback data
        """
        print("📝 Fetching feedback corrections from database...")
        
        try:
            feedback_collection = self.db['feedbacks']
            feedbacks = list(feedback_collection.find())
            
            if not feedbacks:
                print("⚠️  No feedback found in database")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'emailId': str(fb['emailId']),
                'userId': str(fb['userId']),
                'predictedLabel': fb.get('predictedLabel', ''),
                'correctLabel': fb.get('correctLabel', ''),
                'createdAt': fb.get('createdAt', '')
            } for fb in feedbacks])
            
            print(f"✅ Fetched {len(df)} feedback entries\n")
            return df
            
        except Exception as e:
            print(f"❌ Error fetching feedback: {e}")
            return pd.DataFrame()
    
    def merge_data(self, emails_df, classifications_df, feedback_df):
        """
        Merge emails, classifications, and feedback
        Priority: feedback corrections > predictions
        
        Args:
            emails_df: DataFrame with email data
            classifications_df: DataFrame with classifications
            feedback_df: DataFrame with feedback corrections
            
        Returns:
            DataFrame with merged training data
        """
        print("🔄 Merging data sources...")
        
        if emails_df.empty:
            print("❌ No emails to merge")
            return pd.DataFrame()
        
        # Start with emails
        merged = emails_df.copy()
        
        # Add classifications if available
        if not classifications_df.empty:
            merged = merged.merge(
                classifications_df[['emailId', 'predicted_label', 'confidence']], 
                on='emailId', 
                how='left'
            )
            print(f"   Merged {len(classifications_df)} classifications")
        else:
            merged['predicted_label'] = None
            merged['confidence'] = None
        
        # Add feedback corrections if available
        if not feedback_df.empty:
            merged = merged.merge(
                feedback_df[['emailId', 'correctLabel']], 
                on='emailId', 
                how='left'
            )
            print(f"   Merged {len(feedback_df)} feedback corrections")
        else:
            merged['correctLabel'] = None
        
        # Create final label with priority: feedback > prediction
        # If feedback exists, use correctLabel; otherwise use predicted_label
        merged['label'] = merged['correctLabel'].fillna(merged['predicted_label'])
        
        # Remove rows without labels
        before_count = len(merged)
        merged = merged.dropna(subset=['label'])
        after_count = len(merged)
        
        if before_count > after_count:
            print(f"   Removed {before_count - after_count} emails without labels")
        
        # Count how many labels came from feedback vs predictions
        feedback_count = merged['correctLabel'].notna().sum()
        prediction_count = merged['correctLabel'].isna().sum()
        
        print(f"\n📊 Dataset Statistics:")
        print(f"   Total training samples: {len(merged)}")
        print(f"   From feedback corrections: {feedback_count}")
        print(f"   From ML predictions: {prediction_count}")
        
        # Label distribution
        label_counts = merged['label'].value_counts()
        print(f"\n   Label distribution:")
        for label, count in label_counts.items():
            percentage = (count / len(merged)) * 100
            print(f"   - {label}: {count} ({percentage:.1f}%)")
        
        return merged
    
    def save_training_data(self, df):
        """
        Save training data to CSV file
        
        Args:
            df: DataFrame with training data
        """
        if df.empty:
            print("\n❌ No data to save")
            return False
        
        try:
            print(f"\n💾 Saving training data to {self.output_file}...")
            
            # Select only required columns for training
            training_df = df[['text', 'label']].copy()
            
            # Remove any remaining NaN values
            training_df = training_df.dropna()
            
            # Save to CSV
            training_df.to_csv(self.output_file, index=False, encoding='utf-8')
            
            # Get file size
            file_size = os.path.getsize(self.output_file)
            file_size_mb = file_size / (1024 * 1024)
            
            print(f"✅ Training data saved successfully!")
            print(f"   File: {self.output_file}")
            print(f"   Size: {file_size_mb:.2f} MB")
            print(f"   Samples: {len(training_df)}")
            
            # Show sample data
            print(f"\n📄 Sample data (first 3 rows):")
            print(training_df.head(3).to_string(index=False, max_colwidth=50))
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving training data: {e}")
            return False
    
    def build_from_mongodb(self):
        """
        Build training dataset from MongoDB
        
        Returns:
            bool: True if successful, False otherwise
        """
        print("=" * 60)
        print("DATASET BUILDER - Building Training Data from MongoDB")
        print("=" * 60 + "\n")
        
        # Connect to MongoDB
        if not self.connect_mongodb():
            return False
        
        try:
            # Fetch data from all collections
            emails_df = self.fetch_emails()
            classifications_df = self.fetch_classifications()
            feedback_df = self.fetch_feedback()
            
            # Merge data sources
            merged_df = self.merge_data(emails_df, classifications_df, feedback_df)
            
            # Save training data
            success = self.save_training_data(merged_df)
            
            return success
            
        finally:
            if self.client:
                self.client.close()
                print("\n🔌 Disconnected from MongoDB")
    
    def build_from_csv(self, csv_file='../emails.csv'):
        """
        Build training dataset from existing CSV file
        Useful when MongoDB is not available
        
        Args:
            csv_file: Path to CSV file with emails
            
        Returns:
            bool: True if successful, False otherwise
        """
        print("=" * 60)
        print("DATASET BUILDER - Building Training Data from CSV")
        print("=" * 60 + "\n")
        
        try:
            print(f"📂 Reading CSV file: {csv_file}")
            
            if not os.path.exists(csv_file):
                print(f"❌ File not found: {csv_file}")
                return False
            
            # Read existing CSV
            df = pd.read_csv(csv_file)
            
            # Check required columns
            if 'email_text' not in df.columns or 'label' not in df.columns:
                print("❌ CSV must have 'email_text' and 'label' columns")
                return False
            
            # Rename columns to match expected format
            df = df.rename(columns={'email_text': 'text'})
            
            print(f"✅ Loaded {len(df)} samples\n")
            
            # Save as training data
            success = self.save_training_data(df[['text', 'label']])
            
            return success
            
        except Exception as e:
            print(f"❌ Error building from CSV: {e}")
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Build training dataset for phishing detection model'
    )
    parser.add_argument(
        '--mongodb-uri',
        type=str,
        help='MongoDB connection URI (default: mongodb://localhost:27017/mailguard)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='training.csv',
        help='Output CSV file path (default: training.csv)'
    )
    parser.add_argument(
        '--from-csv',
        type=str,
        help='Build from existing CSV file instead of MongoDB'
    )
    
    args = parser.parse_args()
    
    # Create dataset builder
    builder = DatasetBuilder(
        mongodb_uri=args.mongodb_uri,
        output_file=args.output
    )
    
    # Build dataset
    if args.from_csv:
        success = builder.build_from_csv(args.from_csv)
    else:
        success = builder.build_from_mongodb()
    
    # Exit with appropriate code
    if success:
        print("\n" + "=" * 60)
        print("✅ DATASET BUILDING COMPLETED SUCCESSFULLY!")
        print("=" * 60 + "\n")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ DATASET BUILDING FAILED")
        print("=" * 60 + "\n")
        sys.exit(1)


if __name__ == '__main__':
    main()

# Dataset Builder for Phishing Detection

## Overview

The dataset builder creates training datasets for the phishing detection model by merging:
- Email data from MongoDB
- ML classification predictions  
- User feedback corrections (highest priority)

## Features

✅ **MongoDB Integration** - Fetches data directly from database  
✅ **CSV Fallback** - Works with existing CSV files  
✅ **Feedback Priority** - User corrections override ML predictions  
✅ **Statistics** - Shows dataset distribution and sources  
✅ **Clean Output** - Generates training-ready CSV files  

## Installation

Install required dependencies:

```bash
pip install pymongo pandas
```

Or install all ML service dependencies:

```bash
cd ml-service
pip install -r requirements.txt
```

## Usage

### Method 1: Build from MongoDB (Recommended)

```bash
cd ml-service
python dataset_builder.py
```

This will:
1. Connect to MongoDB (mongodb://localhost:27017/mailguard)
2. Fetch emails, classifications, and feedback
3. Merge data with feedback priority
4. Save to `training.csv`

### Method 2: Build from Existing CSV

```bash
cd ml-service
python dataset_builder.py --from-csv ../emails.csv --output training.csv
```

### Custom Options

```bash
# Custom MongoDB URI
python dataset_builder.py --mongodb-uri "mongodb://user:pass@host:port/db"

# Custom output file
python dataset_builder.py --output my_training_data.csv

# Build from CSV with custom output
python dataset_builder.py --from-csv data.csv --output train.csv
```

## Output Format

The generated CSV has two columns:

```csv
text,label
"Email subject and body text...",phishing
"Another email content...",legitimate
```

## Data Priority

When merging data sources, the builder uses this priority:

1. **User Feedback** (highest) - Corrections from users
2. **ML Predictions** - Original model predictions
3. **Skip** - Emails without any label

## Example Output

```
============================================================
DATASET BUILDER - Building Training Data from MongoDB
============================================================

Connecting to MongoDB: mongodb://localhost:27017/mailguard
Connected to database: mailguard

Fetching emails from database...
Fetched 150 emails

Fetching classifications from database...
Fetched 150 classifications

Fetching feedback corrections from database...
Fetched 25 feedback entries

Merging data sources...
   Merged 150 classifications
   Merged 25 feedback corrections

Dataset Statistics:
   Total training samples: 150
   From feedback corrections: 25
   From ML predictions: 125

   Label distribution:
   - legitimate: 90 (60.0%)
   - phishing: 60 (40.0%)

Saving training data to training.csv...
Training data saved successfully!
   File: training.csv
   Size: 1.25 MB
   Samples: 150

Sample data (first 3 rows):
                                              text       label
Congratulations! You won $1,000,000...        phishing
Your bank account needs verification...       phishing  
Meeting reminder for tomorrow at 10am...      legitimate

============================================================
DATASET BUILDING COMPLETED SUCCESSFULLY!
============================================================
```

## Testing

Run the test suite:

```bash
python test-dataset-builder.py
```

Tests verify:
- CSV mode functionality
- MongoDB mode functionality  
- Help command
- Output format validation

## Integration with Retraining

This dataset builder is designed to work with the model retraining pipeline:

```bash
# Step 1: Build dataset
python dataset_builder.py

# Step 2: Retrain model (Step 4)
python retrain.py

# Step 3: Reload model in API (Step 5)
# Automatic or manual reload
```

## Troubleshooting

### "pymongo not installed"
```bash
pip install pymongo
```

### "Failed to connect to MongoDB"
- Ensure MongoDB is running
- Check connection URI
- Verify database name

### "No emails found in database"
- Fetch emails first: `POST /api/gmail/fetch`
- Classify emails: `POST /api/emails/classify`
- Add feedback: `POST /api/feedback`

### "CSV must have 'email_text' and 'label' columns"
- Ensure CSV has correct column names
- Expected format: `email_text,label`

## Files

- `dataset_builder.py` - Main script
- `training.csv` - Generated training data (gitignored)
- `../test-dataset-builder.py` - Test suite

## Next Steps

After generating the dataset:
1. Use it with `retrain.py` (Step 4) to retrain the model
2. Deploy the new model to production
3. Collect more feedback
4. Repeat the cycle for continuous improvement

---

**Part of Phase 4: Reinforcement Learning with Feedback-based Training**

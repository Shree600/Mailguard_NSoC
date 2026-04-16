const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const User = require('./models/User');
    const Email = require('./models/Email');
    const Classification = require('./models/Classification');
    
    const user = await User.findOne();
    if (!user) {
      console.log('No users found');
      process.exit(1);
    }
    
    console.log('User ID:', user._id);
    
    try {
      const emails = await Email.find({ userId: user._id }).limit(2);
      const classifications = await Classification.find({ userId: user._id }).limit(2);
      
      console.log('Emails:', emails.length);
      console.log('Classifications:', classifications.length);
      
      if (emails.length > 0) {
        const email = emails[0];
        const classification = classifications.find(c => c.emailId.toString() === email._id.toString());
        
        console.log('Email ID:', email._id);
        console.log('Classification ID:', classification ? classification._id : 'Not found');
        
        if (classification) {
          console.log('Prediction:', classification.prediction);
          console.log('Confidence:', classification.confidence);
        }
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });
}

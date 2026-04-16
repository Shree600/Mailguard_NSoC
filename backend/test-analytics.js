const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Testing basic data retrieval...');
    
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
      const emails = await Email.find({ userId: user._id }).limit(3);
      const classifications = await Classification.find({ userId: user._id }).limit(3);
      
      console.log('Emails found:', emails.length);
      console.log('Classifications found:', classifications.length);
      
      if (emails.length > 0 && classifications.length > 0) {
        const email0 = emails[0];
        const classification0 = classifications.find(c => c.emailId.toString() === email0._id.toString());
        
        console.log('Email 0:', email0._id);
        console.log('Classification 0:', classification0);
        
        if (classification0) {
          console.log('Match found - prediction:', classification0.prediction);
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

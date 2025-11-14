const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Pastikan URI mongo ada di .env dengan nama MONGO_URI
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`MongoDB Connected: ${conn.connection.host} 🍃`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Stop aplikasi jika database gagal connect
  }
};

module.exports = connectDB;
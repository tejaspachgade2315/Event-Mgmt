const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.MONGO_URI;
console.log(url);
const connect = () => {
  try {
    mongoose.connect(url);
    const connection = mongoose.connection;
    connection.on('connected', () => {
      console.log('Database connected');
    })
    connection.on('error', (err) => {
      console.log('Error in database connection', err);
    })
  } catch (error) {
    console.log(error);
  }
}

module.exports = connect;
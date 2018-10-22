const mongoose = require('mongoose');

let schema = new mongoose.Schema({
    busId: Number,
    busVariant: Number,
    latitude: Number,
    longitude: Number,
    timestamp: Number
});

module.exports = mongoose.model('BusGeolocation', schema);
const moment = require('moment');
const mongoose = require('mongoose');
const Distance = require('./distance');

const BusGeolocation = require('./dao/busGeolocation');

class Bus {
  constructor(busStop) {
    this.busStop = busStop;
  }

  getBusesGeolocations(busVariant) {
    return new Promise((resolve, reject) => {
      BusGeolocation.find()
        .where('busVariant')
        .equals(busVariant)
        .sort({ timestamp: -1 })
        .exec((err, buses) => {
          if (err) throw err;

          for (var i in buses) {
            var bus = buses[i];
            let latitude = bus['latitude'];
            let longitude = bus['longitude'];
            let point = { latitude: latitude, longitude: longitude };

            var distance = Distance.getDistance(this.busStop, point, 2);
            if (distance < 2) {
              resolve(bus);
            }
          }
        });
    });
  }

  getClosest(points, busStop) {
    var distance = -1;
    var result;
    Array.prototype.forEach.call(points, p => {
      let end = { latitude: p['lat'], longitude: p['lon'] };
      let distanceAux = Distance.getDistance(busStop, end);
      if (distance === -1 || distance > distanceAux) {
        result = p;
        distance = distanceAux;
      }
    });
    return result;
  }
}

module.exports = Bus;

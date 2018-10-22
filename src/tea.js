const mongoose = require('mongoose');
const orion = require('./services/orion');

const BusGeolocation = require('./dao/busGeolocation');

const PUBLIC_URL = 'https://592f2662.ngrok.io';

class Tea {

    constructor() {
        this.busLocationChangesSubscription = undefined;
        this.mongodb = mongoose.connect('mongodb://localhost/tea');
    }

    getNextBusForBusStop() {
        
    }
    
    getLastBusForBusStop(busStopId) {
    }

    getTimeBetweenTwoPointsForBus(bus, fromPoint, toPoint) {

    }

    handleOrionAccumulate(body) {
        if (body.subscriptionId == this.busLocationChangesSubscription.id) {
            body.data.forEach(item => {
                let busGeolocation = new BusGeolocation({
                    busId: item.id,
                    busVariant: item.linea.value,
                    latitude: item.location.value[0],
                    longitude: item.location.value[1],
                    timestamp: moment(item.timestamp.value).unix()
                });

                busGeolocation.save();
            });
        }
    }

    run() {
        orion
            .subscribeToBusLocationChanges('62', `${PUBLIC_URL}/orion/accumulate`)
            .then(body => {
                this.busLocationChangesSubscription = body.subscription
            })
            .catch(err => console.log(err));
    }

}

module.exports = new Tea();
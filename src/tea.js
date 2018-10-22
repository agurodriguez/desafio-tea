const moment = require('moment');
const mongoose = require('mongoose');
const orion = require('./services/orion');

const BusGeolocation = require('./dao/busGeolocation');

const PUBLIC_URL = 'https://592f2662.ngrok.io';

class Tea {

    constructor() {
        this.busLocationChangesSubscription = undefined;
        
        mongoose.connect('mongodb://localhost/tea', { useNewUrlParser: true });
    }

    getNextBusForBusStop(busVariant, busStopId) {
        return new Promise((resolve, reject) => {        
            orion
                .getBuses()
                .then(buses => {
                    // TODO: probar
                    buses.filter(b.linea == busVariant);
                    resolve(buses);
                })
                .catch(reject);
        })
    }
    
    getLastBusForBusStop(busStopId) {
    }

    getTimeBetweenTwoPointsForBus(bus, fromPointLatitude, fromPointLong, toPointLatitude, toPointLong) {
        //obtengo el ultimo dato de origen
        var lastStopAtOrigin = BusGeolocation.find({busId: bus, latitude: fromPointLatitude, longitude: fromPointLong}).sort({"timestamp": -1}).limit(1);

        //obtengo el ultimo dato de destino
        var lastStopAtDestination = BusGeolocation.find({busId: bus, latitude: toPointLatitude, longitude: toPointLong}).sort({"timestamp": -1}).limit(1);

        //obtener date

        var timeStampOrigin = lastStopAtOrigin[0].timestamp;
        var timeStampDestination = lastStopAtDestination[0].timestamp;

        //calculo la diferencia
        var date1, date2;  
        date1 = new Date(timeStampOrigin);
        date2 = new Date(timeStampDestination);

        var res = Math.abs(date1 - date2) / 1000;
        var days = Math.floor(res / 86400);   
        var hours = Math.floor(res / 3600) % 24;        
        var minutes = Math.floor(res / 60) % 60;
        var seconds = res % 60;

        //devuelvo el resultado en segundos
        return (days*24*60*60 + hours*60*60 + minutes*60 + seconds);

        //});

    }

    handleOrionAccumulate(body) {
        if (body.subscriptionId == this.busLocationChangesSubscription.id) {
            body.data.forEach(item => {
                let busGeolocation = new BusGeolocation({
                    busId: item.id,
                    busVariant: item.linea.value,
                    latitude: item.location.value.coordinates[0],
                    longitude: item.location.value.coordinates[1],
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
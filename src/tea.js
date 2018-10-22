const moment = require('moment');
const mongoose = require('mongoose');
const orion = require('./services/orion');

const BusGeolocation = require('./dao/busGeolocation');

const PUBLIC_URL = 'https://4896001a.ngrok.io';

class Tea {

    constructor() {
        this.busLocationChangesSubscription = undefined;
        this.mongodb = mongoose.connect('mongodb://localhost/tea', { useNewUrlParser: true });
    }

    getNextBusForBusStop(busVariant, busStopId) {
        return new Promise((resolve, reject) => {  
            // TODO: 
            /*
            * Una posible implementación creo que podría ser: tomar la colección de 
            * paradas de `busVariant`, pararse en la parada con cuyo `id` sea igual a 
            * `busStopId` y ver qué ordinal tiene. Luego iterar hacia atrás en la colección
            * y usar el método `getBusesOfVariantNearTo` para obtener los buses con el mismo 
            * `busVariant` que estén cerca de alguna de las paradas anteriores.
            * Todos esos son los buses que están viniendo a la parada desde la que estoy
            * pidiendo el ETA. (Si hay más de uno debo decidir con cuál quedarme)
            */
            let busVariantStops = [
                { location: [-34.879585, -56.14836] }
            ];

            let getBusesOfVariantNearToPromises = busVariantStops.map(busVariantStop => 
                orion.getBusesOfVariantNearTo(busVariant, busVariantStop.location)
            );

            Promise
                .all(getBusesOfVariantNearToPromises, (values) => {
                    let buses = [].concat(...values);
                    if (buses.length > 1) {
                        // TODO: decidir con cuál quedarse
                    }
                    resolve(buses);
                })
                .catch(reject);
        });
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
const csv = require('csv-parse');
const fs = require('fs');
const moment = require('moment');
const mongoose = require('mongoose');
const montevideo = require('./services/montevideo');
const orion = require('./services/orion');

const BusGeolocation = require('./dao/busGeolocation');

class Tea {

    constructor() {
        this.busLocationChangesSubscription = undefined;
        this.mongodb = mongoose.connect('mongodb://localhost/tea', { useNewUrlParser: true });
    }

    /**
     * Retorna el calendario (las pasadas) para la variante de línea `busVariant`
     * @param {number} busVariant 
     */
    getBusSchedules(busVariant) {
        return new Promise((resolve, reject) => {
            let parser = csv({ columns: true, delimiter: ';' }, (err, data) => {
                if (err) reject(err);
                else {
                    resolve(data.filter(i => parseInt(i.cod_variante, 10) === busVariant));
                }
            });
            
            fs.createReadStream(`${__dirname}/../data/uptu_pasada_circular.csv`).pipe(parser);
        });
    }

    /**
     * Retorna todas las paradas para la variante de línea `busVariant`
     * @param {number} busVariant 
     */
    getBusVariantStops(busVariant) {
        return new Promise((resolve, reject) => {
            montevideo.getStopsByBusVariant(busVariant)
                .then((stops) => {
                    resolve(stops.filter(stop => stop.linea == busVariant))
                })
                .catch(reject);
        });
    }

    /**
     * Retorna el siguiente ómnibus con variante de línea igual a `busVariant` 
     * en pasar por la parada identificada por `busStopId`
     * @param {number} busVariant 
     * @param {number} busStopId 
     */
    getNextBusForBusStop(busVariant, busStopId) {
        return new Promise((resolve, reject) => {
            this.getBusVariantStops(busVariant).then(busVariantStops => {
                /*
                 * Una posible implementación creo que podría ser: tomar la colección de 
                 * paradas de `busVariant`, pararse en la parada con cuyo `id` sea igual a 
                 * `busStopId` y ver qué ordinal tiene. Luego iterar hacia atrás en la colección
                 * y usar el método `getBusesOfVariantNearTo` para obtener los buses con el mismo 
                 * `busVariant` que estén cerca de alguna de las paradas anteriores.
                 * Todos esos son los buses que están viniendo a la parada desde la que estoy
                 * pidiendo el ETA. (Si hay más de uno debo decidir con cuál quedarme)
                 */
                let busVariantStop = busVariantStops.filter((busStop) => busStopId == busStop.codigoParada);

                console.log(busVariantStop);
                busVariantStops = busVariantStops.filter((busStop) => busStop.ordinal <= busVariantStop[0].ordinal);

                let getBusesOfVariantNearToPromises = busVariantStops.map(busVariantStop => 
                    orion.getBusesOfVariantNearTo(busVariant, [busVariantStop.lat, busVariantStop.long]).then(res => {
                         if (res.length > 0) {
                             res[0].busStopOrdinal = busVariantStop.ordinal; 
                        }
                        
                        return res;
                    })
                );
                
                Promise
                    .all(getBusesOfVariantNearToPromises)
                    .then(values => {
                        let buses = [].concat(...values);
                        if (buses.length > 0) {
                            buses = buses[buses.length - 1];
                        } else {
                            buses = undefined;
                        }

                        resolve(buses);
                    })
                    .catch(reject);
            });
        });
    }
    
    /**
     * Retorna el último ómnibus con variante de línea igual a `busVariant` 
     * que pasó por la parada identificada por `busStopId`
     * @param {number} busVariant 
     * @param {number} busStopId 
     */
    getLastBusForBusStop(busVariant, busStopId) {
    }

    /**
     * Retorna el tiempo que demoró el ómnibus identificado por `busId` en
     * ir del punto `from` al punto `to`
     * @param {number} busId 
     * @param {Point} from 
     * @param {Point} to
     */
    getTimeBetweenTwoPointsForBus(busId, from, to) {
        //obtengo el ultimo dato de origen
        var lastStopAtOrigin = BusGeolocation.find({busId: bus, latitude: from[0], longitude: from[1]}).sort({"timestamp": -1}).limit(1);

        //obtengo el ultimo dato de destino
        var lastStopAtDestination = BusGeolocation.find({busId: bus, latitude: to[0], longitude: to[1]}).sort({"timestamp": -1}).limit(1);

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

    /**
     * Maneja la invocación de Orion cuando se dispara alguno de los eventos 
     * a los que koba-tea se suscribió
     * @param {object} body
     */
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

    /**
     * Inicia los procesos de koba-tea
     */
    run() {
        orion
            .subscribeToBusLocationChanges(`${process.env.PUBLIC_URL}/orion/accumulate`)
            .then(body => {
                this.busLocationChangesSubscription = body.subscription
            })
            .catch(err => console.log(err));
    }

}

module.exports = new Tea();
const csv = require('csv-parse');
const events = require('events');
const fs = require('fs');
const geolib = require('geolib');
const moment = require('moment');
const mongoose = require('mongoose');

const montevideo = require('./services/montevideo');
const orion = require('./services/orion');

const BusGeolocation = require('./dao/busGeolocation');

class Tea {

    constructor() {
        this.busLocationChangesSubscription = undefined;
        this.events = new events.EventEmitter();
        this.mongodb = mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
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
            montevideo
                .getStopsByBusVariant(busVariant)
                .catch(reject)
                .then(stops => {
                    resolve(stops.filter(stop => stop.linea == busVariant));
                });
        });
    }

    /**
     * Retorna la parada para la variante de línea `busVariant` con id 
     * `busStopId`
     * @param {number} busVariant
     * @param {number} busStopId
     */
    getBusVariantStop(busVariant, busStopId) {
        return this.getBusVariantStops(busVariant).then(stops => stops.filter(stop => stop.codigoParada == busStopId)[0]);
    }

    /**
     * Retorna el siguiente ómnibus con variante de línea igual a `busVariant`
     * en pasar por la parada identificada por `busStopId`
     * @param {number} busVariant
     * @param {number} busStopId
     */
    getNextBusForBusStop(busVariant, busStopId) {
        return new Promise((resolve, reject) => {
            this.getBusVariantStops(busVariant)
                .catch(reject)
                .then(busVariantStops => {
                    let busVariantStop = busVariantStops.filter(
                        busStop => busStopId == busStop.codigoParada
                    );
                    
                    busVariantStops = busVariantStops.filter(
                        busStop => busStop.ordinal < busVariantStop[0].ordinal
                    );
                    
                    let getBusesOfVariantNearToPromises = busVariantStops.map(busVariantStop =>
                        orion
                            .getBusesOfVariantNearTo(busVariant, [busVariantStop.lat, busVariantStop.long])
                            .catch(reject)
                            .then(res => {
                                if (res.length > 0) {
                                    res[0].busStopOrdinal = busVariantStop.ordinal;
                                }

                                return res;
                            })
                    );

                    Promise
                        .all(getBusesOfVariantNearToPromises)
                        .catch(reject)
                        .then(values => {
                            let buses = [].concat(...values);
                            if (buses.length > 0) {
                                buses = buses[buses.length - 1];
                            } else {
                                buses = undefined;
                            }

                            resolve(buses);
                        });
            });
        });
    }

    /**
     * Retorna el tiempo estimado de arribo del ómnibus con variante de línea 
     * igual a `busVariant` en pasar por la parada identificada por `busStopId`
     * @param {number} busVariant
     * @param {number} busStopId
     */
    getNextBusForBusStopEta(busVariant, busStopId) {
        return new Promise((resolve, reject) => {
            let promises = [
                this.getBusVariantStop(busVariant, busStopId),
                this.getNextBusForBusStop(busVariant, busStopId),
                this.getLastBusForBusStop(busVariant, busStopId)
            ];

            Promise
                .all(promises)
                .catch(reject)
                .then(values => {
                    let busStop = values[0];
                    let nextBus = values[1];
                    let lastBus = values[2];
                    
                    console.log('nextBus', nextBus)
                    console.log('lastBus', lastBus);

                    let busStopLocation = [parseFloat(busStop.lat), parseFloat(busStop.long)];
                    let nextBusLocation = [nextBus.location.value.coordinates[1], nextBus.location.value.coordinates[0]];
                    let lastBusLocation = [lastBus.location.value.coordinates[1], lastBus.location.value.coordinates[0]];
                    
                    this.getTimeBetweenTwoPointsForBus(lastBus.id, nextBusLocation, busStopLocation).then(t => {
                        resolve(t);
                    });
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
        return new Promise((resolve, reject) => {
            this.getBusVariantStops(busVariant).then(stops => {
                let busVariantStop = stops.filter(stop => busStopId == stop.codigoParada);
                
                stops = stops.filter(
                    busStop => busStop.ordinal > busVariantStop[0].ordinal
                );
                
                let getBusesOfVariantNearToPromises = stops.map(busVariantStop =>
                    orion
                        .getBusesOfVariantNearTo(busVariant, [busVariantStop.lat, busVariantStop.long])
                        .catch(reject)
                        .then(res => {
                            if (res.length > 0) {
                                res[0].busStopOrdinal = busVariantStop.ordinal;
                            }

                            return res;
                        })
                );

                Promise
                    .all(getBusesOfVariantNearToPromises)
                    .catch(reject)
                    .then(values => {
                        let buses = [].concat(...values);
                        if (buses.length > 0) {
                            buses = buses[0];
                        } else {
                            buses = undefined;
                        }

                        resolve(buses);
                    });
            });
        });
    }

    /**
     * Retorna el último ómnibus con variante de línea igual a `busVariant`
     * que pasó por la parada identificada por `busStopId`
     * NOTA: Deprecada en favor de getLastBusForBusStop
     * @param {number} busVariant
     * @param {number} busStopId
     */
    getLastBusForBusStop2(busVariant, busStopId) {
        return new Promise((resolve, reject) => {
            this.getBusVariantStop(busVariant, busStopId)
                .catch(reject)
                .then(busStop => {
                    const bus = require('./bus.js');
                    
                    (new bus({ latitude: parseFloat(busStop.lat), longitude: parseFloat(busStop.long) }))
                        .getBusesGeolocations(busVariant)
                        .catch(reject)
                        .then(resolve)
                });
        });
    }

    /**
     * Retorna el camino seguido por el ómnibus identificado por `busId`
     * @param {number} busId 
     */
    getPathForBus(busId) {
        return BusGeolocation.find({ busId: busId }).sort({ timestamp: -1 });
    }

    /**
     * Retorna el tiempo que demoró el ómnibus identificado por `busId` en
     * ir del punto `from` al punto `to`
     * @param {number} busId
     * @param {Point} from
     * @param {Point} to
     */
    getTimeBetweenTwoPointsForBus(busId, from, to) {
        return new Promise((resolve, reject) => {
            BusGeolocation
                .find({ busId: busId })
                .sort({ timestamp: -1 })
                .catch(reject)
                .then(geolocations => {
                    var distance = 100;
                    var timeStampOrigin = undefined;
                    var timeStampDestination = undefined;
                    console.log("busId:", busId, " locaciones: ",geolocations)

                    geolocations.forEach(geolocation => {
                        distance = geolib.getDistance(
                            { latitude: from[0], longitude: from[1] },
                            { latitude: geolocation.latitude, longitude: geolocation.longitude }
                        );

                        if (distance < 300 && timeStampOrigin == undefined) {
                            timeStampOrigin = geolocation.timestamp;
                        }

                        distance = geolib.getDistance(
                            { latitude: to[0], longitude: to[1] },
                            { latitude: geolocation.latitude, longitude: geolocation.longitude }
                        );

                        console.log("distancia: " + distance)

                        if (distance < 300 && timeStampDestination == undefined) {
                            timeStampDestination = geolocation.timestamp;
                        }
                    });

                    //calculo la diferencia
                    var date1 = new Date(timeStampOrigin);
                    var date2 = new Date(timeStampDestination);

                    var res = Math.abs(date1 - date2) / 1000;
                    var days = Math.floor(res / 86400);
                    var hours = Math.floor(res / 3600) % 24;
                    var minutes = Math.floor(res / 60) % 60;
                    var seconds = res % 60;

                    //devuelvo el resultado en segundos
                    resolve(days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds);
                })
        });
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
                    latitude: item.location.value.coordinates[1],
                    longitude: item.location.value.coordinates[0],
                    timestamp: moment(item.timestamp.value).unix()
                });

                busGeolocation.save();

                // console.log(`${busGeolocation} saved to local db`);
            });
        }
    }

    /**
     * Inicia los procesos de koba-tea
     */
    run() {
        // orion
        //     .subscribeToBusLocationChanges(`${process.env.PUBLIC_URL}/orion/accumulate`)
        //     .then(body => this.busLocationChangesSubscription = body.subscription)
        //     .catch(err => console.log(err));

        this.startBusesLocationsPuller();
    }

    /**
     * Inicia un proceso de pulling de las locaciones de todos los ómnibus
     * cada 30 segundos
     */
    startBusesLocationsPuller() {
        let fetchBusesLocations = () => {
            orion
                .getBuses()
                .then(locations => {
                    locations.forEach(item => {
                        let data = {
                            busId: item.id,
                            busVariant: item.linea.value,
                            latitude: item.location.value.coordinates[1],
                            longitude: item.location.value.coordinates[0],
                            timestamp: moment(item.timestamp.value).unix()
                        };
                        // Ver https://stackoverflow.com/a/33401897
                        BusGeolocation.findOneAndUpdate(data, data, { upsert: true }, (err) => {
                            if (err) console.log(err);
                        });
                    });
                    
                    setTimeout(() => {
                        fetchBusesLocations();
                    }, 30 * 1000);

                    this.events.emit('busesLocations', locations);
                });
        }

        fetchBusesLocations();
    }
}

module.exports = new Tea();

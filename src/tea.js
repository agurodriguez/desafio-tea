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
     * Retorna el último ómnibus con variante de línea igual a `busVariant`
     * que pasó por la parada identificada por `busStopId`
     * @param {number} busVariant
     * @param {number} busStopId
     */
    getLastBusForBusStop(busVariant, busStopId) {
        return new Promise((resolve, reject) => {
            this.getBusVariantStops(busVariant)
                .catch(reject)    
                .then(stops => {
                    let busVariantStop = stops.filter(
                        stop => busStopId == stop.codigoParada
                    );
                    
                    stops = stops.filter(
                        busStop => parseInt(busStop.ordinal) >= busVariantStop[0].ordinal
                    );

                    let marginDistance = 70;

                    let getBusesOfVariantNearToPromises = stops.map(busVariantStop => {
                        marginDistance = Math.min(300, marginDistance + 50);
                        return orion
                            .getBusesOfVariantNearTo(busVariant, [busVariantStop.lat, busVariantStop.long], marginDistance)
                            .catch(reject)
                            .then(res => {
                                if (res.length > 0) {
                                    res[0].busStopOrdinal = busVariantStop.ordinal;
                                }

                                return res;
                            })
                        }
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
                        busStop => parseInt(busStop.ordinal) < busVariantStop[0].ordinal
                    );
                    
                    let maxDistance = 50;

                    let getBusesOfVariantNearToPromises = busVariantStops.map(busVariantStop => {
                        maxDistance = Math.min(300, maxDistance + 50);
                        return orion
                            .getBusesOfVariantNearTo(busVariant, [busVariantStop.lat, busVariantStop.long], maxDistance)
                            .catch(reject)
                            .then(res => {
                                if (res.length > 0) {
                                    res[0].busStopOrdinal = busVariantStop.ordinal;
                                }

                                return res;
                            });
                        }
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
                    if (!lastBus || !nextBus) {
                        resolve([]);
                    } else {
                        let busStopLocation = [parseFloat(busStop.lat), parseFloat(busStop.long)];
                        let nextBusLocation = [nextBus.location.value.coordinates[1], nextBus.location.value.coordinates[0]];
                        let lastBusLocation = [lastBus.location.value.coordinates[1], lastBus.location.value.coordinates[0]];
                        
                        this.getTimeBetweenTwoPointsForBus(lastBus.id, nextBusLocation, busStopLocation).then(t => {
                            resolve({ time: t, lastBus: lastBus, nextBus: nextBus });
                        });
                    }
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
     * ir de la parada `busStopId1` a la parada `busStopId2`
     * @param {number} busId
     * @param {Point} from
     * @param {Point} to
     */
    getTimeBetweenTwoBusStopsForBus(busVariant, busId, busStopId1, busStopId2) {
        let busStopPoint1 = undefined;
        let busStopPoint2 = undefined;

        return this.getBusVariantStops(busVariant)
            .then(stops => {
                stops.forEach(stop => {
                    if (stop.codigoParada == busStopId1) {
                        busStopPoint1 = [parseFloat(stop.lat), parseFloat(stop.long)]
                    }
                    if (stop.codigoParada == busStopId2) {
                        busStopPoint2 = [parseFloat(stop.lat), parseFloat(stop.long)]
                    }
                });

                if (!busStopPoint1) {
                    throw new Error('busStopId1 no corresponde a un id de parada válido');
                }

                if (!busStopPoint2) {
                    throw new Error('busStopId2 no corresponde a un id de parada válido');
                }
                
                return this.getTimeBetweenTwoPointsForBus(busId, busStopPoint1, busStopPoint2);
            });
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

                        if (distance < 300 && timeStampDestination == undefined) {
                            timeStampDestination = geolocation.timestamp;
                        }
                    });

                    var segs = Math.abs((timeStampDestination - timeStampOrigin)) / 1000;

                    resolve(segs);
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
                if (item.location.value.coordinates[0] != 0 && 
                    item.location.value.coordinates[1] != 0) {
                        BusGeolocation
                            .find({
                                busId: item.id,
                                busVariant: item.linea.value,
                                latitude: item.location.value.coordinates[1],
                                longitude: item.location.value.coordinates[0]
                            })
                            .then(res => {
                                if (res.length == 0) {
                                    new BusGeolocation({
                                        busId: item.id,
                                        busVariant: item.linea.value,
                                        latitude: item.location.value.coordinates[1],
                                        longitude: item.location.value.coordinates[0],
                                        timestamp: moment(item.timestamp.value).unix()
                                    }).save();
                                }
                            });
                }
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
                        if (item.location.value.coordinates[0] != 0 && 
                            item.location.value.coordinates[1] != 0) {
                                BusGeolocation
                                    .find({
                                        busId: item.id,
                                        busVariant: item.linea.value,
                                        latitude: item.location.value.coordinates[1],
                                        longitude: item.location.value.coordinates[0]
                                    })
                                    .then(res => {
                                        if (res.length == 0) {
                                            new BusGeolocation({
                                                busId: item.id,
                                                busVariant: item.linea.value,
                                                latitude: item.location.value.coordinates[1],
                                                longitude: item.location.value.coordinates[0],
                                                timestamp: moment(item.timestamp.value).unix()
                                            }).save();
                                        }
                                    });
                        }
                    });
                    
                    setTimeout(() => {
                        fetchBusesLocations();
                    }, 10 * 1000);

                    this.events.emit('busesLocations', locations);
                });
        }

        fetchBusesLocations();
    }
}

module.exports = new Tea();

const moment = require('moment');
const ngsi = require('ngsijs');
const request = require('request-promise');

class Orion {

    constructor() {
        this.client = new ngsi.Connection(process.env.ORION_URL);
    }

    getBuses() {
        return this.client.v2.listEntities({ type: 'Bus', limit: 1000 }).then(res => res.results);
    }

    getBusesOfVariantNearTo(busVariant, point) {
        // usamos una request plana porque ngsijs parece no soportar el atributo georel 
        // (Ver http://conwetlab.github.io/ngsijs/stable/NGSI.Connection.html#.%22v2.listEntities%22__anchor)
        return request.get(
            `${process.env.ORION_URL}/v2/entities`, 
            { 
                qs: { 
                    type: 'Bus', 
                    q: `linea:'${busVariant}'`,
                    georel: 'near;maxDistance:500',
                    geometry: 'point',
                    coords: `${point[0]},${point[1]}`,
                    orderBy: 'geo:distance',
                },
                json: true
            }
        );
    }

    subscribeToBusLocationChanges(callbackUrl) {
        return this.client.v2.createSubscription({
            description: `A subscription to get buses location updates`,
            subject: {
                entities: [
                    {
                        'idPattern': '.*',
                        'type': 'Bus'
                    }
                ]
            },
            notification: {
                http: {
                    url: callbackUrl
                },
                attr: [
                    'location'
                ]
            },
            expires: moment().add('7 days').toISOString()
        });
    }

}

module.exports = new Orion();
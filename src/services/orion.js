const moment = require('moment');
const ngsi = require('ngsijs');
const request = require('request-promise');

class Orion {

    constructor() {
        this.apiUrl = 'http://kobauy.ddns.net:1026';
        this.client = new ngsi.Connection(this.apiUrl);
    }

    getBusesOfVariantNearTo(busVariant, point) {
        // usamos una request plana porque ngsijs parece no soportar el atributo georel 
        // (Ver http://conwetlab.github.io/ngsijs/stable/NGSI.Connection.html#.%22v2.listEntities%22__anchor)
        return request.get(
            `${this.apiUrl}/v2/entities`, 
            { 
                qs: { 
                    type: 'Bus', 
                    q: `linea:'${busVariant}'`,
                    georel: 'near;maxDistance:100',
                    geometry: 'point',
                    coords: `${point[0]},${point[1]}`
                } 
            }
        );
    }

    subscribeToBusLocationChanges(busId, callbackUrl) {
        return this.client.v2.createSubscription({
            description: `A subscription to get location updates from bus ${busId}`,
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
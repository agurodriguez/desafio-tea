const moment = require('moment');
const ngsi = require('ngsijs');
const request = require('request-promise');

class Orion {

    constructor() {
        this.client = new ngsi.Connection('http://kobauy.ddns.net:1026');
    }

    subscribeToLocationChanges(busId, callbackUrl) {
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
            expires: moment().add('2 hours').toISOString()
        });
    }

}

module.exports = new Orion();
const orion = require('./services/orion');

const PUBLIC_URL = 'https://592f2662.ngrok.io';

class Tea {

    constructor() {
        this.busLocationChangesSubscription = undefined;
    }

    getNextBusForBusStop() {
    }
    
    getLastBusForBusStop(busStopId) {
    }

    getTimeBetweenTwoPointsForBus(bus, fromPoint, toPoint) {

    }

    handleOrionAccumulate(body) {
        if (body.subscriptionId == this.busLocationChangesSubscription.id) {
            body.data.forEach(i => console.log(i));
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
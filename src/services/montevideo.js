const request = require('request-promise');

class Montevideo {

    getStopsByBusVariant() {
        return request.get('http://kobauy.ddns.net:1080/api/trayectosporlinea', { json: true }).then(res => res.trayectos);
    }

}

module.exports = new Montevideo();
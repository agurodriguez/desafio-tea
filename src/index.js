const express = require('express');
const orion = require('./services/orion');
const tea = require('./services/tea');

const PUBLIC_URL = 'https://592f2662.ngrok.io';

let app = express();

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('body-parser').json());

app.get('/nextBus/:busLine/:busStopId', function (req, res) {
    let nextBusForBusStop = tea.getNextBusForBusStop(req.params.busLine, req.params.busStopId);
    let lastBusForBusStop = tea.getLastBusForBusStop(req.params.busLine, req.params.busStopId);
    let time = tea.getTimeBetweenTwoPointsForBus(lastBusForBusStop, [-56.4333, 32.8989], [-56.4333, 32.8989]);
    res.send(req.params);
});

app.all('/orion/accumulate*', function (req, res) {
    console.log('accumulate');
    console.log(req.body);
    res.sendStatus(200);
});

app.listen(8080, function () {
    console.log('Example app listening on port 8080!');
});

orion
    .subscribeToLocationChanges('62', `${PUBLIC_URL}/orion/accumulate`)
    .then(body => console.log(body))
    .catch(err => console.log(err));
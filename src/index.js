const express = require('express');
const app = express();

const tea = require('./services/tea');

app.get('/nextBus/:busLine/:busStopId', function (req, res) {
    let nextBusForBusStop = tea.getNextBusForBusStop(req.params.busLine, req.params.busStopId);
    let lastBusForBusStop = tea.getLastBusForBusStop(req.params.busLine, req.params.busStopId);
    let time = tea.getTimeBetweenTwoPoints([-56.4333, 32.8989], [-56.4333, 32.8989]);
    
    res.send(req.params);
});

app.listen(8080, function () {
    console.log('Example app listening on port 8080!');
});
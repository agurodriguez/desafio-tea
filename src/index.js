const express = require('express');
const tea = require('./tea');

let app = express();

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('body-parser').json());

app.get('/nextBus/:busVariant/:busStopId', async function (req, res) {
    let nextBusForBusStop = await tea.getNextBusForBusStop(req.params.busVariant, req.params.busStopId);
    let lastBusForBusStop = tea.getLastBusForBusStop(req.params.busVariant, req.params.busStopId);
    let time = tea.getTimeBetweenTwoPointsForBus(lastBusForBusStop, [-56.4333, 32.8989], [-56.4333, 32.8989]);
    res.send(req.params);
});

app.post('/orion/accumulate', function (req, res) {
    tea.handleOrionAccumulate(req.body);
    res.sendStatus(200);
});

app.listen(8080, function () {
    console.log('koba-tea running on port 8080');
});

tea.run();

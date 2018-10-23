if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const express = require('express');
const tea = require('./tea');
const Bus = require('./bus');

let app = express();

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('body-parser').json());

app.get('/nextBus/:busVariant/:busStopId', async function(req, res) {
  let nextBusForBusStop = await tea.getNextBusForBusStop(
    req.params.busVariant,
    req.params.busStopId
  );
  let lastBusForBusStop = tea.getLastBusForBusStop(
    req.params.busVariant,
    req.params.busStopId
  );
  let time = tea.getTimeBetweenTwoPointsForBus(
    lastBusForBusStop,
    [-56.4333, 32.8989],
    [-56.4333, 32.8989]
  );
  res.send(req.params);
});

app.post('/orion/accumulate', function(req, res) {
  tea.handleOrionAccumulate(req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT, function() {
  console.log(`koba-tea running on port ${process.env.PORT}`);
});

var bus = new Bus({ longitude: -34.927965, latitude: -56.1618 });
bus.getBusesGeolocations(7517).then(r => console.log(r));
//tea.run();

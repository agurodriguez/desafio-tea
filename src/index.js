if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    // TODO: Las dos líneas que siguen deberían ser eliminadas luego de que todos los miembros 
    // del equipo las tengan en su equipo. La idea es que incorporen el archivo .env automaticamente 
    // y su proceso de desarrollo no se vea interrumpido 
    const fs = require('fs');
    if (!fs.existsSync('.env')) fs.copyFileSync('.env.sample', '.env'); 
    require('dotenv').config();
}

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

app.listen(process.env.PORT, function () {
    console.log(`koba-tea running on port ${process.env.PORT}`);
});

tea.run();

tea.getNextBusForBusStop(7921, 2859).then(res => console.log(res)).catch(err => console.log(err));
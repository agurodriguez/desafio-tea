if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    require('dotenv').config();
}

const express = require('express');
const tea = require('./tea');

let app = express();

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('body-parser').json());

app.get('/nextBus/:busVariant/:busStopId', async function (req, res) {
    res.send(tea.getNextBusForBusStopEta(req.params.busVariant, req.params.busStopId));
});

app.post('/orion/accumulate', function (req, res) {
    tea.handleOrionAccumulate(req.body);
    res.sendStatus(200);
});

app.listen(process.env.PORT, function () {
    console.log(`koba-tea running on port ${process.env.PORT}`);
});

tea.run();

tea.getNextBusForBusStopEta(7921, 2859)
    .then(res => console.log(res));
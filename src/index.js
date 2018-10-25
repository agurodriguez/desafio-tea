if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    const fs = require('fs');
    if (!fs.existsSync('.env')) fs.copyFileSync('.env.sample', '.env');
    require('dotenv').config();
}

const express = require('express');
const corsAnywhere = require('cors-anywhere');
const tea = require('./tea');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('body-parser').json());

app.get('/nextBus/:busVariant/:busStopId', async function (req, res) {
    tea.getNextBusForBusStopEta(req.params.busVariant, req.params.busStopId).then(eta => res.send(eta))
});

app.post('/orion/accumulate', function (req, res) {
    tea.handleOrionAccumulate(req.body);
    res.sendStatus(200);
    io.emit('orion/accumulate', req.body);
});

app.get('/test/getLastBusForBusStop/:busVariant/:busStopId', function (req, res) {
    tea.getLastBusForBusStop(req.params.busVariant, req.params.busStopId).then(r => res.send(r)).catch(err => res.send(err));
});

app.get('/test/getNextBusForBusStop/:busVariant/:busStopId', function (req, res) {
    tea.getNextBusForBusStop(req.params.busVariant, req.params.busStopId).then(r => res.send(r)).catch(err => res.send(err));
});

app.get('/test/getNextBusForBusStopEta/:busVariant/:busStopId', function (req, res) {
    tea.getNextBusForBusStopEta(req.params.busVariant, req.params.busStopId).then(r => res.send(r)).catch(err => res.send(err));
});

app.get('/test/getPathForBus/:busId', function (req, res) {
    tea.getPathForBus(req.params.busId).then(r => res.send(r)).catch(err => res.send(err));
});

app.get('/test/getTimeBetweenTwoBusStopsForBus/:busVariant/:busId/:busStopId1/:busStopId2', function (req, res) {
    tea.getTimeBetweenTwoBusStopsForBus(req.params.busVariant, req.params.busId, req.params.busStopId1, req.params.busStopId2).then(r => res.send(r.toString())).catch(err => res.send(err));
});

app.use('/playground', express.static('playground'));

io.on('connection', function (socket) {
    console.log(`${socket.handshake.address} connected`);
    socket.on('disconnect', function () {
        console.log(`${socket.handshake.address} disconnected`);
    })
});

server.listen(process.env.PORT, function () {
    console.log(`koba-tea running on port ${process.env.PORT}`);
});

corsAnywhere.createServer().listen(+process.env.PORT + 1, function () {
    console.log(`koba-cors-anywhere running on port ${+process.env.PORT + 1}`);
});

tea.events.on('busesLocations', (locations) => {
    io.emit('busesLocations', locations);
});

tea.run();

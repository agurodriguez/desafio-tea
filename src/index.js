if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    require('dotenv').config();
}

const express = require('express');
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

io.on('connection', function (socket) {
    console.log(`${socket.handshake.address} connected`);
    socket.on('disconnect', function () {
        console.log(`${socket.handshake.address} disconnected`);
    })
});

server.listen(process.env.PORT, function () {
    console.log(`koba-tea running on port ${process.env.PORT}`);
});

tea.run();

// tea.getNextBusForBusStop(7920, 2837).then(console.log);
// tea.getLastBusForBusStop(7920, 2959).then(console.log)
// tea.getNextBusForBusStopEta(7920, 3219).then(console.log);
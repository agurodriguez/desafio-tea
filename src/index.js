const express = require('express');
const app = express();

app.get('/nextBus/:busId/:busStopId', function (req, res) {
  res.send(req.params);
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
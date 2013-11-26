var express = require('express');
var mongoose = require('mongoose');

// model definitions
require('require-dir')('./models');

// route definitions
var home = require('./routes/home');
var users = require('./routes/users');

var app = express();
var RedisStore = require('connect-redis')(express);
mongoose.connect('mongodb://localhost/DQS');

// configure express
require('./config').initialize(app, RedisStore);

// routes
app.get('/', home.index);
app.post('/search', home.search);
app.get('/log', home.getLog);
app.put('/consume', home.consume);
app.put('/addJournal', home.addJournal);
app.put('/unclick', home.unclick);
app.post('/users', users.create);
app.put('/login', users.login);
app.delete('/logout', users.logout);

// start server & socket.io
// var common = require('./sockets/common');
var server = require('http').createServer(app);
// var io = require('socket.io').listen(server, {log: true, 'log level': 2});
server.listen(app.get('port'));
// io.of('/app').on('connection', common.connection);

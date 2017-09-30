var express = require('express')
var app = express();
var port = 8080;
var environment = app.get('env')
var socket = require('socket.io');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var client_id = '3c9905935d774ba4a1bfc2a8654c2f70';
var client_secret = 'a1bc0c827409469db373bab544774d57';
var redirect_uri = 'https://spotifyapitest-jjm15c.c9users.io/callback';
var userSession;
app.set('view engine', 'pug')

var server = app.listen(port, function() {
    console.log('Server is running! on port ' + port + ' and is running with a ' + environment + ' environment.');
})

var io = socket(server)

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

app.use(express.static('public'))
    .use(cookieParser());

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
    socket.on('chat message', function(data) {
        io.emit('chat message', data);
    });
    socket.on('chat typing', function(user) {
        console.log(user + " is typing a message")
        socket.broadcast.emit('chat typing', user);
    });
});

app.get('/login', function(req, res) {
    res.render('login.pug')
})

app.get('/logingin', function(req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    var scope = 'user-read-private user-read-email user-library-read playlist-read-private user-follow-modify user-follow-read user-library-modify user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        })
    );
});

app.get('/dash', function(req, res) {
    if (req.query == null || undefined) {
        res.redirect('/login')
    }
    else {
        var access_token = req.query.access_token,
            refresh_token = req.query.refresh_token,
            error = req.query.error;
        if (error) {
            res.send('There was an error during the authentication');
        }
        else {
            if (access_token) {
                request.get('https://api.spotify.com/v1/me', {
                    'auth': {
                        'bearer': access_token
                    }
                }, function(error, response, body) {
                    if (error) {
                        console.log("ERROR")
                        //handle error
                    }
                    else {
                        res.render('dashboard', {
                            access_token: access_token,
                            refresh_token: refresh_token,
                            data: JSON.parse(body)
                        })
                    }
                });
            }
            else {
                res.redirect('/login')
            }
        }
    }
})


app.get('/callback', function(req, res) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/login' +
            querystring.stringify({
                error: 'state_mismatch'
            })
        );
    }
    else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                res.redirect('/?' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            }
            else {
                res.redirect('/login' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});


app.get('/', function(req, res) {
    res.send('helloworld')
})

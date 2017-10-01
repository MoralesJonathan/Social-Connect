var express = require('express')
var app = express();
var port = 8080;
var environment = app.get('env')
var keys = require("./secret.json")
var socket = require('socket.io');
var request = require('request');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var client_id = '3c9905935d774ba4a1bfc2a8654c2f70';
var client_secret = keys.spotifyClientSecret;
var redirect_uri = 'https://shellify-jjm15c.c9users.io/callback';
var session = require('express-session');
var mongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var MongoStore = require('connect-mongo')(session);
var userSession;
app.set('view engine', 'pug')

var server = app.listen(port, function() {
    console.log('Server is running! on port ' + port + ' and is running with a ' + environment + ' environment.');
})

var io = socket(server)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: keys.mongostore,
    resave: false,
    rolling: true,
    store: new MongoStore({
        url: 'mongodb://localhost/session'
    }),
    saveUninitialized: false
}))

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

function getUserInfo(id, callback) {
    mongoClient.connect("mongodb://localhost/logins", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('users');
            console.log("FINDING")
            console.log(id)
            collection.findOne({
                'userID': id
            }, function(err, userDeets) {
                if (err) {
                    console.log("EROORRR" + err)
                }
                else {
                    console.log("SETTING")
                    console.log(userDeets)
                    var obj = { 'id': id, 'name': userDeets.userName, 'avatar': userDeets.avatarURL }
                    callback(obj)
                }
            })
        }
    })
}

function getOnlineUsers(callback) {
    mongoClient.connect("mongodb://localhost/onlineusers", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('online');
            console.log("FINDING")
            collection.find({}).toArray(function(err, users) {
                if (err) {
                    console.log("EROORRR" + err)
                }
                else {
                    callback(users)
                }
            })
        }
    })
}
app.post('/getuserinfo', function(req, res) {
    getUserInfo(req.body.id, function(userinfo) {
        res.send(userinfo)
    })
})
app.post('/addRoomtoDB', function(req, res) {
    mongoClient.connect("mongodb://localhost/rooms", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('names');
            console.log("about to add room to db")
            collection.insert({
                sockedID: req.body.roomID,
                name: req.body.roomName
            }, function(err, newroom) {
                if (err) {
                    db.close()
                }
                else {
                    res.sendStatus(200)
                    db.close()
                }
            })
        }
    })
})

app.post('/getRoomName', function(req, res) {
    console.log(req.body.roomID)
    mongoClient.connect("mongodb://localhost/rooms", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('names');
            collection.findOne({
                sockedID: req.body.roomID,
            }, function(err, room) {
                if (err) {
                    console.log('error!' + err)
                    db.close()
                }
                else {
                    console.log("NOERROR")
                    res.send(room)
                    db.close()
                }
            })
        }
    })
})

app.post('/getMessages', function(req, res) {
    userSession = req.session;
    console.log(userSession.user)
    console.log('2')
    mongoClient.connect("mongodb://localhost/logins", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('messages');
            collection.findOne({
                user: userSession.user,
            }, function(err, messages) {
                if (err) {
                    console.log('error!' + err)
                    db.close()
                }
                else {
                    console.log("NOERROR")
                    res.send(messages)
                    db.close()
                }
            })
        }
    })
})

app.use(express.static('public'))
    .use(cookieParser());

io.on('connection', function(socket) {
    console.log("New connection!")
    mongoClient.connect("mongodb://localhost/onlineusers", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('online');
            collection.insert({
                userID: socket.handshake.query.id,
                socketID: socket.id
            }, function(err, newuser) {
                if (err) {
                    res.send(501)
                    db.close()
                }
                else {
                    console.log("done!")
                    db.close()
                }
            })
        }
    })
    socket.broadcast.emit('user connect');
    socket.on('disconnect', function() {
        mongoClient.connect("mongodb://localhost/onlineusers", function(error, db) {
            if (!error) {
                console.log("Connected successfully to MongoDB server");
                var collection = db.collection('online');
                collection.remove({
                    socketID: socket.id
                }, function(err, newuser) {
                    if (err) {
                        res.send(501)
                        db.close()
                    }
                    else {
                        console.log("done!")
                        db.close()
                    }
                })
            }
        })
        socket.broadcast.emit('user disconnect');
    });
    socket.on('chat message', function(data) {
        console.log(data)
        if (data.type == 'dm') {
            io.to(data.touser).emit('chat message', data);
        }
        else if (data.type == 'group') {
            io.to(data.roomName).emit(data);
        }
    });
    socket.on('chat typing', function(data) {
        if (data.type == 'dm') {
            io.to(data.touser).emit('chat typing', data);
        }
        else if (data.type == 'group') {
            io.to(data.roomName).emit('chat typing', data);
        }
    });
    socket.on('create', function(data) {
        socket.join(data.roomID);
        console.log("room Created!")
    });
    socket.on('join room', function(room) {
        socket.join(room);
    });
});

app.get('/login', function(req, res) {
    res.render('login.pug')
})

app.get('/test', function(req, res) {
    res.render('messages.pug')
})

app.post('/getCurTrack', function(req, res) {
    userSession = req.session;
    request.get('https://api.spotify.com/v1/me/player/currently-playing', {
        'auth': {
            'bearer': userSession.accessToken
        }
    }, function(error, response, currenttrack) {
        if (error) {
            console.log("ERROR")
            res.sendStatus(500)
        }
        else if (currenttrack == '') {
            // not listening to anything
            res.send('')
        }
        else {
            res.send(JSON.parse(currenttrack))
        }
    })
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

app.get('/home', function(req, res) {
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
                userSession = req.session;
                userSession.accessToken = access_token
                res.render('loadinghome')
            }
            else {
                res.redirect('/login')
            }
        }
    }
})

app.get('/home/done', function(req, res) {
    userSession = req.session;
    var access_token = userSession.accessToken
    if (!access_token) {
        res.redirect('/login');
    }
    else {
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
                var jsonbody = JSON.parse(body)
                userSession.user = jsonbody.id
                if (jsonbody.images == undefined || jsonbody.images[0] == undefined) {
                    var avatarUrl = 'https://www.youmus.com/assets/images/default_avatar.jpg';
                }
                else {
                    var avatarUrl = jsonbody.images[0].url;
                }
                mongoClient.connect("mongodb://localhost/logins", function(error, db) {
                    if (!error) {
                        console.log("Connected successfully to MongoDB server");
                        var collection = db.collection('users');
                        collection.findOne({
                            'userID': jsonbody.id
                        }, function(err, document) {
                            if (err) {
                                console.log("EROORRR" + err)
                                db.close()
                                res.send(500)
                            }
                            else if (document == null) {
                                collection.insert({
                                    userID: jsonbody.id,
                                    userName: jsonbody.display_name,
                                    userEmail: jsonbody.email,
                                    avatarURL: avatarUrl,
                                    friends: []
                                }, function(err, newuser) {
                                    if (err) {
                                        res.send(501)
                                    }
                                    else {
                                        res.render('home', {
                                            userinfo: jsonbody
                                        });
                                    }
                                    db.close()
                                })
                            }
                            else {
                                var friends = []
                                var friendPromises = [];
                                for (var x = 0; x < document.friends.length; x++) {
                                    friendPromises.push(new Promise(function(resolve, reject) {
                                        getUserInfo(document.friends[x], function(userinfo) {
                                            console.log('pUSHING')
                                            resolve(userinfo);
                                        })
                                    }))
                                }
                                Promise.all(friendPromises).then(function(friendsData) {
                                    console.log(friendsData);
                                    console.log("done")
                                    var onlineUserPromise = new Promise(function(resolve, reject) {
                                        getOnlineUsers(function(onlineusers) {
                                            resolve(onlineusers);
                                        })
                                    })
                                    onlineUserPromise.then(function(onlineUserData) {
                                        console.log(onlineUserData);
                                        console.log("doneenzoo")
                                        friendsData.forEach(function(s) {
                                            var found = false;
                                            onlineUserData.forEach(function(t) {
                                                if (s.id == t.userID) {
                                                    found = true
                                                    s["status"] = "Online";
                                                    s["socket"] = t.socketID
                                                }
                                                else {
                                                    //do nothing
                                                }
                                            });
                                            if (found == false) {
                                                s["status"] = "Offline"
                                            }
                                        });
                                        console.log("DONE ADDING STATUSSSS")
                                        console.log(friendsData)

                                        var collection = db.collection('sidebar');
                                        collection.findOne({
                                            'user': jsonbody.id
                                        }, function(err, sidebarChats) {
                                            res.render('home', {
                                                userinfo: jsonbody,
                                                friends: friendsData,
                                                chats: sidebarChats
                                            });
                                            db.close()
                                        });
                                    })
                                })
                            }
                        });
                    }
                })
            }
        })
    }
})

app.post('/refreshFriends', function(req, res) {
    userSession = req.session
    console.log("START OF REFRESH FREINDS")
    mongoClient.connect("mongodb://localhost/logins", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('users');
            collection.findOne({
                'userID': userSession.user
            }, function(err, document) {
                if (err) {
                    console.log("EROORRR" + err)
                    db.close()
                    res.send(500)
                }
                else if (document) {
                    var friends = []
                    var friendPromises = [];
                    for (var x = 0; x < document.friends.length; x++) {
                        friendPromises.push(new Promise(function(resolve, reject) {
                            getUserInfo(document.friends[x], function(userinfo) {
                                console.log('pUSHING')
                                resolve(userinfo);
                            })
                        }))
                    }
                    Promise.all(friendPromises).then(function(friendsData) {
                        console.log(friendsData);
                        console.log("done")
                        var onlineUserPromise = new Promise(function(resolve, reject) {
                            getOnlineUsers(function(onlineusers) {
                                resolve(onlineusers);
                            })
                        })
                        onlineUserPromise.then(function(onlineUserData) {
                            console.log(onlineUserData);
                            console.log("doneenzoo")
                            friendsData.forEach(function(s) {
                                var found = false;
                                onlineUserData.forEach(function(t) {
                                    if (s.id == t.userID) {
                                        found = true
                                        s["status"] = "Online";
                                        s["socket"] = t.socketID
                                    }
                                    else {
                                        //do nothing
                                    }
                                });
                                if (found == false) {
                                    s["status"] = "Offline"
                                }
                            });
                            console.log("DONE ADDING STATUSSSS")
                            console.log(friendsData)
                            res.send({
                                friends: friendsData
                            });
                            db.close()
                        });
                    })

                }
            })
        }
    })
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

                request.get(options, function(error, response, body) {});

                res.redirect('/home?' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            }
            else {
                res.redirect('/login' +
                    querystring.stringify({
                        error: 'invalid_token'
                    })
                );
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

app.post('/search', function(req, res) {
    var query = req.body.searchQuery
    mongoClient.connect("mongodb://localhost/logins", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('users');
            collection.find({
                $or: [{
                    "userName": {
                        $in: [new RegExp(query, 'i')]
                    }

                }, {
                    "userEmail": query
                }]
            }).toArray(function(err, document) {
                if (err) {
                    res.send(501)
                    db.close()
                }
                else {
                    res.send(document)
                    db.close()
                }
            })
        }
    })
})

app.post('/addFriend', function(req, res) {
    userSession = req.session;
    var ID = req.body.addUser
    console.log(userSession.user)
    mongoClient.connect("mongodb://localhost/logins", function(error, db) {
        if (!error) {
            console.log("Connected successfully to MongoDB server");
            var collection = db.collection('users');
            collection.update({
                userID: userSession.user
            }, {
                $push: {
                    friends: ID
                }
            }, function(err, result) {
                if (err) {
                    res.send(501)
                    db.close()
                }
                else {
                    res.send(200)
                    db.close()
                }
            })
        }
    })
})
app.post('/play', function(req, res) {
    userSession = req.session;
    request.put('https://api.spotify.com/v1/me/player/play', {
        'auth': {
            'bearer': userSession.accessToken
        }
    }, function(error, response) {
        if (error) {
            console.log("ERROR")
            //handle error
        }
        else {
            res.send(userSession.accessToken)
        }
    })
})

app.post('/pause', function(req, res) {
    userSession = req.session;
    request.put('https://api.spotify.com/v1/me/player/pause', {
        'auth': {
            'bearer': userSession.accessToken
        }
    }, function(error, response) {
        if (error) {
            console.log("ERROR")
            //handle error
        }
        else {
            res.send(userSession.accessToken)
        }
    })
})

app.post('/skip', function(req, res) {
    userSession = req.session;
    request.post('https://api.spotify.com/v1/me/player/next', {
        'auth': {
            'bearer': userSession.accessToken
        }
    }, function(error, response) {
        if (error) {
            console.log("ERROR")
            //handle error
        }
        else {
            res.send(userSession.accessToken)
        }
    })
})

app.post('/previous', function(req, res) {
    userSession = req.session;
    request.post('https://api.spotify.com/v1/me/player/previous', {
        'auth': {
            'bearer': userSession.accessToken
        }
    }, function(error, response) {
        if (error) {
            console.log("ERROR")
            //handle error
        }
        else {
            res.send(userSession.accessToken)
        }
    })
})

app.get('/', function(req, res) {
    res.render('index')
})

app.get('/chat', function(req, res) {
    res.render('chat')
})

app.get('/sample', function(req, res) {
    res.render('sample')
})

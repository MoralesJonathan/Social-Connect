$(function() {
    var socket = io({ query: "id=" + $('#user').attr('data-uid') });

    $('#messageForm').submit(function(e) {
        e.preventDefault();
        socket.emit('chat message', {
            message: $('#m').val(),
            type: $('#m').attr('data-type'),
            roomName: '',
            touser: $('#m').attr("data-to"),
            fromuser: $('#m').attr("data-from")
        });
        $('#m').val('');
        return false;
    });


    $('#m').keypress(function(event) {
        socket.emit('chat typing', {
            type: $('#m').attr('data-type'),
            roomName: '',
            touser: $('#m').attr("data-to"),
            fromuser: $('#m').attr("data-from")
        });
    })

    socket.on('chat message', function(data) {
        $('ul#typing').html('')
        $('#messages').append($('<li>').text(data.fromuser + ': ' + data.message));
    });

    socket.on('chat typing', function(user) {
        $('#typing').html('<em>' + user.fromuser + ' is typing a message</em>');
    });

    socket.on('user disconnect', function(data) {
        $.post('/refreshFriends', {}, function(data) {
            data.friends.forEach(function(s) {
                var found = false;
                //logged off
                $('#onlineFriends').children('.friend').each(function() {
                    var dis = $(this)
                    var found = false;
                    data.friends.forEach(function(s) {
                        if (dis.attr('id') == s.socketID) {
                            found = true;
                        }
                        else {

                        }
                    });
                    if (found == false) {
                        dis.removeAttr('id')
                        dis.children().eq(1).html('<i><p style="color:grey;">Offline</p></i>')
                    }
                });
            })
        });
    })

    socket.on('user connect', function(data) {
        $.post('/refreshFriends', {}, function(data) {
            console.log(data.friends)
            $('#onlineFriends').children('.friend').each(function() {
                console.log($(this))
            })

            data.friends.forEach(function(s) {
                var found = false;
                if (s.status == 'Offline') {
                    return
                }
                //logged in
                $('#onlineFriends').children('.friend').each(function() {
                    var dis = $(this)
                    console.log(s)
                    if (s.id == dis.attr('data-sid')) {
                        console.log('found a match')
                        found = true;
                        if (dis.attr('id') == null || undefined) {
                            dis.attr('id', s.socket)
                            dis.children().eq(1).html('<p style="color:green;">Online</p>')
                        }
                        else {
                            console.log('aready online')
                        }
                    }
                    else {}
                });
                if (found == false) {
                    console.log('New user came offline')
                }
            });
        })
    });
    $('#crateChatRoom').submit(function(e) {
        e.preventDefault();
        var roomName = $('#chatRoom').val();
        $('#chatRoom').val('')
        var encrypt1 = CryptoJS.AES.encrypt(roomName, "pizza");
        var socketRoomName = CryptoJS.AES.decrypt(encrypt1, "pizza");
        var nameOfRoom = socketRoomName.toString(CryptoJS.enc.Utf8);
        socket.emit('create', { roomID: socketRoomName, roomName: nameOfRoom });
        $.post('/addRoomtoDB', {
            roomID: socketRoomName.toString(),
            roomName: nameOfRoom
        }, function(data) {
            $('#chatRoomConfirmation .modal-content .box').html('<p>Sucess! Your chat room ' + nameOfRoom + ' has been created! Share this code with your friends to join your chat room!</p><center><span class="tag is-medium">' + socketRoomName + '</span></center>')
            $('#chatRoomConfirmation').addClass('is-active')
            $('#chatrooms').append('<a class="messageRoom"><div class="room" id="' + socketRoomName + '"><p>' + nameOfRoom + '</p></div><a/>')
        })
    })


    $('#joinChatRoom').submit(function(e) {
        e.preventDefault();
        var roomNameID = $('#chatRoomID').val();
        $('#chatRoomID').val('')
        socket.emit('join room', roomNameID);
        $.post('/getRoomName', {
            roomID: roomNameID
        }, function(data) {
            console.log(data)
            $('#chatrooms').append('<a class="messageRoom"><div class="room" id="' + roomNameID + '"><p>' + data.name + '</p></div><a/>')
        })

    })
})

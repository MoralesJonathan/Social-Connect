$(function() {
    $.post('/getCurTrack', {}, function(data) {
        if (data == '' || data == undefined) {
            $('#trackName').html('')
            $('#trackArtists').html('')
        }
        else {
            $('#trackName').html(data.item.name)
            $('#trackArtists').append(data.item.artists[0].name)
            for (var x = 1; x < data.item.artists.length; x++) {
                $('#trackArtists').append(", " + data.item.artists[x].name)
            }
            $('#albumArt').attr('src', data.item.album.images[0].url)
        }
    })
})

$('#playpause').click(function() {
    $(this).toggleClass('active');
    if ($(this).hasClass('active')) {
        $(this).text('pause');
        $.post("/play");
    }
    else {
        $(this).text('play');
        $.post("/pause");
    }
});

$('#next').click(function() {
    $.post("/skip");
});

$('#prev').click(function() {
    $.post("/previous");
});

$('#userSearch').submit(function(e) {
    e.preventDefault();
    $('#results').html('')
    var search = $('#search').val();
    $.post('/search', {
        searchQuery: search
    }, function(data) {
        console.log(JSON.stringify(data))
        if (data.length > 0) {
            for (var x = 0; x < data.length; x++) {
                $('#results').append('<li><img src="' + data[0].avatarURL + '""><p>' + data[0].userName + ' - ' + data[0].userEmail + ' <a class="addUser" data-id="' + data[0].userID + '">+</a></p></li>')
            }
        }
        else {
            $('#results').append('<li><p>No users found.</p></li>')
        }
    })
})

$('.results').on('click', '.addUser', function() {
    var id = $(this).attr('data-id')
    $.post('/addFriend', {
        addUser: id
    }, function(data) {
        alert('User has been added to your friends!')
    })
})

$('.messageFriend').click(function() {
    var socketID = $(this).children('.friend').attr('id')
    var userID = $(this).children('.friend').attr('data-sid')
    $('#m').attr('data-to', socketID)
    $('#m').attr('data-type', 'dm')
})



$('#chatrooms').on('click', 'a', function() {
    var socketID = $(this).children('.room').attr('id')
    $('#m').attr('data-to', socketID)
    $('#m').attr('data-type', 'room')
})

$('.chatPreview').click(function() {
    var myName = $('#user').text().split()
    if ($(this).children(':first').attr('class') == 'messageFriend') {
        var userChatroom = $(this).children(':first').attr('id')
        $.post('/getuserinfo', {
            id: userChatroom
        }, function(data) {
            $('#user').html(data.name)
            $('#chatAvatar').attr('src', data.avatar)
            $.post('/getMessages', {}, function(data2) {
                for(var x = 0; x < data2[userChatroom].length; x++) {
                    if (data2[userChatroom][x].from == userChatroom) {
                        $('.chat-content-body').append('<p><b>'+data.name+': </b>'+data2[userChatroom][x].message+'</p>')
                    } else {
                        $('.chat-content-body').append('<p><b>'+myName+': </b>'+data2[userChatroom][x].message+'</p>')
                    }
                }
            })
        })
        //post to get user info and messages
    }
    else {

    }
})

var program = require('commander');
var _ = require('lodash');
var readline = require('readline');
var util = require('util');

var logger = require('./lib/logger')();
var colors = require('colors');

var socket = null;

var help = [
    'ChatIO commands. Commands may be abbriviated',
    '',
    'h, help                    ' + 'display this message.',
    'c, connect <host>          ' + 'connect to given host',
    'd, disconnect              ' + 'disconnect from current host',
    'n, nickname <username>     ' + 'register your nickname',
    'f, forget                  ' + 'deregister your nickname.',
    'u, user [room:all]         ' + 'show user list, optionally filterd by room',
    'j, join <room>             ' + 'join or create a room.',
    'l, leave                   ' + 'leave the current room.',
    'r, rooms                   ' + 'show a list of available rooms.',
    'w, whisper <username> msg  ' + 'sends a private message to user.',
    'e, exit                    ' + 'exit chatio',
].join('\n')

var prefix = '.';
var re = new RegExp("^\\"+ prefix);

module.exports.run = function run(program) {
    if (program.server) {
        connect(program.server);
    } else {
        connect();
    }
    

    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        //terminal: true,
        completer: function completer(line) {
            var commands = 'help connect disconnect nickname forget '
                + 'users join leave rooms whisper exit';
                commands = commands.split(' ');
            var completions = _.map(commands, function (command) {
                return prefix + command + ' ';
            });
            var hits = _.filter(completions, function(c) {
                return c.indexOf(line) == 0}
            );
            // show all completions if none found
            return [hits.length ? hits : completions, line]
        }
    });

    updatePrompt();
    
    rl.on('line', parseRLCommand).on('close', function() {
        console.log('Goodbye sweet prince'.blue);
        process.exit(0);
    });

    function parseRLCommand(line) {
        line = line.trim();
        
        if (line.match(re)) {
            line = line.slice(1);
            var args = line.split(' ');
            var action = args.shift();
        }
        
        runCommand(action, args, line);
    }

    function runCommand(action, args, line) {
        switch(action) {
            case 'c':
            case 'connect':
                var host = args[0];
                connect(host);
                break;
            case 'd':
            case 'disconnect':
                socket.disconnect();
                break;
            case 'n': 
            case 'nickname':
                var username = args[0];
                socket.emit('register', { username: username });
                break;
            case 'f':
            case 'forget':
                var username = args[0];
                socket.emit('deregister', { username: username });
                break;
            case 'u':
            case 'users':
                var room = args[0] || socket.room;
                if (room && room != 'all') {
                    socket.emit('users', { room: room });
                } else {
                    socket.emit('users');
                }
                break;
            case 'r':
            case 'rooms':
                socket.emit('rooms');
                break;
            case 'j': 
            case 'join':
                var room = args[0];
                socket.emit('join', { room: room });
                break;
            case 'l':
            case 'leave':
                var room = args[0];
                socket.emit('leave', { room: room });
                break;
            case 'w':
            case 'whisper':
                var username = args[0];
                var message = args.slice(1).join(' ');
                socket.emit('whisper', { username: username, message: message });
                break;
            case 'e':
            case 'exit':
                console.log('Goodbye sweet prince'.blue);
                process.exit(0);
                break;
            case 'h':
            case 'help':
                console.log(help);
                break;
            default:
                if (socket.room) {
                    socket.emit('message', {room: socket.room, message: line});
                } else {
                    console.log(['Command Not Found `',
                        line.trim(), '`'].join('').blue);
                }
                break;
        }
        updatePrompt();
    }
};

function connect(host) {
    if (socket) {
        socket.disconnect();
    }
    socket = require('socket.io-client').connect(host);

    socket.on('connect', function() {
        socket.on('notice', function(data) {
            if (data.error) {
                console.log(data.error.red);
                showPrompt();
                return;
            }
            console.log(data.message.blue);
            showPrompt();
        });

        socket.on('registered', function(data) {
            if (data.error) {
                console.log(data.error.red);
                showPrompt();
                return;
            }
            socket.username = data.username;
            console.log("You are now known as: %s".blue, data.username);
            updatePrompt();
        });
        
        socket.on('deregistered', function(data) {
            if (data.error) {
                console.log(data.error.red);
                showPrompt();
                return;
            }
            delete socket.username;
            console.log("You are no longer known as: %s".blue, data.username);
            updatePrompt();
        });

        socket.on('users', function(data) {
            console.log("Users: ".blue);
            listUsers(data.users);
            showPrompt();
        });
        
        socket.on('rooms', function(data) {
            console.log("Rooms: ".blue);
            for(var room in data.rooms) {
                console.log("  %s".cyan, data.rooms[room]);
            }
            showPrompt();
        });

        socket.on('joined', function(data) {
            if (data.error) {
                console.log(data.error.red);
                showPrompt();
                return;
            }
            socket.room = data.room;
            console.log("Joined room %s: ".blue, socket.room);
            listUsers(data.users);
            updatePrompt();
        });

        socket.on('left', function(data) {
            console.log("left %s", data.room);
            delete socket.room;
            updatePrompt();
        });

        socket.on('message', function(data) {
            var output = '';
            if (data.username) {
                output += util.format("[%s] ".yellow, data.username);
            }
            
            cleanWrite(output + data.message);
        });

        socket.on('whisper', function(data) {
            var output = '';
            if (data.username) {
                output += util.format("[%s] ".grey, data.username);
            } 

            cleanWrite(output + data.message.grey);
        });

        socket.on('error', function(err) {
            console.log(err.red);
        });
    });
}

function cleanWrite(message) {
    // Store the line buffer and cursor 
    var buffer = rl.line;
    var cursor = rl.cursor;
    
    // remove current line and display new message
    rl.prompt();
    rl.write(null, {ctrl: true, name: 'u'});
    console.log(message);

    // prepare new prompt for user input and fill in with current line
    // buffer and move cursor accordingly. 
    rl.prompt();
    rl.write(buffer);
    rl.line = buffer;
    rl.cursor = cursor;
}

function showPrompt() {
    rl.prompt(true);
}

function updatePrompt() {
    var promptStr = 'chatio';

    if (socket && socket.username) {
        promptStr += util.format(' [%s', socket.username);
        if (socket.room) {
            promptStr += util.format('@%s', socket.room);
        }
        promptStr += ']';
    }

    promptStr += '> ';
    rl.setPrompt(promptStr.green, promptStr.length);
    rl.prompt(true);
};

function listUsers(users) {
    for(var user in users) {
        var output = util.format('  %s'.yellow, users[user].username);
        if (users[user].room) {
            output += util.format('@%s'.cyan, users[user].room);
        }
        console.log(output);
    }
}

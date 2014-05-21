var program = require('commander');
var _ = require('lodash');
var readline = require('readline');
var util = require('util');

var config = require('./config/config.js');
var logger = require('./lib/logger')(config.log);
var colors = require('colors');

var socket = null;
/*
program
    .version(require('./package.json').version)
    .option('-s, --server', 'Connect to ChatIO server on given host url');

program
    .command('*')
    .description('[Server URL]')
    .action(function(server) {
        program.server = server;
    });

program.parse(process.argv);
*/

var help = [
    'ChatIO commands. Commands may be abbriviated',
    '',
    'h[elp]                 ' + 'display this message.',
    'c[onnect] host         ' + 'connect to given host',
    'd[isconnect]           ' + 'disconnect from current host',
    'n[ickname] username    ' + 'register your nickname',
    'f[orget]               ' + 'deregister your nickname.',
    'u[ser] [room:all]      ' + 'show user list, optionally filterd by room',
    'j[oin] room            ' + 'join or create a room.',
    'l[eave]                ' + 'leave the current room.',
    'r[ooms]                ' + 'show a list of available rooms.',
    'e[xit]                 ' + 'exit chatio',
].join('\n')

module.exports.run = function run(program) {
    if (program.server) {
        connect(program.server);
    } else {
        connect();
    }

    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: function completer(line) {
            var commands = 'help connect disconnect nickname forget '
                + 'users join leave rooms exit';
                commands = commands.split(' ');
            var completions = _.map(commands, function (command) {
                return prefix + command + ' ';
            });
            var hits = _.filter(completions, function(c) { return c.indexOf(line) == 0})
            // show all completions if none found
            return [hits.length ? hits : completions, line]
        }
    });
    var prefix = ':';
    var re = new RegExp("^"+ prefix);
    updatePrompt();

    rl.on('line', function(line) {
        line = line.trim();
        
        if (line.match(re)) {
            line = line.slice(1);
            var args = line.split(' ');
            var action = args.shift();
        }

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
                    socket.emit('message', { room: socket.room, message: line });
                } else {
                    console.log(['Command Not Found `', line.trim(), '`'].join('').blue);
                }
                break;
        }
        updatePrompt();
    }).on('close', function() {
        console.log('Goodbye sweet prince'.blue);
        process.exit(0);
    });
};

function connect(host) {
    if (socket) {
        socket.disconnect();
    }
    socket = require('socket.io-client').connect(host);

    socket.on('connect', function() {
        socket.on('notice', function(data) {
            console.log(data.message.blue);
            updatePrompt();
        });

        socket.on('registered', function(data) {
            if (data.error) {
                console.log(data.error.red);
                updatePrompt();
                return;
            }
            socket.username = data.username;
            console.log("You are now known as: %s".blue, data.username);
            updatePrompt();
        });
        
        socket.on('deregistered', function(data) {
            if (data.error) {
                console.log(data.error.red);
                updatePrompt();
                return;
            }
            delete socket.username;
            console.log("You are no longer known as: %s".blue, data.username);
            updatePrompt();
        });

        socket.on('users', function(data) {
            console.log("Users: ".blue);
            listUsers(data.users);
            updatePrompt();
        });
        
        socket.on('rooms', function(data) {
            console.log("Rooms: ".blue);
            for(var room in data.rooms) {
                console.log("  %s".cyan, data.rooms[room]);
            }
            updatePrompt();
        });

        socket.on('joined', function(data) {
            if (data.error) {
                console.log(data.error.red);
                updatePrompt();
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
            console.log(output + data.message);
            updatePrompt();
        });

        socket.on('error', function(err) {
            console.log(err.red);
        });
    });
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
    rl.prompt();
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

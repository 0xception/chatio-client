var winston = require('winston');

module.exports = function (config) {
    var logger = new winston.Logger({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                handleExceptions: false 
            })
        ],
        levels: {
            verbose: 0,
            info: 1,
            data: 2,
            warn: 3,
            debug: 4,
            error: 5,
        },
        colors: {     
            verbose: 'cyan',
            info: 'green',
            data: 'grey',
            warn: 'yellow',
            debug: 'blue',
            error: 'red',
        },
        exitOnError: true
    });

    return logger;
};


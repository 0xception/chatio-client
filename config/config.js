/*
 * ChatIO Client Configuration
 */

module.exports = {
    host: 'http://localhost:4000',
    env: 'development',
    log: {
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
        }
    }
};

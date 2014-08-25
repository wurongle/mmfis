var fis = module.exports = require('fis');

fis.cli.name = 'mmfis';
fis.cli.info = fis.util.readJSON(__dirname + '/package.json');
fis.require.prefixes.unshift('mmfis');
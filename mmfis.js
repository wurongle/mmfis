var fis = module.exports = require('fis');
var path = require('path');
var i18n = require('./lib/i18n');
var _ = fis.util;


fis.cli.name = 'mmfis';
fis.cli.info = fis.util.readJSON(__dirname + '/package.json');
fis.require.prefixes.unshift('mmfis');

fis.config.set('server.rewrite',true);
fis.config.set('statics','/static');
fis.config.set('templates','/template');

fis.config.set('modules.parser.less','less');
fis.config.set('roadmap.ext.less','css');

fis.config.set('modules.prepackager',function (ret, conf, settings, opt) {
    if(fis.config.get('i18n')){
        //国际化处理
        i18n.i18nHandler(ret);
    }
});
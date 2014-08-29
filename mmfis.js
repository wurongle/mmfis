var fis = module.exports = require('fis');
var path = require('path');

fis.cli.name = 'mmfis';
fis.cli.info = fis.util.readJSON(__dirname + '/package.json');
fis.require.prefixes.unshift('mmfis');

fis.config.set('server.rewrite',true);
fis.config.set('statics','/static');
fis.config.set('templates','/template');

fis.config.set('modules.parser.less','less');
fis.config.set('roadmap.ext.less','css');


fis.config.set('modules.preprocessor.html',function (content, file, conf) {
    content = content.replace(/<%#include\(([^#][a-zA-Z0-9-_#.\/]+)\)%>/g,function (includeStr,url) {
        //console.log(includeStr,url);
        return '<<<include>>><img src="'+url+'"/>';
    });
    return content;
});

fis.config.set('modules.postprocessor.html',function (content, file, conf) {
    /* qqmailtemplate */
    content = content.replace(/<<<include>>><img src="([^#][a-zA-Z0-9-_#.\/]+)"\/>/g,function (includeStr,url) {
        var _rel = path.relative(path.dirname(file.release),path.dirname(url)) + '/' +path.basename(url);
        return '<%#include('+fis.util(_rel)+')%>';
    });
    /* encode */
    if(/^(t\.)?gbk\./.test(file.filename)){
        file.charset = 'gbk';
        file.release = file.release.replace(/(\/|__|\.)gbk\./i,'$1');
    }else{
        file.release = file.release.replace(/(\/|__|\.)utf8\./i,'$1');
    }
    return content;
});

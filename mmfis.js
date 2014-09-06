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

var includeFiles = [];

fis.config.set('modules.preprocessor.html',function (content, file, conf) {
    //console.log(file.filename);
    content = content.replace(/<%#include\(([^#][a-zA-Z0-9-_#.\/]+)\)%>/g,function (includeStr,url) {
        //console.log(includeStr,url);
        //console.log(file.subpath);
        var _url = path.resolve(path.dirname(file.subpath),url).substring(2).replace(/\\/g,'/');
        return '<%#include('+_url+')%>';
        //return '<<<include>>><img src="'+url+'"/>';
    });
    return content;
});

fis.config.set('modules.postprocessor.html',function (content, file, conf) {
    //console.log(file.filename);
    /* encode */
    if(/^t\.gbk\.|gbk\./.test(file.filename)){
        //console.log('gbk',file);
        file.charset = 'gbk';
        file.release = file.release.replace(/(\/|__|\.)gbk\./i,'$1');
    }else{
        //console.log('utf8',file.filename);
        file.release = file.release.replace(/(\/|__|\.)utf8\./i,'$1');
    }
    /* qqmailtemplate */
    content = content.replace(/<<<include>>><img src="([^#][a-zA-Z0-9-_#.\/]+)"\/>/g,function (includeStr,url) {
        //var _rel = path.relative(path.dirname(file.release),path.dirname(url)) + '/' +path.basename(url);
        //url = url.replace(/(\/|__|\.)(gbk|utf8)\./i,'$1');
        //console.log(file.filename);
        return '<%#include('+fis.util(url)+')%>';
    });
    return content;
});

fis.config.set('modules.prepackager',function (ret, conf, settings, opt) {
    //console.log(ret);
    console.log("includeFiles",includeFiles);
    fis.util.map(includeFiles,function (index,file) {
        console.log('includeFileItem.url',file.url);
    });
});

fis.emitter.on('compile:end', function (file) {
    
    /*var cache = fis.cache("D:/mmrb_new/projects/mmportal/src/old/gbk.weixin_faq_layout.html", 'compile/release');
    revertObj = {};
    cache.revert(revertObj)
    //revertObj.content = revertObj.content.toString('utf8');
    console.log(revertObj.content);*/

    if(file.ext == ".html"){
        //console.log(file);
        var includeFileItem = {
            includes:{}
        };
        file._content.replace(/<%#include\(([^#][a-zA-Z0-9-_#.\/:]+)\)%>/ig,function (includeStr,url) {
            includeFileItem.url = file.url;
            var _url = url.replace(/#.*/,'');
            includeFileItem.includes[_url] = true;
        });
        includeFileItem.url && includeFiles.push(includeFileItem);
    }

});
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

var includeFiles = {};
var includeRegx = /<%#include\(([^#][a-zA-Z0-9-_#.\/:]+)\)%>/ig;
var setVarIncludeRegx = /<<<subpath>>><<<([^#][a-zA-Z0-9-_#.\/:]+)>>><<<abspath>>><<<([^#][a-zA-Z0-9-_#.\/:]+)>>>/ig;

fis.config.set('modules.preprocessor.html',function (content, file, conf) {
    //console.log(file.filename);
    content = content.replace(includeRegx,function (includeStr,url) {
        return '<<<include>>><img src="'+url+'"/>';
    });
    return content;
});
/*
 1. 相对路径用于计算ret.src.key
 2. 绝对路径用于计算运行时相对路径
 */
fis.config.set('modules.preprocessor.html',function (content, file, conf) {
    //console.log(file.filename);
    content = content.replace(includeRegx,function (includeStr,url) {
        //console.log(includeStr,url);
        //console.log(file.subpath);
        var _url = path.resolve(path.dirname(file.subpath),url).replace(/^\d:/,'').replace(/\\/g,'/');
        //return '<%#include('+_url+')%>';
        return '<<<include>>><img subpath="'+_url+'" src="'+url+'"/>';
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
    content = content.replace(/<<<include>>><img subpath="([^#][a-zA-Z0-9-_#.\/]+)" src="([^#][a-zA-Z0-9-_#.\/]+)"\/>/g,function (includeStr,subpath,abspath) {
        //var _rel = path.relative(path.dirname(file.release),path.dirname(url)) + '/' +path.basename(url);
        //url = url.replace(/(\/|__|\.)(gbk|utf8)\./i,'$1');
        //console.log(file.filename);
        //console.log(file.release,url,path.relative(path.dirname(file.release),url));
        //var _url = path.resolve(path.dirname(file.release),url).replace(/^\d:/,'').replace(/\\/g,'/');
        //return '<%#include('+_url+')%>';
        return "<<<subpath>>><<<"+subpath+">>><<<abspath>>><<<"+abspath+">>>"
        //return '<%#include('+fis.util(url)+')%>';
    });
    return content;
});

fis.config.set('modules.prepackager',function (ret, conf, settings, opt) {
    //console.log(ret);
    //console.log("includeFiles",includeFiles);
    fis.util.map(includeFiles,function (subpath,includes) {
        var file = ret.src[subpath];
        var getIncludes = function (include) {
            var _includes = {};
            var _fn = function(include) {
                if(includeFiles[include]){
                    fis.util.map(includeFiles[include],function (_include,value) {
                        _includes[_include] = value;
                        return _fn(_include);
                    })
                }else{
                    _includes[include];
                }
            };
            _fn(include);
            return _includes;
        };
        var setIncludeVars = function (obj) {
            var setVarsArr = [];
            fis.util.map(obj,function (item,value) {
                //console.log(item,value);
                //console.log("\nSetVar",item,subpath,path.relative(path.dirname(subpath),path.dirname(item)));
                var _rel = path.relative(path.dirname(file.release),path.dirname(value));
                _rel += (_rel ? '/' :'./') + path.basename(value); 
                setVarsArr.push("<%@SetVar("+item+','+_rel+")%>\n");
            });
            return setVarsArr.join('');
        }
        if(!file){
            console.log('error, no subpath in src:',subpath);
        }else{
            //console.log('getIncludes',getIncludes(subpath));
            file = fis.file.wrap(file);
            var _includes = getIncludes(subpath);
            var _content = setIncludeVars(_includes) + file.getContent().replace(setVarIncludeRegx,function (includeStr,subpath,abspath) {
                return '<%#include(GetVar('+subpath+'))%>';
            });
            file.setContent(_content);
        }

    });
});
//建立所有文件引用树
fis.emitter.on('compile:end', function (file) {

    if(file.ext == ".html"){
        //console.log(file);
        file._content.replace(setVarIncludeRegx,function (includeStr,subpath,abspath) {
            subpath = subpath.replace(/#.*/,'');
            if(!includeFiles[file.subpath]){
                includeFiles[file.subpath] = {};
            }
            includeFiles[file.subpath][subpath] = abspath;
        });
    }

});

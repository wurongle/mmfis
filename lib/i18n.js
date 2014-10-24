var PO = require('node-po-ext');
var _ = fis.util;

module.exports = {
    jsTranslate:{},
    translate:{},
    langFilePathMap:{},
    jsI18nPath:'js_i18n.html',
    contextNamespace:'MM',
    langFileDirPath:'',
    setJsTranslateFile: function (pkg) {
        var root = fis.project.getProjectPath(),
            file = fis.file(root,this.jsI18nPath),
            items = [],
            content = '';

        pkg[file.subpath] = file;

        _.map(this.jsTranslate, function(key, value){
            items.push('    "'+key+'":"' + value + '"');
        });
        content = '<script type="text/javascript">\n'
        content += '!function(){var n={},t={};n.context=function(n,e){var i=arguments.length;if(i>1)t[n]=e;else if(1==i){if("object"!=typeof n)return t[n];for(var o in n)n.hasOwnProperty(o)&&(t[o]=n[o])}},"'+this.contextNamespace+'"in window||(window.'+this.contextNamespace+'=n)}();'
        content += '\n'+this.contextNamespace+'.context({\n';
        content += items.join(',\n');
        content += '\n});\n</script>';

        file.setContent(content);
    },
    parse:function (file) {
        var that = this,
            content = file.getContent(),
            reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]*?(?:\*\/|$))|\b(_)\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
        
        content = content.replace(reg, function(m, comment, type, value) {
            if (type && (type == "_")) {
                var str = value.substr(1, value.length - 2);
                var md5 = _.md5(str);
                var info = _.stringQuote(value);
                var out = '<%@GetVar('+md5+')%>';
                if(file.isJsLike){
                    that.jsTranslate[md5] = out;
                    m = that.contextNamespace + '.context("' + md5 + '")';
                }else{
                    m = out;
                }
                if(that.translate[md5]){
                    that.translate[md5].references.push(file.subpath);
                }
                that.translate[md5] = {
                    msgid : str,
                    comment : md5,
                    references : [file.subpath]
                };
            }
            return m;
        });
        file.setContent(content);
    },
    setPoFile: function (file) {
        var translate = this.translate;
        var po = PO.parse(file.getContent());

        this.langFilePathMap[file.filename] = this.langFileDirPath + file.filename+'.lang.html';

        for (var i = 0, len = po.items.length; i < len; i++) {
            var item = po.items[i];
            var translateItem = translate[item.comments[0]];
            if(translateItem){
                translateItem.msgstr = item.msgstr[0];
            }
        }

        var po_content = [
            'msgid ""',
            'msgstr ""',
            '"Plural-Forms: nplurals=1; plural=0;\\n"',
            '"Project-Id-Version: fis\\n"',
            '"POT-Creation-Date: \\n"',
            '"PO-Revision-Date: \\n"',
            '"Last-Translator: \\n"',
            '"Language-Team: \\n"',
            '"MIME-Version: 1.0\\n"',
            '"Content-Type: text/plain; charset=UTF-8\\n"',
            '"Content-Transfer-Encoding: 8bit\\n"',
            '"Language: zh_CN\\n"',
            '"X-Generator: fis xgettext2 \\n"',
            '"X-Poedit-SourceCharset: UTF-8\\n"',
            '', '', ''
        ].join('\n');

        _.map(translate,function (key,item) {
            po_content += '# ' + item.comment + '\n';
            item.references.forEach(function (item) {
                po_content += '#: ' + item + '\n';
            });
            po_content += 'msgid "' + item.msgid + '"\n';
            po_content += 'msgstr "' + (item.msgstr || '') + '"\n';
            po_content += '\n\n';
        });
        //file.setContent(po_content);
        if(_.md5(file.getContent()) != _.md5(po_content)){
            _.write(file.realpath,po_content);
        }
    },
    setLangFile: function (file,pkg) {
        var that = this,
            lang_content = '',
            root = fis.project.getProjectPath(),
            langFile = fis.file(root,this.langFilePathMap[file.filename]);

        _.map(that.translate,function (key,item) {
            lang_content += '<%@SetVar('+key+','+(item.msgstr||item.msgid)+')%>\n'
        });

        pkg[langFile.subpath] = langFile;
        langFile.setContent(lang_content);
        //console.log(file);
        //_.write(file.relapath,po_content);
    },
    insertI18nFile: function (file) {
        var content = file.getContent();
        var langTpl = [
            '<%@if($lang$=en|$lang$=en_US)%>',
            '<%#include('+this.langFilePathMap['en_US']+')%>',
            '<%@elseif($lang$=zh_TW)%>',
            '<%#include('+this.langFilePathMap['zh_TW']+')%>',
            '<%@else%>',
            '<%#include('+this.langFilePathMap['zh_CN']+')%>',
            '<%@endif%>\n'
        ];
        var jsI18nTpl = '<%#include('+this.jsI18nPath+')%>';
        content = langTpl.join('\n') + content.replace('</head>',jsI18nTpl+'</head>');
        file.setContent(content);
    },
    i18nHandler: function (ret) {
        var that = this,
            poFileList = [],
            htmlLikeFileList = [],
            js_i18nFile;

        //1. 解析国际化字符串
        _.map(ret.src, function(id, file) {
            if (file.isJsLike || file.isHtmlLike) {
                that.parse(file);
            }
            if(file.ext == ".po"){
                poFileList.push(file);
            }else if(file.isHtmlLike){
                htmlLikeFileList.push(file);
            }
        });
        //2. 保存PO文件
        poFileList.forEach(function (file) {
            that.setPoFile(file);
            that.setLangFile(file,ret.pkg);
        });
        //3. 保存js_i18n文件
        that.setJsTranslateFile(ret.pkg);
        //4. 保存lang文件
        htmlLikeFileList.forEach(function (file) {
            that.insertI18nFile(file);
        });
    }
};
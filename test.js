const fs = require('fs')
const iconv = require('iconv-lite')
const dir = './files'

/**
 * 读取目录文件
 */
fs.readdir(dir, (err, fileList) => {
    if (err) {
        console.log(err)
    } else {
        //遍历文件
        fileList.forEach(file => {
            //解码读取文本
            let text = iconv.decode(fs.readFileSync((dir + '/' + file), 'binary'), 'gbk')
            //修改文本
            let res = change(text, file)
            //新的文件夹
            if (!fs.existsSync('./news')) {
                fs.mkdirSync('./news')
            }
            //编码写入文本
            fs.writeFile(('./news/' + file), iconv.encode(res, 'gbk'), 'binary', (err) => {
                if (err)
                    console.log("fail " + err)
            })
        })
    }
})

/**
 * 修改文本内容
 */
function change(str, file) {
    //处理前的字段部分
    let field = str.split('<正文>=')[0] + '<正文>='
    //处理前的内容部分
    let content = str.split('<正文>=')[1]
    //处理后的内容
    let endField = '', endContent = ''
    //用于判断正题是否为空
    let isNull = false
    let isAut = false
    //处理内容部分
    let authors = [], picAuthors = []

    //处理字段部分(去除标题前后空格)
    let fieldList = field.split('\n')
    fieldList.forEach((item, index) => {
        //去除字段中的特殊符号
        if (/■|●|□/g.test(item)) {
            item = item.replace(/■|●|□/g, '').trim()
        }
        //去除<版名>=中的　(空格)
        if (item.indexOf('<版名>=') > -1 && item.indexOf('　') > -1) {
            item = item.replace('　','')
        }
        //判断正题是否为空
        if (item.indexOf('<正题>=') > -1 && item.split('>=')[1].length > 1) {
            isNull = true
        }
        //判断文章作者是否为空
        if (item.indexOf('<文章作者>=') > -1 && item.split('>=')[1].length > 1) {
            isAut = true
            // if(item.indexOf('、') > -1) {
            //     item = item.replace('、', '　')
            // }
            // if(item.indexOf('／文') > -1) {
            //     item = item.replace('／文', '')
            // }
            // if(item.indexOf('＼文') > -1) {
            //     item = item.replace('＼文', '')
            // }
            // if(item.indexOf('　著') > -1) {
            //     item = item.replace('　著', '')
            // }
            // if(item.indexOf('（') > -1) {
            //     item = item.substring(item.lastIndexOf('（')+1,item.length - 1)
            // }
        }

        //字段'='号后是否有内容
        if (item.split('>=')[1]) {
            //去除<***>=后的前后空格
            item = item.split('>=')[0] + '>=' + item.split('>=')[1].trim()
            //去除图片作者和图片说明后的'摄'字
            if (/<图片.+摄$/.test(item.trim())) {
                item = item.replace('摄', '').trim()
            }
        }
        //合并行
        if (fieldList.length - 1 !== index) {
            if (index === 0) {
                endField += item + '\n'
            } else {
                endField += item + '\r\n'
            }
        } else {
            endField += item
        }
    })

    let contentList = content.split('\n')
    contentList.forEach((item, index) => {
        //内容段首空格处理
        if (index !== 0 && (contentList.length - 1) !== index) {
            item = '　　' + item.trim()
        }
        //合并行
        if (contentList.length - 1 !== index) {
            if (index === 0 || item.length < 2) {
                endContent += item + '\n'
            } else {
                endContent += item + '\r\n'
            }
        } else {
            endContent += item
        }

        //添加文章作者
        if (hasAuthor(item, index, isNull, isAut, file) != '') {
            authors = authors.concat(hasAuthor(item, index, isNull, isAut, file))
        }
    })

    //最终输出的文本内容
    if (endContent.length < 8) {
        endContent = '\r\n' + '　　（参见版面）'
    }
    let res = endField + endContent
    //<正题>=图片新闻
    if (!isNull && res.indexOf('<img src=') > -1) {
        res = res.replace("<正题>=", "<正题>=图片新闻")
    }
    //<正题>=编辑
    if (!isNull) {
        if (res.indexOf('编辑：') > -1 || res.indexOf('责编：') > -1) {
            res = res.replace("<正题>=", "<正题>=编辑")
        }
    }
    //添加作者
    if(authors.length < 6) {
        res = res.replace("<文章作者>=", "<文章作者>=" + authors.join('　'))
    }

    //添加图片作者
    // res = res.replace("<图片作者>=", "<图片作者>=" + picAuthors.join('　'))
    // console.log(res)
    return res
}

/**
 * 查找作者
 */
function hasAuthor(lineStr, index, isNull, isAut, file) {
    let author = []
    
    //讯（讯　（电（电　（里的作者
    if (lineStr.trim().indexOf('讯（') > -1 || lineStr.trim().indexOf('讯　（') > -1 || lineStr.trim().indexOf('电（') > -1 || lineStr.trim().indexOf('电　（') > -1) {
        let aut = lineStr.trim().substring(lineStr.trim().indexOf('（') + 1, lineStr.trim().indexOf('）'))
        if (aut.indexOf('、') > -1) {
            aut = aut.replace('、', '　')
        }
        if (aut.indexOf('记者') > -1) {
            aut = aut.replace('记者　', '记者')
            aut = aut.replace('记者', '记者　')
        }
        author.push(aut)
    }
    //行尾的作者
    if(/[　]|／文|＼文/g.test(lineStr.trim())) {
        let aut = lineStr.trim().substring(lineStr.trim().lastIndexOf('。') + 1, lineStr.trim().length).trim()
        if(aut.length > 0 && !/\d{1,n}|[a-zA-Z]|？|”|：|:|，|《|％|＿|·|本报综合|据新华社|据新华社电|新华社　发|新华社发|新华社摄|综合消息|信息时报发|新华社／法新|新华社／路透|新华社供|　摄|／摄/i.test(aut) && !isAut){

            if(aut.indexOf('、') > -1) {
                aut = aut.replace('、', '　')
            }
            if(aut.indexOf('／文') > -1) {
                aut = aut.replace('／文', '')
            }
            if(aut.indexOf('＼文') > -1) {
                aut = aut.replace('＼文', '')
            }
            if(aut.indexOf('　著') > -1) {
                aut = aut.replace('　著', '')
            }
            if(aut.indexOf('（') > -1) {
                aut = aut.substring(aut.lastIndexOf('（')+1,aut.length - 1)
            }
            if(aut.length < 14) {
                author.push(aut)
            }
        }
    }

    return author
}

/**
 * 删除左右两端的空格
 */
String.prototype.trim = function () {
    return this.replace(/(^\s*)|(\s*$)/g, '')
}

/**
 * 测试输出文件
 */
function log(res) {
    //编码
    let str = iconv.encode(res, 'gbk')

    fs.appendFile(('./news/log.txt'), str, 'binary', (err) => {  
        if(err)  
            console.log("fail " + err) 
    })
}

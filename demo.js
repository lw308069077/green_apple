const fs = require('fs')
const iconv = require('iconv-lite')
const dir = './files'

//读取目录文件
fs.readdir(dir, (err, fileList) => {
    if (err) {
        console.log(err)
    } else {
        //遍历文件
        fileList.forEach(file => {
            //解码
            let text = fs.readFileSync((dir + '/' + file), 'binary')
            let str = iconv.decode(text, 'gbk')
            //修改文件内容
            let res = change(str, file)
            //写入新的文件夹
            if(!fs.existsSync('./news')) {
                fs.mkdirSync('./news')
            }
            //编码
            res = iconv.encode(res, 'gbk')
            fs.writeFile(('./news/' + file), res, 'binary', (err) => {  
                if(err)  
                    console.log("fail " + err) 
            })
        })
    }
})

//修改文本内容
function change(str, file) {
    //处理前的字段部分
    let field = str.split('<正文>=')[0] + '<正文>='
    //处理前的内容部分
    let content = str.split('<正文>=')[1]

    //处理后的内容
    let endField = '',endContent = ''
    //用于判断正题是否为空
    let isNull = false

    //处理字段部分(去除标题前后空格)
    let fieldList = field.split('\n')
    fieldList.forEach((item, index) => {
        //去除字段中的特殊符号
        item = item.replace('■','')
        item = item.replace('●','')
        item = item.replace('□','')

        //判断正题是否为空
        if (item.indexOf('<正题>=') > -1 && item.split('>=')[1].length > 1) {
            isNull = true
        }
        

        //字段'='号后是否有内容
        if (item.split('>=')[1]) {
            //去除<***>=后的前后空格
            item = item.split('>=')[0] + '>=' + item.split('>=')[1].trim()

            //有文章作者先清除
            // if (item.split('>=')[0].indexOf('文章作者') > -1) {
            //     item = '<文章作者>='
            // }

            //图片作者或者图片说明去除摄字
            if(item.split('>=')[0].indexOf('<图片') > -1 && item.split('>=')[1].indexOf('摄') > -1) {
                if(item.split('>=')[0].indexOf('<图片作者') > -1){
                    item = item.split('>=')[0] + '>=' + item.split('>=')[1].replace('摄','').trim()
                // console.log(item)
                }else if(item.split('>=')[0].indexOf('<图片说明') > -1){
                // console.log(file,item)
                }
            }
        }

        //合并行
        if(fieldList.length-1 !== index) {
            if(index === 0) {
                endField += item + '\n'    
            }else{
                endField += item + '\r\n'
            }
        }else{
            endField += item
        }
    })

    //处理内容部分
    let authors = []
    let contentList = content.split('\n')
    contentList.forEach((item, index) => {
        //内容段首空格处理
        if (item.length > 1) {
            item = '　　' + item.trim()
        }

        //本报讯后加空格
        // if (item.indexOf('本报讯') > -1) {
        //     item = item.replace('本报讯　', '本报讯')
        //     item = item.replace('本报讯', '本报讯　')
        // }
        
        //合并行
        if(contentList.length-1 !== index) {
            if(index === 0 || item.length < 2) {
                endContent += item + '\n'
            }else{
                endContent += item + '\r\n'
            }
        }else{
            endContent += item
        }

        //添加文章作者
        if(hasAuthor(item,index,isNull,file) != ''){
            authors = authors.concat(hasAuthor(item,index,isNull,file))
        }
    })

    //最终输出的文本内容
    if(endContent.length<6){
        endContent = '\r\n' + '　　（参见版面）'
        console.log(file+"================="+endContent.length+"===================")
    }
    let res = endField + endContent

    //<正题>=图片新闻
    if (!isNull && res.indexOf('<img src=') > -1) {
        res = res.replace("<正题>=", "<正题>=图片新闻")
    }

    //<正题>=编辑
    if(!isNull && res.indexOf('编辑：') > -1){
        res = res.replace("<正题>=", "<正题>=编辑")
    }

    //添加作者
    res = res.replace("<文章作者>=", "<文章作者>=" + authors.join('　'))
    // console.log(res)
    return res
}




//是否包含作者
function hasAuthor(lineStr, index, isNull, file) {
    let author = []
    // 检测首行是否是作者
    // if(index === 1 && isNull && !/[，|；|、|。|？|！|”|《|<|img|：|社论|据新华社|新华社|上接|（|）|\d]/.test(lineStr) && lineStr.length > 1){
    //     if(lineStr.indexOf('　') != -1 && lineStr.length < 10){
    //         lineStr = lineStr.replace('●','').trim()
    //         lineStr = lineStr.replace('□','').trim()
    //         author.push(lineStr)
    //     }
    // }

    //检测行尾带）内的是不是作者
    if (lineStr.trim().search(/）/g) > -1) {
        if (lineStr.trim().lastIndexOf('）') === lineStr.trim().length - 1) {
            let at = lineStr.trim().substring(lineStr.trim().lastIndexOf('（')+1,lineStr.trim().length - 1)
            if(!/\d|新华社发|新华社电|下转|上接|摘自|见图|传真|照片|未完|待续|供稿|仅供|，/.test(at) && at.length){
                author.push(at)
            }
        }
    }
    //检测。号结尾后是否还有内容，有的话是否是文章作者
    // if(lineStr.trim().lastIndexOf('。') !== -1){
    //     if(lineStr.trim().lastIndexOf('。') !== lineStr.trim().length - 1) {
    //         //。号后面的内容
    //         let lastText = lineStr.trim().substring(lineStr.trim().lastIndexOf('。')+1,lineStr.trim().length).trim()
    //         if(lastText.indexOf('　摄') == -1) {
    //             // console.log(file,lastText)
    //             if(lastText.indexOf('　') !== -1 || authorChecked(lastText))
    //             console.log(file,lastText,authorChecked(lastText))
    //         }

    //         // if(lastText.indexOf('（') !== -1) {
    //         //     // console.log('包含有括号的不用加入')
    //         // }else if(lastText.indexOf('摄') !== -1){
    //         //     // console.log('可能是图片作者')
    //         // }else{
    //         //     //内容是不是汉字
    //         //     if(/^[\\u4E00-\\u9FFF]{1,20}$/g.test(lastText))
    //         //         author.push(lastText)
    //         // }
    //     }
    // }
    return author
}

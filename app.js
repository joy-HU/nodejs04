const Koa = require('koa')
const Router = require('@koa/router')
const koaStaticCache = require('koa-static-cache')
const Nunjucks = require('nunjucks')
const KoaBody = require('koa-body')
const mysql = require('mysql2')
// nunjucks解析template里面的动态文件
// noCache: 不缓存
// watch: 监听文件变化
const app = new Koa()
const router = new Router()

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'hujinyin123456',
	database: 'kkb'
})
Nunjucks.configure('./template', {
	noCache: true,
	watch: true
})
// KoaBody配置在外面，router里面就不需要当中间件
app.use(KoaBody({
	multipart: true,
	formidable: {
	    // 解析后的文件数据存储的路径
	    uploadDir: './public/items/images',
	    // 是否保存上传后的文件扩展名
	    keepExtensions: true
		
	}
}))
// 解析静态路径的文件，css等文件
app.use(koaStaticCache('./public', {
	prefix: '/public',
	dynamic: true,
	gzip: true 
}))
// 商品界面 
router.get('/',getCategories, async ctx => {
	// 搜索items字条数，重命名为count
	let [{ count }] = await query('select count(*) as count from `items`')
	// 获取当前页面，默认为1
	let page = Number(ctx.query.page) || 1
	// 每一页显示4个
	let prepage = 4　　
	// 获取开始值
	let start = (page - 1) * 4
	// 获取页面数
	let pages = Math.ceil(count / prepage)
	let data = await query('select * from `items` limit ? offset ?',[
		prepage,
		start
	])
	ctx.body = Nunjucks.render('index.html',{
		categories: ctx.state.categories,
		page,
		pages,
		data
	})
})
router.get('/register', getCategories, ctx => {
	ctx.body = Nunjucks.render('register.html', {
		categories: ctx.state.categories
	})
})
router.post('/register',async ctx => {
	let { username, password, repassword } = ctx.request.body
	let res = await query('select * from `users` where username = ?',[
		username
	])
	if(!username){
		return ctx.body = '请输入有效字符串'
	}
	if(!password || !repassword){
		return ctx.body = '密码不能为空'
	}
	if(res.length){
		return ctx.body = '该用户名已存在，请重新注册'
	}
	if(password !== repassword){
		return ctx.body = '两次密码不一致，请重新输入'
	}
	await query('insert into `users` (`username`) values (?)',[
		username
	])
	ctx.body = '注册成功'
})
app.use(router.routes())
app.listen('8800', () => {
	console.log('服务器已启动')
})
function query(sql, data){
	return new Promise((res, rej) => {
		connection.query(sql, data, function (err, ...arg){
			if(err){
				rej(err)
			}{
				res(...arg)
			}
		})
	})
}
async function getCategories(ctx, next){
	ctx.state.categories = await query('select * from `categories`')
	// 执行完搜索语句在执行next
	await next()
}
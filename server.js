const express = require('express')
const app = express()

const {
    pool
} = require('./dbConfig')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const passport = require('passport')

const initializePassport = require('./passportConfig')


initializePassport(passport)

const PORT = process.env.PORT || 5052

app.use( express.static( "public" ) );


app.set('view engine', 'ejs')
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}))
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(flash())


app.get('/', (req, res) => {
    res.render("index")
})

app.get('/users/register', checkAutheticated, (req, res) => {
    res.render("register")
})

app.get('/users/login', checkAutheticated, (req, res) => {
    res.render("login")
})

app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: req.user.nome
    })
})

app.get('/users/logout', (req, res) => {
    req.logOut()
    req.flash('success_msg', "You have logged out")
    res.redirect('/users/login')
})

app.post('/users/register', async (req, res) => {
    let {
        cpf,
        nome,
        email,
        telefone,
        senha,
        senha2
    } = req.body

    console.log({
        cpf,
        nome,
        email,
        telefone,
        senha,
        senha2
    })

    let errors = []

    if (!cpf || !nome || !email || !telefone || !senha || !senha2) {
        errors.push({
            message: "Please enter all fields"
        })
    }

    if (senha.length < 6) {
        errors.push({
            message: "Password must be at least 6 characters"
        })
    }

    if (senha != senha2) {
        errors.push({
            message: "Passwords do not match"
        })
    }

    if (errors.length > 0) {
        res.render('register', {
            errors
        })
    } else {
        let hashedPassowrd = await bcrypt.hash(senha, 10)
        console.log(hashedPassowrd)


        pool.query(
            `SELECT * FROM consumidor
            WHERE email = $1`, [email], (err, results) => {
                if (err) {
                    throw err
                }

                console.log(results.rows)


                if (results.rows.length > 0) {
                    errors.push({
                        message: "Email aready registered"
                    })
                    res.render('register', {
                        errors
                    })
                } else {
                    pool.query(
                        `INSERT INTO consumidor (cpf, nome, email, telefone, senha)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING cpf, senha`, [cpf, nome, email, telefone, hashedPassowrd], (err, results) => {
                            if (err) {
                                throw err
                            }
                            console.log(results.rows)
                            req.flash('success_msg', "You are now registered. Please log in")
                            res.redirect('/users/login')
                        }
                    )
                }
            }
        )
    }
})

app.post('/users/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/users/login',
    failureFlash: ''
}))

function checkAutheticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/home')
    }
    next()
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/users/login')
}


// Rotas fabric


start()

// começa a conexão
async function start() {
    await connect()
}


// conecta com o banco
async function connect() {
    try {
        await pool.connect()
    } catch (e) {
        console.error(`Failed to connect ${e}`)
    }
}

async function criarPedido(reqJson) {
    try {
        await pool.query(
            "insert into pedido (pedido, descped, tipo_projet, concluido) values ($1, $2, $3, $4)",
            [
                reqJson.nomeProduto,
                reqJson.descProduto,
                reqJson.tipoProduto,
                false
            ])


        await pool.query("insert into cli_ped (cpf) values ($1)", [reqJson.cpf])
    } catch (ex) {
        console.log(`Something wrong happend ${ex}`)
    }
}


async function readTodos() {
    try {
        const results = await pool.query("select * from pedido");
        return results.rows;
    } catch (e) {
        return [];
    }
}


async function deleteTodo(codped) {
    try {
        await pool.query("delete from pedido where codped = $1", [codped]);
        return true
    } catch (e) {
        return false;
    }
}
// Rotas

// rotas do crud
app.get('/pedidos', async (req, res) => {
    const rows = await readTodos();
    res.setHeader("content-type", "application/json")
    res.send(JSON.stringify(rows))
})


app.post('/pedidos', async (req, res) => {
    let result = {}
    try {
        const reqJson = req.body
        console.log(reqJson)

        await criarPedido(reqJson)
        result.success = true
    } catch (e) {
        result.success = false
    } finally {
        res.setHeader("content-type", "application/json")
        res.send(JSON.stringify(result))
    }
})

app.delete('/pedidos', async (req, res) => {
    let result = {}
    try {
        const reqJson = req.body;
        await deleteTodo(reqJson.codped)
        result.success = true
    } catch (e) {
        result.success = false;
    } finally {
        res.setHeader("content-type", "application/json")
        res.send(JSON.stringify(result))
    }

})



/*
app.post('/funcionario/pedido', async (req, res, next) => {
    let result = 0
    res.setHeader("content-type", "application/json")


    let {
        id
    } = req.body

    const vitoria = await pool.query("select * from pedido where codped = $1", [1])

    
    vitoriarows = vitoria.rows

    

    result.success = true
    res.locals.titulo = vitoriarows;
    next()
})
*/

app.get('/dbConfig', (req, res) => {
    res.render(`${__dirname}/dbConfig.js`)
})

app.post('/funcionario/pedido', async (req, res, next) => {

    let result = 0
    res.setHeader("content-type", "application/json")



    let id = req.body.id
   let { concluido } = req.body

    if(req.body.concluido == true) {
        await pool.query("update pedido set concluido = true where codped = $1", [id])  
        console.log(concluido)  
    } else if (!req.body.concluido) {
        
    }

    const vitoria = await pool.query("select * from pedido where codped = $1", [id])


    vitoriarows = vitoria.rows

    result.success = true
    res.send(vitoriarows)
})

// Rotas de html



// rota da mainpage
app.get('/home', checkNotAuthenticated, (req, res) => {
    res.sendFile(`${__dirname}/client/index.html`)
})

// pagina de pedido                                                
app.get('/pedido', (req, res) => {
    res.sendFile(`${__dirname}/client/form.html`)
})


// rota da pagina ajuda
app.get('/ajuda', (req, res) => {
    res.sendFile(`${__dirname}/client/ajuda.html`)
})

// rota para pagina sobre
app.get('/sobre', (req, res) => {
    res.sendFile(`${__dirname}/client/sobre.html`)
})

// rota para funcionarios
app.get('/funcionario', (req, res) => {
    res.sendFile(`${__dirname}/server/index.html`)
})

app.get('/funcionario/pedido', (req, res, next) => {
    /*res.sendFile(`${__dirname}/views/pedido.ejs`)
    let values = req.query
    res.send(values)
    res.locals.func = async function readTodo(id) {
        const ped = await pool.query("select * from pedido where codped = $1", [id])
        
        console.table(ped.rows)
    }*/
    async function readTodo(id) {
        const ped = await pool.query("select * from pedido where codped = $1", [id])

        return ped.rows
    }


    res.render(__dirname + '/views' + '/pedido.ejs', {
        readTodo: readTodo,
        async: true
    })


})


app.get('/mostruario', (req, res) => {
    res.sendFile(`${__dirname}/client/mostruario.html`)
})

app.listen(PORT, () => console.log(`server running at localhost:${PORT}`))
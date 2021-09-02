const LocalStrategy = require("passport-local").Strategy
const {
    pool
} = require('./dbConfig')
const bcrypt = require("bcrypt")


function initialize(passport) {
    const authenticateUser = (email, senha, done) => {
        pool.query(
            `SELECT * FROM consumidor WHERE email = $1`, [email], (err, results) => {
                if (err) {
                    throw err
                }

                console.log(results.rows)

                if (results.rows.length > 0) {
                    const user = results.rows[0]

                    bcrypt.compare(senha, user.senha, (err, isMatch) => {
                        if (err) {
                            throw err
                        }

                        if (isMatch) {
                            return done(null, user)
                        } else {
                            return done(null, false, {
                                message: "Password is not correct"
                            })
                        }
                    })
                } else {
                    return done(null, false, {
                        message: "Email is not registered"
                    })
                }
            }
        )
    }

    passport.use(new LocalStrategy({
            usernameField: "email",
            passwordField: "password"
        },
        authenticateUser
    ))

    passport.serializeUser((user, done) => done(null, user.cpf))

    passport.deserializeUser((cpf, done) => {
        pool.query(
            `SELECT * FROM consumidor WHERE cpf = $1`, [cpf], (err, results) => {
                if (err) {
                    throw err
                }
                return done(null, results.rows[0])
            }
        )
    })
}

module.exports = initialize
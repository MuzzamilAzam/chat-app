const express = require('express')
const http = require('http')
const path = require('path')
const {generateMessage, generateLocationMessage} = require('./utils/message.js')
const {addUser, removeUser, getUser, getUsersInRoom}  = require('./utils/users')
const socketio = require('socket.io')
const Filter = require('bad-words')

const publicDirectoryPath = path.join(__dirname, '../public')
const port = 3000 || process.env.PORT

const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New Websocket connection')

    socket.on('join', (options, callback) => {
        const {error, user} = addUser({id: socket.id, ...options})

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        // console.log(getUsersInRoom(user.room))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        const filter = new Filter()
        
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, message))

        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        // console.log(location)
        // io.emit('message', `https://google.com/maps?q=${location.latitude},${location.longitude}`)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))

        callback()
    })
})

server.listen(port, () => {
    console.log('Server is running at port ' + port)

})
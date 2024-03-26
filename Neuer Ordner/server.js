const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser');
const initializePassport = require('./passport-config');
const { MongoClient, ObjectID } = require('mongodb');
app.use(bodyParser.urlencoded({ extended: true }));

const session = require('express-session');

app.use(session({
  secret: 'your secret key',
  resave: false,
  saveUninitialized: false
}));

const uri = "mongodb+srv://TestUser:123@cluster0.lluffwi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

let cardsCollection;
let client;
let usersCollection;

async function run() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db("yourDatabaseName");
    usersCollection = db.collection("users");
    cardsCollection = db.collection("cards");
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}
run().catch(console.dir);

// JSON data
const data = {"cards":[{"id":2,"sideone":"Default Side One","sidetwo":"Default Side Two"}]};

initializePassport(
    passport,
    username => usersCollection.findOne({ name: username })
);

app.set('view-engine', 'ejs')

app.set('views', path.join(__dirname, 'views'));

app.get('/login', (req, res) => { 
    res.render('login.ejs')
})

app.get('/', (req, res) => { 
    res.render('login.ejs')
})

app.get('/register', (req, res) => { 
    res.render('register.ejs')
})

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        console.log(hashedPassword)
        await usersCollection.insertOne({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
})

var currentCardIndex = 0;

app.get('/index', async function(req, res){
    try {
        const cards = await cardsCollection.find().toArray();
        res.render('index.ejs', {card: cards[currentCardIndex]});
    } catch (err) {
        console.error(err);
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(req.body)
    const user = await usersCollection.findOne({ name: username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        res.redirect('/index');
    } else {
        res.send('INCORRECT PASSWORD OR USERNAME');
    }
});

app.get('/next', async function(req, res){
    try {
        // Fetch the cards from the MongoDB collection
        const cards = await cardsCollection.find().toArray();
        currentCardIndex = (currentCardIndex + 1) % cards.length; 
        res.render('index.ejs', {card: cards[currentCardIndex]});
        console.log(currentCardIndex);
    } catch (err) {
        console.error(err);
    }
});


app.get('/edit', async function(req, res){
    try {
        // Fetch the cards from the MongoDB collection
        const cards = await cardsCollection.find().toArray();
        // Render the edit page with the existing cards
        res.render('edit.ejs', {cards: cards});
    } catch (err) {
        console.error(err);
    }
});

app.post('/add', async function(req, res){
    try {
        var newCard = {id: await cardsCollection.countDocuments() + 1, sideone: req.body.sideone, sidetwo: req.body.sidetwo};
        await cardsCollection.insertOne(newCard);
    } catch (err) {
        console.error(err);
    }
    res.redirect('/edit');
});

app.get('/edit/:id', async function(req, res){
    try {
        var id = parseInt(req.params.id); // Convert the id to a number
        // Fetch the card with the specified id from the MongoDB collection
        var card = await cardsCollection.findOne({ id: id });
        // Render the edit_card page with the existing card
        res.render('edit_card.ejs', {card: card, id: id});
    } catch (err) {
        console.error(err);
    }
});

app.post('/update/:id', async function(req, res){
    var id = parseInt(req.params.id); // Convert the id to a number
    var updatedCard = {sideone: req.body.sideone, sidetwo: req.body.sidetwo};
    try {
        await cardsCollection.updateOne({id: id}, {$set: updatedCard});
    } catch (err) {
        console.error(err);
    }
    res.redirect('/edit');
});


app.delete('/delete/:id', async function(req, res){
    var id = parseInt(req.params.id); 
    try {
        await cardsCollection.deleteOne({id: id});
    } catch (err) {
        console.error(err);
    }
    res.redirect('/edit');
});






app.listen(3000)
console.log('listening on port 3000')
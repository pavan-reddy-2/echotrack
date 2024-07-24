const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/echotrack', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    username: String,
    mailid: String,
    password: String
});

const User = mongoose.model('User', userSchema);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/echotrack' }),
    cookie: { secure: false }
}));

app.post('/signup', async (req, res) => {
    const { username, mailid, password } = req.body;
    try {
        const newUser = new User({ username, mailid, password });
        await newUser.save();
        res.status(201).send('User registered successfully');
    } catch (error) {
        res.status(500).send('Error registering user');
    }
});

app.post('/login', async (req, res) => {
    const { mailid, password } = req.body;
    try {
        const user = await User.findOne({ mailid, password });
        if (user) {
            req.session.userId = user._id; // Store user ID in session
            res.status(200).send('Login successful');
        } else {
            res.status(400).send('Invalid credentials');
        }
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});


const feedbackSchema = new mongoose.Schema({
    userId: String,
    rating: Number,
    comment: String,
    timestamp: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

app.post('/feedback', async (req, res) => {
    try {
        if (!req.session.userId) {
            console.log('User not authenticated');
            return res.status(403).send('User not authenticated');
        }

        console.log('Session UserID:', req.session.userId);
        console.log('Request Body:', req.body);

        const feedback = new Feedback({ ...req.body, userId: req.session.userId });
        await feedback.save();
        res.status(201).send(feedback);
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(400).send('Error saving feedback');
    }
});

app.get('/feedback', async (req, res) => {
    try {
        const feedbackList = await Feedback.find();
        res.status(200).send(feedbackList);
    } catch (error) {
        res.status(400).send(error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
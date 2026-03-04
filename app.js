const express = require('express');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const session = require('express-session');


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
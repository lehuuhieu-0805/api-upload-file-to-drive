const express = require('express');
const cors = require('cors');

const route = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// middleware parsing applicant/json to JSON
app.use(express.json());
// middleware parsing application/x-www-form-urlencoded to JSON
app.use(express.urlencoded({ extended: true }));

route(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
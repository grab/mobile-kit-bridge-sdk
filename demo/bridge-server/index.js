const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static('./public'));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(8000);

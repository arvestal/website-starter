const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', {
    metaDescription: 'Replace this with a real description before shipping.',
  });
});

module.exports = router;

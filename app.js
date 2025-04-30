const express = require('express');
const PORT = process.env.PORT || 3000;
require('dotenv').config();
const mongoose = require('mongoose');
require('./config/mongoose');
const app =  express();


// Server
app.listen(PORT, (err)=>{
    if(err){console.log(`Getting Error on Running Server ${err}`)}
    console.log(`Server running on http://localhost:${PORT}`);
})
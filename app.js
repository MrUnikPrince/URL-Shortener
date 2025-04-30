const express = require('express')
const PORT = 3000;
const app =  express();


// Server
app.listen(PORT, (err)=>{
    if(err){console.log(`Getting Error on Running Server ${err}`)}
    console.log(`Server running on http://localhost:${PORT}`);
})
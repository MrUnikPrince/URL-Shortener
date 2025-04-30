const express = require('express');
const router = express.Router();
const ShortUrl = require('../models/shortURL');
const shortId = require('shortid');
const validator = require('validator');
router.get('/docs', (req, res) => res.render('documentation')); 
/**
 * GET /
 * Main page showing all shortened URLs
 * Renders index.ejs template with list of URLs
 */
router.get('/', async (req, res) => {
  try {
    const shortUrls = await ShortUrl.find().sort({ createdAt: -1 });
    res.render('index', {
      shortUrls: shortUrls,
      error: req.query.error,
      baseUrl: `${req.protocol}://${req.headers.host}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('index', {
      error: 'Server Error',
      baseUrl: `${req.protocol}://${req.headers.host}`
    });
  }
});

/**
 * POST /shorten
   Creates new short URL
   Redirects back to home page
 */
router.post('/shorten', async (req, res) => {
  try {
    const { fullUrl, customCode, expiration } = req.body;
    
    // Validate URL format
    if (!validator.isURL(fullUrl, {
      protocols: ['http','https','ftp'],
      require_protocol: true, // Require http/https/ftp prefix
      allow_underscores: true,
      require_valid_protocol: true,
      disallow_auth: false
    })) {
      return res.redirect('/?error=Invalid URL format - must include http://, https:// or ftp://');
    }

    // Validate URL length
    if (fullUrl.length > 2000) {
      return res.redirect('/?error=URL exceeds maximum length of 2000 characters');
    }

    // Validate URL resolves to a working destination
     if (!await isUrlReachable(fullUrl)) {
      return res.redirect('/?error=URL does not appear to be reachable');
    }



    let shortCode;

    // Custom code validation
    if (customCode) {
      const processedCode = customCode.toUpperCase(); // Convert to uppercase
      
      const isValid = /^[A-Z0-9_-]{3,20}$/.test(processedCode); // Update regex
      if (!isValid) {
        return res.redirect('/?error=Invalid custom code format');
      }
      
      const exists = await ShortUrl.findOne({ short: processedCode });
      if (exists) {
        return res.redirect('/?error=Custom code already in use');
      }
      
      shortCode = processedCode;
    } else {
      // Convert generated ID to uppercase
      shortCode = shortId.generate().toUpperCase()
        .replace(/[^A-Z0-9_-]/g, ''); // Remove any non-uppercase characters
    }

    // Calculate expiration date
    let expiresAt;
    if (expiration) {
      const hours = parseInt(expiration);
      if (isNaN(hours) || hours < 0) {
        return res.redirect('/?error=Invalid expiration time');
      }
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    // Create URL with expiration
    await ShortUrl.create({
      full: fullUrl,
      short: shortCode,
      expiresAt: expiresAt || null
    });
    
    res.redirect('/');
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      return res.redirect('/?error=Custom code already exists');
    }
    console.error(error);
    res.status(500).send('Error creating short URL');
  }
});

/**
 * GET /:shortUrl
 * Redirects to original URL
   - Finds URL by short code
   - Increments click counter
   - Redirects to original URL
   Returns 404 if not found
 */
router.get('/:shortUrl', async (req, res) => {
  try {
    const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
    if (!shortUrl) return res.sendStatus(404);
    if (shortUrl.expiresAt && new Date() > shortUrl.expiresAt) {
      return res.status(410).send('This URL has expired');
    }

    shortUrl.clicks++;
    await shortUrl.save();
    
    res.redirect(shortUrl.full);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error redirecting');
  }
});

/**
   DELETE /:shortUrl
   Deletes a short URL
   - Finds URL by short code
   - Deletes from database
   Returns 404 if not found
 */
router.delete('/:shortUrl', async (req, res) => {
    try {
        const result = await ShortUrl.deleteOne({ short: req.params.shortUrl });
        
        if (result.deletedCount === 0) {
            return res.status(404).send('URL not found');
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).send('Error deleting URL');
    }
});

// Optional URL reachability checker
 async function isUrlReachable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
} 

module.exports = router;

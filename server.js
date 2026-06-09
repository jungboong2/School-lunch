const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for searching school info
app.get('/api/school', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'School name (name) is required.' });
    }

    const response = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
      params: {
        Type: 'json',
        SCHUL_NM: name,
        pIndex: 1,
        pSize: 20
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching school info:', error.message);
    res.status(500).json({ error: 'Failed to fetch school information from NEIS.' });
  }
});

// Proxy endpoint for school meals
app.get('/api/meal', async (req, res) => {
  try {
    const { officeCode, schoolCode, date } = req.query;
    
    if (!officeCode || !schoolCode || !date) {
      return res.status(400).json({ 
        error: 'Missing required parameters: officeCode, schoolCode, and date are required.' 
      });
    }

    const response = await axios.get('https://open.neis.go.kr/hub/mealServiceDietInfo', {
      params: {
        Type: 'json',
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        MLSV_YMD: date
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching meal info:', error.message);
    res.status(500).json({ error: 'Failed to fetch meal information from NEIS.' });
  }
});

// Serve the index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

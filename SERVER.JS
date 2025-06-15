const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Use API key from .env or fallback to default key
const API_KEY = process.env.OPENWEATHER_API_KEY || '322fc7ee0f4e42ef8e224b28d40038ca';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Current weather
app.get('/api/weather/current/:city', async (req, res) => {
  const { city } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric',
      }
    });

    const weatherData = {
      ...response.data,
      windSpeedKmh: Math.round(response.data.wind.speed * 3.6),
      visibilityKm: response.data.visibility ? (response.data.visibility / 1000).toFixed(1) : 'N/A'
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    const status = error.response?.status || 500;
    let message = 'Unexpected error occurred.';

    if (status === 404) message = 'City not found.';
    if (status === 401) message = 'Invalid API key.';
    if (status === 429) message = 'Too many requests. Try again later.';

    res.status(status).json({ error: message });
  }
});

// API: Forecast weather
app.get('/api/weather/forecast/:city', async (req, res) => {
  const { city } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric',
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Forecast API Error:', error.message);
    const status = error.response?.status || 500;
    let message = 'Could not get forecast data.';

    if (status === 404) message = 'City not found for forecast.';
    if (status === 401) message = 'Invalid API key.';
    if (status === 429) message = 'Rate limit exceeded. Try again later.';

    res.status(status).json({ error: message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Fallback: 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Weather Dashboard server running on http://localhost:${PORT}`);
});

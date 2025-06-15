class WeatherDashboard {
    constructor() {
        this.apiKey = '322fc7ee0f4e42ef8e224b28d40038ca';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadFavorites();
    }

    initializeElements() {
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.weatherDisplay = document.getElementById('weatherDisplay');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.favoritesList = document.getElementById('favoritesList');
        this.addToFavoritesBtn = document.getElementById('addToFavorites');
        
        // Weather elements
        this.cityName = document.getElementById('cityName');
        this.currentTemp = document.getElementById('currentTemp');
        this.weatherIcon = document.getElementById('weatherIcon');
        this.weatherDescription = document.getElementById('weatherDescription');
        this.feelsLike = document.getElementById('feelsLike');
        this.humidity = document.getElementById('humidity');
        this.windSpeed = document.getElementById('windSpeed');
        this.pressure = document.getElementById('pressure');
        this.visibility = document.getElementById('visibility');
        this.forecastContainer = document.getElementById('forecastContainer');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        this.addToFavoritesBtn.addEventListener('click', () => this.toggleFavorite());
    }

    async handleSearch() {
        const city = this.cityInput.value.trim();
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            const weatherData = await this.fetchCurrentWeather(city);
            const forecastData = await this.fetchForecastWeather(city);
            
            this.displayCurrentWeather(weatherData);
            this.displayForecast(forecastData);
            this.showWeatherDisplay();
            this.hideLoading();
            
            // Store current city data for favorites
            this.currentCityData = {
                name: weatherData.name,
                country: weatherData.sys.country
            };
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    async fetchCurrentWeather(city) {
        try {
            const response = await fetch(
                `${this.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('City not found. Please check the spelling and try again.');
                } else if (response.status === 401) {
                    throw new Error('API key is invalid. Please check your API configuration.');
                } else {
                    throw new Error('Failed to fetch weather data. Please try again later.');
                }
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    async fetchForecastWeather(city) {
        try {
            const response = await fetch(
                `${this.baseUrl}/forecast?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch forecast data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Forecast fetch error:', error);
            // Return null so current weather can still be displayed
            return null;
        }
    }

    displayCurrentWeather(data) {
        this.cityName.textContent = `${data.name}, ${data.sys.country}`;
        this.currentTemp.textContent = `${Math.round(data.main.temp)}°C`;
        this.weatherDescription.textContent = data.weather[0].description;
        this.feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
        this.humidity.textContent = `${data.main.humidity}%`;
        this.windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
        this.pressure.textContent = `${data.main.pressure} hPa`;
        this.visibility.textContent = data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A';
        
        // Weather icon
        const iconCode = data.weather[0].icon;
        this.weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        this.weatherIcon.alt = data.weather[0].description;
        
        // Update favorite button state
        this.updateFavoriteButton();
    }

    displayForecast(data) {
        if (!data) {
            this.forecastContainer.innerHTML = '<p>Forecast data unavailable</p>';
            return;
        }

        // Get forecast for next 5 days (one per day at 12:00)
        const dailyForecasts = this.processForecastData(data.list);
        
        this.forecastContainer.innerHTML = '';
        
        dailyForecasts.forEach(forecast => {
            const forecastCard = this.createForecastCard(forecast);
            this.forecastContainer.appendChild(forecastCard);
        });
    }

    processForecastData(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!dailyData[dateKey] || date.getHours() === 12) {
                dailyData[dateKey] = item;
            }
        });
        
        return Object.values(dailyData).slice(0, 5);
    }

    createForecastCard(forecast) {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        
        const date = new Date(forecast.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const iconCode = forecast.weather[0].icon;
        
        card.innerHTML = `
            <div class="day">${dayName}</div>
            <div class="forecast-icon">
                <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${forecast.weather[0].description}">
            </div>
            <div class="temps">
                <span class="high-temp">${Math.round(forecast.main.temp_max)}°</span>
                <span class="low-temp">${Math.round(forecast.main.temp_min)}°</span>
            </div>
            <div class="description">${forecast.weather[0].description}</div>
        `;
        
        return card;
    }

    toggleFavorite() {
        if (!this.currentCityData) return;
        
        const cityKey = `${this.currentCityData.name}, ${this.currentCityData.country}`;
        const index = this.favorites.findIndex(fav => fav.key === cityKey);
        
        if (index > -1) {
            // Remove from favorites
            this.favorites.splice(index, 1);
            this.addToFavoritesBtn.innerHTML = '<i class="far fa-heart"></i>';
            this.addToFavoritesBtn.classList.remove('active');
        } else {
            // Add to favorites
            this.favorites.push({
                key: cityKey,
                name: this.currentCityData.name,
                country: this.currentCityData.country
            });
            this.addToFavoritesBtn.innerHTML = '<i class="fas fa-heart"></i>';
            this.addToFavoritesBtn.classList.add('active');
        }
        
        this.saveFavorites();
        this.loadFavorites();
    }

    updateFavoriteButton() {
        if (!this.currentCityData) return;
        
        const cityKey = `${this.currentCityData.name}, ${this.currentCityData.country}`;
        const isFavorite = this.favorites.some(fav => fav.key === cityKey);
        
        if (isFavorite) {
            this.addToFavoritesBtn.innerHTML = '<i class="fas fa-heart"></i>';
            this.addToFavoritesBtn.classList.add('active');
        } else {
            this.addToFavoritesBtn.innerHTML = '<i class="far fa-heart"></i>';
            this.addToFavoritesBtn.classList.remove('active');
        }
    }

    loadFavorites() {
        this.favoritesList.innerHTML = '';
        
        if (this.favorites.length === 0) {
            this.favoritesList.innerHTML = '<p style="color: #666; font-style: italic;">No favorite cities yet. Search for a city and add it to favorites!</p>';
            return;
        }
        
        this.favorites.forEach((favorite, index) => {
            const favoriteElement = document.createElement('button');
            favoriteElement.className = 'favorite-item';
            favoriteElement.innerHTML = `
                ${favorite.name}
                <span class="remove-favorite" data-index="${index}">×</span>
            `;
            
            // Click to search for this city
            favoriteElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('remove-favorite')) {
                    this.cityInput.value = favorite.name;
                    this.handleSearch();
                }
            });
            
            // Remove favorite
            const removeBtn = favoriteElement.querySelector('.remove-favorite');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFavorite(index);
            });
            
            this.favoritesList.appendChild(favoriteElement);
        });
    }

    removeFavorite(index) {
        this.favorites.splice(index, 1);
        this.saveFavorites();
        this.loadFavorites();
        this.updateFavoriteButton();
    }

    saveFavorites() {
        localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites));
    }

    showLoading() {
        this.loadingSpinner.classList.remove('hidden');
        this.weatherDisplay.classList.add('hidden');
    }

    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
    }

    showWeatherDisplay() {
        this.weatherDisplay.classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('errorText').textContent = message;
        this.errorMessage.classList.remove('hidden');
        this.weatherDisplay.classList.add('hidden');
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }
}

// Initialize the weather dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});
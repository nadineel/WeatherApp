const API_KEY= "40fecc1f3c03733c8d7b40ce8beb0fe8"
// imports
const express = require('express')
const app = express()
const https=require("https");
const port =process.env.PORT||3000
const path = require("path");
const fetch= require('node-fetch')

let publicPath = path.resolve(__dirname, "public")
app.use(express.static(publicPath))

//https get requests
app.get('/weather/:city', getWeather)
app.get('/jokes', getJokes)

//called by the vue app
async function getWeather(req,res){
    let city=req.params.city
    let data= await parseWeather(city)
    data=res.json(data)
}

//inputs: latitude and longitude
//returns: json file on air pollution
//function is called by parseWeather to get pm2_5 values
async function checkPollution(lat,lon){
    var url=`http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    let response= await fetch(url)
    let airPollutionJSON=await response.json()
    return airPollutionJSON
}

//input: city
//output: json file
//function called by getWeather. Handles errors and parses openWeather json 
//  to extract certain attributes to one json file
async function parseWeather(city){
    const url=`https://api.openweathermap.org/data/2.5/forecast?q=${city}&APPID=${API_KEY}&units=metric`
    let response= await fetch(url).catch(err=>alert(err))
    let openWeatherJSON=await response.json()
    if(openWeatherJSON.cod==404){
        var parsedData={
            code:openWeatherJSON.cod
        }
        return parsedData
    }

    var parsedWeatherData={
        code: 200,
        city: openWeatherJSON.city.name,
        country: openWeatherJSON.city.country,
        country_icon:"flag-icon flag-icon-"+(openWeatherJSON.city.country).toLowerCase(),
        lat: openWeatherJSON.city.coord.lat,
        lon: openWeatherJSON.city.coord.lon,
        rain: false,
        cold: false,
        mild: false,
        hot: false,
        mask: false,
        list: []    
    }

    const pollutionJSON=await checkPollution(parsedWeatherData.lat, parsedWeatherData.lon)
    
    var weatherItem = openWeatherJSON.list[0];
    var pollutionItem = pollutionJSON.list[0];
    var dateItem=new Date(weatherItem.dt*1000).toDateString()
    
    var dayArray = [
        {
            date: dateItem,
            temp: weatherItem.main.temp,
            wind_speed: weatherItem.wind.speed,
            rain: 0.00,
            icon: weatherItem.weather.icon,
            pollution:pollutionItem.components.pm2_5
        }
    ];

    var dayIndex=0
    var timeIndex=0;
    var prevWeatherItemDate=dateItem
    for(var i=0; i<openWeatherJSON.list.length && dayIndex<5; i++){
        weatherItem=openWeatherJSON.list[i]
        pollutionItem=pollutionJSON.list[i]

        var currentWeatherItemDate=(new Date(weatherItem.dt*1000)).toDateString()
        if(prevWeatherItemDate==currentWeatherItemDate && i!=openWeatherJSON.list.length-1){
            timeIndex++;
        }
        else {
            var avg_temp = dayArray.reduce( ((acc,day) => acc+day.temp), 0)/dayArray.length;
            var avg_wind_speed = dayArray.reduce( ((acc,day) => acc+day.wind_speed), 0)/dayArray.length;
            var avg_rain = dayArray.reduce( ((acc,day) => acc+day.rain), 0)/dayArray.length;
            var weatherIcon= weatherItem.weather[0].icon;

            var isMask=false
            var avg_pollution = dayArray.reduce( ((acc,day) => acc+day.pollution), 0)/dayArray.length;
            if(avg_pollution>10){
                isMask=true
            }
            else{
                isMask=false
            }

            parsedWeatherData.list[dayIndex]={
                date: prevWeatherItemDate,
                temp: avg_temp.toFixed(2),
                wind_speed: avg_wind_speed.toFixed(2),
                rain: avg_rain.toFixed(2),
                icon: `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`,
                mask: isMask
            }

            dayIndex++;
            timeIndex = 0;
            dayArray = [];
        }
        dayArray[timeIndex] = {
            date: dateItem,
            temp: weatherItem.main.temp,
            wind_speed: weatherItem.wind.speed,
            rain: 0.00,
            icon:weatherItem.weather[0].icon,
            pollution: pollutionItem.components.pm2_5
        }
        
        //packing
        if (weatherItem.rain != null){
            dayArray[timeIndex].rain = weatherItem.rain['3h']
            parsedWeatherData.rain = true
        }
        
        if (weatherItem.main.temp < 12){
            parsedWeatherData.cold = true
        } else if (weatherItem.main.temp > 24){
            parsedWeatherData.hot = true
        } else {
            parsedWeatherData.mild = true
        }

        prevWeatherItemDate = currentWeatherItemDate;
    }

    return parsedWeatherData
}


//called by vue
//returns some jokes from a free Joke API
async function getJokes(req,res){
    var url="https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single&amount=10";
    const response= await fetch(url)
    const data=await response.json()
    var parsedJokes={
        error: data.error,
        amount: data.amount,
        joke:data.jokes[0].joke
    }
    let jokes=res.json(parsedJokes)
}


app.listen(port,()=>{
    console.log(`Server is running at port ${port}`)
})
const API_KEY= "40fecc1f3c03733c8d7b40ce8beb0fe8"

const express = require('express')
const app = express()
const https=require("https");
const port =process.env.PORT||3000
const path = require("path");
const fetch= require('node-fetch')

let publicPath = path.resolve(__dirname, "public")
app.use(express.static(publicPath))


app.get('/weather/:city', getWeather)
app.get('/jokes', getJokes)

async function getWeather(req,res){
    let city=req.params.city
    let data= await parseWeather(city)
    //res.send(data)
    data=res.json(data)
    //console.log(data)  
}

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
    //var allJokes=data.jokes.filter(x=>x.joke)
    
    //jokes=res.json(parsedJokes)
    
}

async function checkPollution(lat,lon){
    var url=`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    const response= await fetch(url)
    const airPollutionJSON=await response.json()
    return airPollutionJSON
}

async function parseWeather(city){
    var url=`https://api.openweathermap.org/data/2.5/forecast?q=${city}&APPID=${API_KEY}&units=metric`
    const response= await fetch(url)
    const openWeatherJSON=await response.json()

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
        pm2_5:0.0,
        list: []
        
    }

    var weatherItem = openWeatherJSON.list[0];
    var dateItem=new Date(weatherItem.dt*1000).toDateString()
    
    var dayArray = [
        {
            date: dateItem,
            temp: weatherItem.main.temp,
            wind_speed: weatherItem.wind.speed,
            rain: 0.00,
            icon: weatherItem.weather.icon
        }
    ];

    var pollution=await checkPollution(parsedWeatherData.lat, parsedWeatherData.lon)
    pm2_5=pollution.list[0].components.pm2_5
    if(pm2_5>10){
        parsedWeatherData.mask=true
        parsedWeatherData.pm2_5=pm2_5
    }

    var dayIndex=0
    var timeIndex=0;
    var prevWeatherItemDate=dateItem
    for(var i=0; i<openWeatherJSON.list.length && dayIndex<5; i++){
        weatherItem=openWeatherJSON.list[i]
        var currentWeatherItemDate=(new Date(weatherItem.dt*1000)).toDateString()
        if(prevWeatherItemDate==currentWeatherItemDate && i!=openWeatherJSON.list.length-1){
            timeIndex++;
        }
        else {
            var avg_temp = dayArray.reduce( ((acc,day) => acc+day.temp), 0)/dayArray.length;
            var avg_wind_speed = dayArray.reduce( ((acc,day) => acc+day.wind_speed), 0)/dayArray.length;
            var avg_rain = dayArray.reduce( ((acc,day) => acc+day.rain), 0)/dayArray.length;
            var weatherIcon= weatherItem.weather[0].icon;

            parsedWeatherData.list[dayIndex]={
                date: prevWeatherItemDate,
                temp: avg_temp.toFixed(2),
                wind_speed: avg_wind_speed.toFixed(2),
                rain: avg_rain.toFixed(2),
                icon: `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`
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
            icon:weatherItem.weather[0].icon
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


app.listen(port,()=>{
    console.log(`Server is running at port ${port}`)
})